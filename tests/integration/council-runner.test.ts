import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadAgentBundles } from "@agent-council/agents";
import { CouncilRunError, CouncilRunner, createRegistries } from "@agent-council/core";
import { CouncilRepository } from "@agent-council/database";
import {
  createDefaultMockProvider,
  createDefaultMockSteps,
  evaluateArtifact,
  loadEvalCase,
} from "@agent-council/evals";
import { MockProvider } from "@agent-council/providers";
import { canonicalRunArtifactSchema } from "@agent-council/shared";
import { afterEach, describe, expect, it } from "vitest";

const openRepositories: CouncilRepository[] = [];

function setup(provider = createDefaultMockProvider()) {
  const directory = mkdtempSync(join(tmpdir(), "agent-council-test-"));
  const repository = new CouncilRepository(join(directory, "test.db"));
  openRepositories.push(repository);
  const registries = createRegistries(loadAgentBundles(process.cwd()));
  const runner = new CouncilRunner({
    repository,
    provider,
    agents: registries.agents,
    prompts: registries.prompts,
    artifactDirectory: join(directory, "artifacts"),
  });
  return { directory, repository, runner, provider };
}

afterEach(() => {
  for (const repository of openRepositories.splice(0)) {
    repository.close();
  }
});

describe("Analyst to Falsifier vertical slice", () => {
  it("persists a complete lineage and replay artifact", async () => {
    const evalCase = loadEvalCase("data/eval-cases/slack-build-vs-buy.json");
    const { repository, runner, provider } = setup();
    const result = await runner.run(evalCase.scenario);

    expect(result.artifact.run.status).toBe("completed");
    expect(result.artifact.agentRuns).toHaveLength(3);
    expect(result.artifact.rebuttals.length).toBeGreaterThan(0);
    expect(result.artifact.revisions).toHaveLength(result.artifact.rebuttals.length);
    expect(result.artifact.claims.some((claim) => claim.parentClaimId !== null)).toBe(true);
    expect(repository.getRun(result.runId)?.status).toBe("completed");
    expect(existsSync(result.artifactPath)).toBe(true);
    expect(
      canonicalRunArtifactSchema.parse(
        JSON.parse(readFileSync(result.artifactPath, "utf8")) as unknown,
      ).run.id,
    ).toBe(result.runId);
    expect(evaluateArtifact(result.artifact, evalCase).passed).toBe(true);

    const requests = provider.requests;
    expect(requests).toHaveLength(3);
    expect(Object.keys(requests[0]?.input as object).sort()).toEqual(["mode", "scenario"]);
    expect(Object.keys(requests[1]?.input as object).sort()).toEqual(["claims", "mode", "scenario"]);
    expect(Object.keys(requests[2]?.input as object).sort()).toEqual(["mode", "pairs"]);
    expect(JSON.stringify(requests[1]?.input)).not.toContain("problemFrame");
    expect(requests[1]?.input).not.toHaveProperty("recommendation");
  });

  it("records the first schema failure before a successful retry", async () => {
    const evalCase = loadEvalCase("data/eval-cases/figma-missing-nodes.json");
    const provider = new MockProvider([
      { agentId: "analyst", output: { invalid: true } },
      ...createDefaultMockSteps(),
    ]);
    const { runner } = setup(provider);
    const result = await runner.run(evalCase.scenario);
    const analystRun = result.artifact.agentRuns[0];

    expect(analystRun?.status).toBe("succeeded");
    expect(analystRun?.attempts.map((attempt) => attempt.status)).toEqual(["failed", "succeeded"]);
    expect(result.artifact.traceEvents.some((event) => event.type === "agent.attempt_failed")).toBe(true);
  });

  it("stores raw failure and marks the Run failed after two invalid outputs", async () => {
    const evalCase = loadEvalCase("data/eval-cases/gsap-swiper-risk.json");
    const provider = new MockProvider([
      { agentId: "analyst", output: "not-json" },
      { agentId: "analyst", output: { still: "invalid" } },
    ]);
    const { repository, runner } = setup(provider);

    let runId = "";
    try {
      await runner.run(evalCase.scenario);
    } catch (error) {
      expect(error).toBeInstanceOf(CouncilRunError);
      runId = (error as CouncilRunError).runId;
    }
    expect(runId).not.toBe("");
    expect(repository.getRun(runId)?.status).toBe("failed");
    const agentRun = repository.getAgentRuns(runId)[0];
    expect(agentRun?.status).toBe("failed");
    expect(agentRun?.rawOutput).toContain("still");
    expect(agentRun?.attempts).toHaveLength(2);
  });

  it("records timeout without retrying", async () => {
    const evalCase = loadEvalCase("data/eval-cases/gsap-swiper-risk.json");
    const provider = new MockProvider([
      { agentId: "analyst", output: { unused: true }, delayMs: 50 },
    ]);
    const { repository, runner } = setup(provider);
    const scenario = {
      ...evalCase.scenario,
      budget: { ...evalCase.scenario.budget, timeoutMs: 5 },
    };
    let runId = "";
    try {
      await runner.run(scenario);
    } catch (error) {
      runId = (error as CouncilRunError).runId;
    }

    expect(repository.getAgentRuns(runId)[0]?.status).toBe("timed_out");
    expect(provider.requests).toHaveLength(1);
  });

  it("records cancellation before the first Round", async () => {
    const evalCase = loadEvalCase("data/eval-cases/slack-build-vs-buy.json");
    const { repository, runner } = setup();
    const controller = new AbortController();
    controller.abort();
    let runId = "";
    try {
      await runner.run(evalCase.scenario, controller.signal);
    } catch (error) {
      runId = (error as CouncilRunError).runId;
    }

    expect(repository.getRun(runId)?.status).toBe("cancelled");
    expect(repository.getAgentRuns(runId)).toHaveLength(0);
  });
});
