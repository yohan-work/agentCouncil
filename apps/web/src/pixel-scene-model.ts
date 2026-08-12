import type { AgentBoardAgent, AgentBoardModel, AgentBoardRun, AgentRelationship } from "./agent-board-model";

export type AgentVisualState =
  | "idle"
  | "thinking"
  | "working"
  | "challenging"
  | "revising"
  | "succeeded"
  | "failed"
  | "not_started";

export type SceneAgentZone = "analyst-desk" | "falsifier-desk" | "additional";

export type SceneAgent = {
  id: string;
  displayName: string;
  role: string;
  icon: string;
  accent: AgentBoardAgent["metadata"]["accent"];
  position: { x: number; y: number };
  zone: SceneAgentZone;
  visualState: AgentVisualState;
  status: AgentBoardAgent["status"];
  summary: string;
  linkedRelationshipIds: string[];
  speech: string;
};

export type SceneObjectKind = "problem" | "claim" | "rebuttal" | "revision" | "warning";

export type SceneObject = {
  id: string;
  kind: SceneObjectKind;
  position: { x: number; y: number };
  title: string;
  text: string;
  emphasis: "normal" | "active" | "warning" | "completed";
  relatedAgentId?: string;
  relatedRelationshipId?: string;
};

export type SceneRelationship = {
  id: string;
  claimObjectId: string;
  rebuttalObjectId: string;
  revisionObjectId: string;
  claim: AgentRelationship["claim"];
  rebuttal: AgentRelationship["rebuttal"];
  revision: AgentRelationship["revision"];
  missingReferences: string[];
};

export type PixelSceneModel = {
  agents: SceneAgent[];
  objects: SceneObject[];
  relationships: SceneRelationship[];
};

const positions = {
  analyst: { x: 19, y: 54 },
  falsifier: { x: 81, y: 54 },
};

const additionalPositions = [
  { x: 30, y: 83 },
  { x: 50, y: 83 },
  { x: 70, y: 83 },
];

function latestRun(agent: AgentBoardAgent): AgentBoardRun | undefined {
  return agent.runs[agent.runs.length - 1];
}

function visualStateFor(agent: AgentBoardAgent): AgentVisualState {
  const latest = latestRun(agent);
  if (!latest) return "not_started";
  if (["failed", "timed_out", "cancelled"].includes(latest.status)) return "failed";
  if (latest.status === "running") return "working";
  if (latest.status === "pending") return "idle";
  if (latest.phase === "rebuttal") return "challenging";
  if (latest.phase === "revision") return "revising";
  if (latest.phase === "independent_analysis") return "thinking";
  return latest.status === "succeeded" ? "succeeded" : "idle";
}

function speechFor(agent: AgentBoardAgent, state: AgentVisualState): string {
  if (state === "failed") return agent.runs.find((run) => run.errorMessage)?.errorMessage ?? "실행 중 오류가 발생했습니다.";
  if (state === "challenging") return agent.rebuttals[0]?.strongestCounterargument ?? "주장을 반증할 조건을 찾고 있습니다.";
  if (state === "revising") return agent.revisions[0]?.rationale ?? "반박을 반영해 주장을 다시 쓰고 있습니다.";
  if (state === "thinking") return "문제를 Claim으로 구조화하고 있습니다.";
  if (state === "working") return "현재 실행 단계를 처리하고 있습니다.";
  if (state === "succeeded") return agent.summary;
  return "다음 실행을 기다리고 있습니다.";
}

function objectEmphasis(relationship: AgentRelationship, kind: SceneObjectKind): SceneObject["emphasis"] {
  if (relationship.missingReferences.length > 0) return "warning";
  if (kind === "revision" && relationship.revision) return "completed";
  if (kind === "rebuttal" && relationship.rebuttal) return relationship.rebuttal.severity === "high" ? "warning" : "active";
  if (kind === "claim" && relationship.claim?.status === "challenged") return "active";
  return "normal";
}

function relationshipText(relationship: AgentRelationship, kind: SceneObjectKind): { title: string; text: string } {
  if (kind === "claim") {
    return {
      title: relationship.claim?.id ?? "Claim 없음",
      text: relationship.claim?.text ?? "연결된 Claim을 찾을 수 없습니다.",
    };
  }
  if (kind === "rebuttal") {
    return {
      title: relationship.rebuttal ? `severity ${relationship.rebuttal.severity}` : "반박 없음",
      text: relationship.rebuttal?.strongestCounterargument ?? "아직 반박이 없습니다.",
    };
  }
  return {
    title: relationship.revision?.action ?? "수정 없음",
    text: relationship.revision?.after?.text ?? relationship.revision?.rationale ?? "반박 이후 수정이 없습니다.",
  };
}

