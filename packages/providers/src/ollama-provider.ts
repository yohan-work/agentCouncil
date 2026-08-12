import {
  ProviderError,
  stableStringify,
} from "@agent-council/shared";
import type {
  GenerationRequest,
  GenerationResult,
  ModelProvider,
  ProviderHealth,
} from "@agent-council/shared";
import { z } from "zod";

import { generateStructured } from "./structured-generation";

const ollamaChatResponseSchema = z
  .object({
    model: z.string(),
    message: z.object({ content: z.string() }).passthrough(),
    done: z.boolean(),
    done_reason: z.string().optional(),
    total_duration: z.number().optional(),
    prompt_eval_count: z.number().int().nonnegative().optional(),
    eval_count: z.number().int().nonnegative().optional(),
  })
  .passthrough();

const ollamaTagsResponseSchema = z
  .object({
    models: z.array(
      z
        .object({
          name: z.string(),
          model: z.string().optional(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

export type OllamaProviderConfig = {
  baseUrl: string;
  model: string;
  keepAlive: string;
  contextTokens: number;
  outputTokens: number;
  temperature: number;
  healthTimeoutMs?: number;
};

async function parseErrorResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return await response.text();
  }
}

export class OllamaProvider implements ModelProvider {
  readonly name = "ollama";
  readonly model: string;
  private readonly config: OllamaProviderConfig;

  constructor(config: OllamaProviderConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl.replace(/\/+$/u, ""),
    };
    this.model = config.model;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startedAt = performance.now();
    const timeoutSignal = AbortSignal.timeout(this.config.healthTimeoutMs ?? 3_000);
    try {
      const versionResponse = await fetch(`${this.config.baseUrl}/api/version`, { signal: timeoutSignal });
      if (!versionResponse.ok) {
        return {
          ok: false,
          provider: this.name,
          model: this.model,
          latencyMs: performance.now() - startedAt,
          details: { status: versionResponse.status, error: await parseErrorResponse(versionResponse) },
        };
      }
      const version = (await versionResponse.json()) as unknown;
      const tagsResponse = await fetch(`${this.config.baseUrl}/api/tags`, { signal: timeoutSignal });
      if (!tagsResponse.ok) {
        return {
          ok: false,
          provider: this.name,
          model: this.model,
          latencyMs: performance.now() - startedAt,
          details: { version, status: tagsResponse.status, error: await parseErrorResponse(tagsResponse) },
        };
      }
      const tags = ollamaTagsResponseSchema.parse(await tagsResponse.json());
      const availableModels = tags.models.map((entry) => entry.name);
      const modelAvailable = tags.models.some(
        (entry) => entry.name === this.model || entry.model === this.model,
      );
      return {
        ok: modelAvailable,
        provider: this.name,
        model: this.model,
        latencyMs: performance.now() - startedAt,
        details: { version, modelAvailable, availableModels },
      };
    } catch (error) {
      return {
        ok: false,
        provider: this.name,
        model: this.model,
        latencyMs: performance.now() - startedAt,
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  async generate<T>(request: GenerationRequest<T>): Promise<GenerationResult<T>> {
    return generateStructured({
      request,
      transport: async (transportRequest, signal) => {
        const jsonSchema = z.toJSONSchema(transportRequest.outputSchema);
        const body = {
          model: this.model,
          messages: [
            { role: "system", content: transportRequest.systemPrompt },
            {
              role: "user",
              content: [
                "아래 입력만 사용해 작업하라.",
                "INPUT JSON:",
                stableStringify(transportRequest.input, 2),
                "OUTPUT JSON SCHEMA:",
                stableStringify(jsonSchema),
              ].join("\n"),
            },
          ],
          stream: false,
          think: false,
          format: jsonSchema,
          keep_alive: this.config.keepAlive,
          options: {
            temperature: transportRequest.agent.defaultModelConfig.temperature ?? this.config.temperature,
            num_ctx: Math.min(
              this.config.contextTokens,
              transportRequest.limits.maxInputTokens ?? this.config.contextTokens,
            ),
            num_predict: Math.min(this.config.outputTokens, transportRequest.limits.maxOutputTokens),
          },
        };

        const response = await fetch(`${this.config.baseUrl}/api/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
          signal,
        });
        if (!response.ok) {
          const details = await parseErrorResponse(response);
          throw new ProviderError({
            code: `ollama_http_${response.status}`,
            message: `Ollama returned HTTP ${response.status}.`,
            retryable: response.status === 408 || response.status === 429 || response.status >= 500,
            details,
          });
        }
        const parsed = ollamaChatResponseSchema.safeParse(await response.json());
        if (!parsed.success) {
          throw new ProviderError({
            code: "ollama_response_schema_error",
            message: "Ollama response did not match the expected transport schema.",
            retryable: true,
            details: parsed.error.issues,
          });
        }
        return {
          rawOutput: parsed.data.message.content,
          model: parsed.data.model,
          usage: {
            ...(parsed.data.prompt_eval_count === undefined
              ? {}
              : { inputTokens: parsed.data.prompt_eval_count }),
            ...(parsed.data.eval_count === undefined ? {} : { outputTokens: parsed.data.eval_count }),
            durationMs: (parsed.data.total_duration ?? 0) / 1_000_000,
            estimatedCost: 0,
          },
        };
      },
    });
  }
}
