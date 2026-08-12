import { describe, expect, it } from "vitest";

import { buildAgentBoardModel } from "../../apps/web/src/agent-board-model";
import { buildPixelSceneModel } from "../../apps/web/src/pixel-scene-model";

import { makeWebFixtureArtifact } from "./fixture";

describe("pixel scene model", () => {
  it("turns executed agents and claim flow into a positioned scene", () => {
    const scene = buildPixelSceneModel(buildAgentBoardModel(makeWebFixtureArtifact()));

    expect(scene.agents.map((agent) => agent.id)).toEqual(["analyst", "falsifier"]);
    expect(scene.agents.find((agent) => agent.id === "analyst")?.position).toEqual({ x: 19, y: 54 });
    expect(scene.agents.find((agent) => agent.id === "falsifier")?.position).toEqual({ x: 81, y: 54 });
    expect(scene.agents.find((agent) => agent.id === "analyst")?.visualState).toBe("revising");
    expect(scene.agents.find((agent) => agent.id === "falsifier")?.visualState).toBe("challenging");
    expect(scene.objects.filter((object) => object.relatedRelationshipId).map((object) => object.kind)).toEqual(["claim", "rebuttal", "revision"]);
    expect(scene.relationships).toHaveLength(1);
    expect(scene.relationships[0]?.revision?.action).toBe("conditionalize");
  });

  it("keeps broken links as visible warning objects", () => {
    const artifact = makeWebFixtureArtifact();
    const brokenArtifact = {
      ...artifact,
      rebuttals: [
        ...artifact.rebuttals,
        { ...artifact.rebuttals[0]!, id: "rebuttal_missing_target", targetClaimId: "claim_missing" },
      ],
    };
    const scene = buildPixelSceneModel(buildAgentBoardModel(brokenArtifact));

    expect(scene.objects.some((object) => object.kind === "warning" && object.text.includes("Claim claim_missing"))).toBe(true);
  });
});
