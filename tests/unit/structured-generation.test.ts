import { analystDefinition } from "@agent-council/agents";
import { MockProvider } from "@agent-council/providers";
import {
  ProviderCancelledError,
  ProviderTimeoutError,
} from "@agent-council/shared";
import { z } from "zod";
import { describe, expect, it } from "vitest";

const outputSchema = z.object({ value: z.string() }).strict();

function request(signal = new AbortController().signal, timeoutMs = 1_000) {
  return {
    runId: "run_test",
    agent: analystDefinition,
    systemPrompt: "Return JSON.",
    input: { value: "input" },
    outputSchema,
    limits: {
      timeoutMs,
      maxRetries: 1 as const,
      maxInputTokens: 100,
      maxOutputTokens: 100,
    },
    signal,
  };
}

describe("structured generation", () => {
  it("returns validated output and usage", async () => {
    const provider = new MockProvider([{ output: { value: "ok" } }]);
    const result = await provider.generate(request());

    expect(result.data).toEqual({ value: "ok" });
    expect(result.attempts).toHaveLength(1);
    expect(result.usage.estimatedCost).toBe(0);
  });

  it("records a schema failure and retries once", async () => {
    const provider = new MockProvider([{ output: { wrong: true } }, { output: { value: "ok" } }]);
    const result = await provider.generate(request());

    expect(result.attempts.map((attempt) => attempt.status)).toEqual(["failed", "succeeded"]);
    expect(result.usage.inputTokens).toBe(20);
  });

  it("fails after the second invalid output", async () => {
    const provider = new MockProvider([{ output: "not-json" }, { output: { wrong: true } }]);
    await expect(provider.generate(request())).rejects.toMatchObject({
      code: "invalid_model_output",
      attempts: [{ status: "failed" }, { status: "failed" }],
    });
  });

  it("does not retry a timeout", async () => {
    const provider = new MockProvider([{ output: { value: "late" }, delayMs: 50 }]);
    await expect(provider.generate(request(new AbortController().signal, 5))).rejects.toBeInstanceOf(
      ProviderTimeoutError,
    );
    expect(provider.requests).toHaveLength(1);
  });

  it("does not start when already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    const provider = new MockProvider([{ output: { value: "unused" } }]);
    await expect(provider.generate(request(controller.signal))).rejects.toBeInstanceOf(
      ProviderCancelledError,
    );
    expect(provider.requests).toHaveLength(0);
  });
});
