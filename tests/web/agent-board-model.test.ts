import { describe, expect, it } from "vitest";

import { buildAgentBoardModel } from "../../apps/web/src/agent-board-model";

import { makeWebFixtureArtifact } from "./fixture";

describe("agent board model", () => {
  it("groups Analyst phases and maps the claim relationship", () => {
    const model = buildAgentBoardModel(makeWebFixtureArtifact());
    const analyst = model.agents.find((agent) => agent.id === "analyst");
    const falsifier = model.agents.find((agent) => agent.id === "falsifier");

    expect(analyst?.runs.map((run) => run.phase)).toEqual(["independent_analysis", "revision"]);
    expect(analyst?.claims).toHaveLength(2);
    expect(falsifier?.rebuttals).toHaveLength(1);
    expect(model.relationships).toHaveLength(1);
    expect(model.relationships[0]?.rebuttal?.severity).toBe("high");
    expect(model.relationships[0]?.revision?.action).toBe("conditionalize");
    expect(model.outcome.actionCounts.conditionalize).toBe(1);
    expect(model.outcome.challengedCount).toBe(1);
    expect(model.outcome.claimCount).toBe(1);
  });

  it("keeps missing references visible instead of dropping records", () => {
    const artifact = makeWebFixtureArtifact();
    const brokenArtifact = {
      ...artifact,
      rebuttals: [
        ...artifact.rebuttals,
        { ...artifact.rebuttals[0]!, id: "rebuttal_missing_target", targetClaimId: "claim_missing" },
      ],
    };
    const model = buildAgentBoardModel(brokenArtifact);

    expect(model.warnings).toHaveLength(1);
    expect(model.relationships.some((relationship) => relationship.claim === null && relationship.missingReferences.includes("Claim claim_missing"))).toBe(true);
  });
});
