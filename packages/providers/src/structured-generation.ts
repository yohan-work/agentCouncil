import {
  ProviderCancelledError,
  ProviderError,
  ProviderOutputError,
  ProviderTimeoutError,
  redactText,
  serializeError,
} from "@agent-council/shared";
import type {
  GenerationAttempt,
  GenerationRequest,
  GenerationResult,
  ProviderUsage,
} from "@agent-council/shared";

export type RawGeneration = {
  rawOutput: string;
  model: string;
  usage: ProviderUsage;
};

export type GenerationTransport = (
  request: GenerationRequest<unknown>,
  signal: AbortSignal,
) => Promise<RawGeneration>;

function aggregateUsage(attempts: GenerationAttempt[], durationMs: number): ProviderUsage {
  const usages = attempts.flatMap((attempt) => (attempt.usage ? [attempt.usage] : []));
  const inputTokens = usages.reduce((sum, usage) => sum + (usage.inputTokens ?? 0), 0);
  const outputTokens = usages.reduce((sum, usage) => sum + (usage.outputTokens ?? 0), 0);
  return {
    ...(usages.some((usage) => usage.inputTokens !== undefined) ? { inputTokens } : {}),
    ...(usages.some((usage) => usage.outputTokens !== undefined) ? { outputTokens } : {}),
    durationMs,
    estimatedCost: 0,
  };
}

function attachAttempts(error: ProviderError, attempts: GenerationAttempt[]): ProviderError {
  return new ProviderError({
    name: error.name,
    code: error.code,
    message: error.message,
    retryable: error.retryable,
    attempts,
    rawOutput: error.rawOutput,
    details: error.details,
    cause: error,
  });
}

export async function generateStructured<T>(options: {
  request: GenerationRequest<T>;
  transport: GenerationTransport;
}): Promise<GenerationResult<T>> {
  const { request, transport } = options;
  const startedAt = performance.now();
  const deadline = Date.now() + request.limits.timeoutMs;
  const attempts: GenerationAttempt[] = [];

  for (let attempt = 1; attempt <= request.limits.maxRetries + 1; attempt += 1) {
    if (request.signal.aborted) {
      throw new ProviderCancelledError("Generation was cancelled before the attempt started.", attempts);
    }

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      throw new ProviderTimeoutError("Generation exceeded the configured timeout.", attempts);
    }

    const timeoutSignal = AbortSignal.timeout(remainingMs);
    const combinedSignal = AbortSignal.any([request.signal, timeoutSignal]);

    let rawGeneration: RawGeneration;
    try {
      rawGeneration = await transport(request as GenerationRequest<unknown>, combinedSignal);
    } catch (error) {
      if (request.signal.aborted) {
        throw new ProviderCancelledError("Generation was cancelled.", attempts, error);
      }
      if (timeoutSignal.aborted) {
        throw new ProviderTimeoutError("Generation exceeded the configured timeout.", attempts, error);
      }

      const providerError =
        error instanceof ProviderError
          ? error
          : new ProviderError({
              code: "transport_error",
              message: error instanceof Error ? error.message : String(error),
              retryable: true,
              cause: error,
            });
      attempts.push({
        attempt,
        status: "failed",
        error: serializeError(providerError),
      });
      if (attempt <= request.limits.maxRetries && providerError.retryable) {
        continue;
      }
      throw attachAttempts(providerError, attempts);
    }

    const rawOutput = redactText(rawGeneration.rawOutput);
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawOutput);
    } catch (error) {
      const outputError = new ProviderOutputError({
        message: "Model output was not valid JSON.",
        attempts,
        rawOutput,
        details: { parseError: error instanceof Error ? error.message : String(error) },
        cause: error,
      });
      attempts.push({
        attempt,
        status: "failed",
        rawOutput,
        usage: rawGeneration.usage,
        error: serializeError(outputError),
      });
      if (attempt <= request.limits.maxRetries) {
        continue;
      }
      throw new ProviderOutputError({
        message: outputError.message,
        attempts,
        rawOutput,
        details: outputError.details,
        cause: outputError,
      });
    }

    const validation = request.outputSchema.safeParse(parsed);
    if (!validation.success) {
      const issues = validation.error.issues.map((issue) => ({
        code: issue.code,
        message: issue.message,
        path: issue.path,
      }));
      const outputError = new ProviderOutputError({
        message: "Model output did not match the required schema.",
        attempts,
        rawOutput,
        details: { issues },
      });
      attempts.push({
        attempt,
        status: "failed",
        rawOutput,
        usage: rawGeneration.usage,
        error: serializeError(outputError),
      });
      if (attempt <= request.limits.maxRetries) {
        continue;
      }
      throw new ProviderOutputError({
        message: outputError.message,
        attempts,
        rawOutput,
        details: outputError.details,
        cause: outputError,
      });
    }

    attempts.push({
      attempt,
      status: "succeeded",
      rawOutput,
      usage: rawGeneration.usage,
    });
    return {
      data: validation.data,
      rawOutput,
      model: rawGeneration.model,
      attempts,
      usage: aggregateUsage(attempts, performance.now() - startedAt),
    };
  }

  throw new ProviderError({
    code: "unreachable_generation_state",
    message: "Generation exhausted attempts without a terminal result.",
    retryable: false,
    attempts,
  });
}
