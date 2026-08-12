import {
  ProviderError,
  stableStringify,
} from "@agent-council/shared";
import type {
  GenerationRequest,
  GenerationResult,
  ModelProvider,
  ProviderHealth,
  ProviderUsage,
} from "@agent-council/shared";

import { generateStructured } from "./structured-generation";

export type MockOutputFactory = (request: GenerationRequest<unknown>) => unknown | Promise<unknown>;

export type MockStep = {
  agentId?: string;
  output?: unknown | MockOutputFactory;
  error?: Error;
  delayMs?: number;
  usage?: Partial<ProviderUsage>;
};

function waitFor(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason instanceof Error ? signal.reason : new Error("Mock generation aborted."));
    };
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
  });
}

export class MockProvider implements ModelProvider {
  readonly name = "mock";
  readonly model: string;
  readonly requests: GenerationRequest<unknown>[] = [];
  private readonly steps: MockStep[];
  private readonly healthy: boolean;

  constructor(steps: MockStep[], options: { model?: string; healthy?: boolean } = {}) {
    this.steps = [...steps];
    this.model = options.model ?? "mock-model";
    this.healthy = options.healthy ?? true;
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      ok: this.healthy,
      provider: this.name,
      model: this.model,
      latencyMs: 0,
      details: { queuedSteps: this.steps.length },
    };
  }

  async generate<T>(request: GenerationRequest<T>): Promise<GenerationResult<T>> {
    return generateStructured({
      request,
      transport: async (transportRequest, signal) => {
        this.requests.push(transportRequest);
        const step = this.steps.shift();
        if (!step) {
          throw new ProviderError({
            code: "mock_script_exhausted",
            message: `No mock step remains for ${transportRequest.agent.id}.`,
            retryable: false,
          });
        }
        if (step.agentId && step.agentId !== transportRequest.agent.id) {
          throw new ProviderError({
            code: "mock_agent_mismatch",
            message: `Expected ${step.agentId}, received ${transportRequest.agent.id}.`,
            retryable: false,
          });
        }
        await waitFor(step.delayMs ?? 0, signal);
        if (step.error) {
          throw step.error;
        }
        const resolvedOutput =
          typeof step.output === "function" ? await step.output(transportRequest) : step.output;
        const rawOutput = typeof resolvedOutput === "string" ? resolvedOutput : stableStringify(resolvedOutput);
        return {
          rawOutput,
          model: this.model,
          usage: {
            inputTokens: step.usage?.inputTokens ?? 10,
            outputTokens: step.usage?.outputTokens ?? 20,
            durationMs: step.usage?.durationMs ?? step.delayMs ?? 0,
            estimatedCost: 0,
          },
        };
      },
    });
  }
}
