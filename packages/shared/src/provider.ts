import type { z } from "zod";

import type {
  AgentDefinition,
  GenerationAttempt,
  ProviderUsage,
  RunLimits,
  SerializedError,
} from "./domain";

export type GenerationRequest<T> = {
  runId: string;
  agent: AgentDefinition;
  systemPrompt: string;
  input: unknown;
  outputSchema: z.ZodType<T>;
  limits: RunLimits;
  signal: AbortSignal;
};

export type GenerationResult<T> = {
  data: T;
  rawOutput: string;
  model: string;
  attempts: GenerationAttempt[];
  usage: ProviderUsage;
};

export type ProviderHealth = {
  ok: boolean;
  provider: string;
  model: string;
  latencyMs: number;
  details: Record<string, unknown>;
};

export interface ModelProvider {
  readonly name: string;
  readonly model: string;
  healthCheck(): Promise<ProviderHealth>;
  generate<T>(request: GenerationRequest<T>): Promise<GenerationResult<T>>;
}

export class ProviderError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly attempts: GenerationAttempt[];
  readonly rawOutput: string | undefined;
  readonly details: unknown;

  constructor(options: {
    name?: string;
    code: string;
    message: string;
    retryable: boolean;
    attempts?: GenerationAttempt[];
    rawOutput?: string;
    details?: unknown;
    cause?: unknown;
  }) {
    super(options.message, { cause: options.cause });
    this.name = options.name ?? "ProviderError";
    this.code = options.code;
    this.retryable = options.retryable;
    this.attempts = options.attempts ?? [];
    this.rawOutput = options.rawOutput;
    this.details = options.details;
  }
}

export class ProviderTimeoutError extends ProviderError {
  constructor(message: string, attempts: GenerationAttempt[] = [], cause?: unknown) {
    super({
      name: "ProviderTimeoutError",
      code: "provider_timeout",
      message,
      retryable: false,
      attempts,
      cause,
    });
  }
}

export class ProviderCancelledError extends ProviderError {
  constructor(message: string, attempts: GenerationAttempt[] = [], cause?: unknown) {
    super({
      name: "ProviderCancelledError",
      code: "provider_cancelled",
      message,
      retryable: false,
      attempts,
      cause,
    });
  }
}

export class ProviderOutputError extends ProviderError {
  constructor(options: {
    message: string;
    attempts: GenerationAttempt[];
    rawOutput?: string;
    details?: unknown;
    cause?: unknown;
  }) {
    super({
      name: "ProviderOutputError",
      code: "invalid_model_output",
      message: options.message,
      retryable: true,
      attempts: options.attempts,
      rawOutput: options.rawOutput,
      details: options.details,
      cause: options.cause,
    });
  }
}

export function serializeError(error: unknown): SerializedError {
  if (error instanceof ProviderError) {
    return {
      name: error.name,
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      ...(error.details === undefined ? {} : { details: error.details }),
    };
  }
  if (error instanceof Error) {
    return {
      name: error.name || "Error",
      code: "unexpected_error",
      message: error.message || "Unexpected error",
      retryable: false,
    };
  }
  return {
    name: "UnknownError",
    code: "unexpected_error",
    message: String(error),
    retryable: false,
  };
}