export function buildPixelSceneModel(board: AgentBoardModel): PixelSceneModel {
  const analyst = board.agents.find((agent) => agent.id === "analyst");
  const falsifier = board.agents.find((agent) => agent.id === "falsifier");
  const additional = board.agents.filter((agent) => agent.id !== "analyst" && agent.id !== "falsifier");
  const orderedAgents = [
    ...(analyst ? [{ agent: analyst, position: positions.analyst, zone: "analyst-desk" as const }] : []),
    ...(falsifier ? [{ agent: falsifier, position: positions.falsifier, zone: "falsifier-desk" as const }] : []),
    ...additional.map((agent, index) => ({
      agent,
      position: additionalPositions[index % additionalPositions.length] ?? { x: 50, y: 84 },
      zone: "additional" as const,
    })),
  ];
  const sceneRelationships: SceneRelationship[] = board.relationships.map((relationship) => {
    const claimObjectId = `${relationship.id}:claim`;
    const rebuttalObjectId = `${relationship.id}:rebuttal`;
    const revisionObjectId = `${relationship.id}:revision`;
    return {
      id: relationship.id,
      claimObjectId,
      rebuttalObjectId,
      revisionObjectId,
      claim: relationship.claim,
      rebuttal: relationship.rebuttal,
      revision: relationship.revision,
      missingReferences: relationship.missingReferences,
    };
  });
  const linkedByAgent = new Map<string, string[]>();
  for (const relationship of sceneRelationships) {
    const ids = new Set<string>();
    if (relationship.claim?.authorAgentId) ids.add(relationship.claim.authorAgentId);
    if (relationship.rebuttal?.authorAgentId) ids.add(relationship.rebuttal.authorAgentId);
    if (relationship.revision?.authorAgentId) ids.add(relationship.revision.authorAgentId);
    for (const agentId of ids) {
      const existing = linkedByAgent.get(agentId) ?? [];
      existing.push(relationship.id);
      linkedByAgent.set(agentId, existing);
    }
  }
  const agents = orderedAgents.map(({ agent, position, zone }) => {
    const visualState = visualStateFor(agent);
    return {
      id: agent.id,
      displayName: agent.metadata.displayName,
      role: agent.metadata.role,
      icon: agent.metadata.icon,
      accent: agent.metadata.accent,
      position,
      zone,
      visualState,
      status: agent.status,
      summary: agent.summary,
      linkedRelationshipIds: linkedByAgent.get(agent.id) ?? [],
      speech: speechFor(agent, visualState),
    };
  });
  const objects: SceneObject[] = [
    {
      id: "problem",
      kind: "problem",
      position: { x: 50, y: 39 },
      title: board.problem.title,
      text: board.problem.problem,
      emphasis: "active",
    },
  ];
  for (const [index, relationship] of board.relationships.entries()) {
    const row = index % 3;
    const column = Math.floor(index / 3);
    const y = 67 + row * 9;
    const claim = relationshipText(relationship, "claim");
    const rebuttal = relationshipText(relationship, "rebuttal");
    const revision = relationshipText(relationship, "revision");
    objects.push(
      { id: `${relationship.id}:claim`, kind: "claim", position: { x: 37 + column * 4, y }, title: claim.title, text: claim.text, emphasis: objectEmphasis(relationship, "claim"), relatedAgentId: relationship.claim?.authorAgentId, relatedRelationshipId: relationship.id },
      { id: `${relationship.id}:rebuttal`, kind: "rebuttal", position: { x: 50 + column * 4, y }, title: rebuttal.title, text: rebuttal.text, emphasis: objectEmphasis(relationship, "rebuttal"), relatedAgentId: relationship.rebuttal?.authorAgentId, relatedRelationshipId: relationship.id },
      { id: `${relationship.id}:revision`, kind: "revision", position: { x: 63 + column * 4, y }, title: revision.title, text: revision.text, emphasis: objectEmphasis(relationship, "revision"), relatedAgentId: relationship.revision?.authorAgentId, relatedRelationshipId: relationship.id },
    );
    if (relationship.missingReferences.length > 0) {
      objects.push({ id: `${relationship.id}:warning`, kind: "warning", position: { x: 50 + column * 4, y: y - 5 }, title: "연결 확인 필요", text: relationship.missingReferences.join(", "), emphasis: "warning", relatedRelationshipId: relationship.id });
    }
  }
  return { agents, objects, relationships: sceneRelationships };
}
