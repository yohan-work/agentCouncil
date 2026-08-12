import type {
  AgentRunRecord,
  CanonicalRunArtifact,
  Claim,
  Rebuttal,
  Revision,
  RoundRecord,
} from "@agent-council/shared/browser";

import { getAgentMetadata, type AgentMetadata } from "./agent-metadata";

export type AgentBoardRun = {
  id: string;
  roundId: string;
  phase: RoundRecord["kind"] | "unknown";
  phaseLabel: string;
  status: AgentRunRecord["status"];
  attempts: number;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  validatedOutput: unknown;
  rawOutput: string | null;
  errorMessage: string | null;
};

export type AgentBoardAgent = {
  id: string;
  metadata: AgentMetadata;
  status: AgentRunRecord["status"] | "not_started";
  runs: AgentBoardRun[];
  claims: Claim[];
  rebuttals: Rebuttal[];
  revisions: Revision[];
  summary: string;
};

export type AgentRelationship = {
  id: string;
  claim: Claim | null;
  rebuttal: Rebuttal | null;
  revision: Revision | null;
  missingReferences: string[];
};

export type AgentBoardModel = {
  problem: CanonicalRunArtifact["run"]["scenario"];
  agents: AgentBoardAgent[];
  relationships: AgentRelationship[];
  outcome: {
    claimCount: number;
    challengedCount: number;
    revisedCount: number;
    actionCounts: Record<Revision["action"], number>;
    finalActionSummary: string;
  };
  warnings: string[];
};

const phaseLabels: Record<RoundRecord["kind"], string> = {
  input_normalization: "입력 정규화",
  independent_analysis: "독립 분석",
  claim_normalization: "Claim 정규화",
  rebuttal: "반증",
  revision: "수정",
};

const actionLabels: Record<Revision["action"], string> = {
  maintain: "유지",
  narrow: "범위 축소",
  conditionalize: "조건부화",
  withdraw: "철회",
};

const statusPriority: AgentRunRecord["status"][] = [
  "failed",
  "timed_out",
  "cancelled",
  "running",
  "pending",
  "succeeded",
];

function aggregateAgentStatus(runs: AgentRunRecord[]): AgentBoardAgent["status"] {
  if (runs.length === 0) {
    return "not_started";
  }
  return statusPriority.find((status) => runs.some((run) => run.status === status)) ?? "pending";
}

function roundForRun(roundsById: Map<string, RoundRecord>, agentRun: AgentRunRecord): RoundRecord | undefined {
  return roundsById.get(agentRun.roundId);
}

function toBoardRun(roundsById: Map<string, RoundRecord>, agentRun: AgentRunRecord): AgentBoardRun {
  const round = roundForRun(roundsById, agentRun);
  return {
    id: agentRun.id,
    roundId: agentRun.roundId,
    phase: round?.kind ?? "unknown",
    phaseLabel: round ? phaseLabels[round.kind] : "알 수 없는 단계",
    status: agentRun.status,
    attempts: agentRun.attempts.length,
    durationMs: agentRun.usage?.durationMs ?? 0,
    inputTokens: agentRun.usage?.inputTokens ?? 0,
    outputTokens: agentRun.usage?.outputTokens ?? 0,
    validatedOutput: agentRun.validatedOutput,
    rawOutput: agentRun.rawOutput,
    errorMessage: agentRun.error?.message ?? null,
  };
}

function agentSummary(agentId: string, claims: Claim[], rebuttals: Rebuttal[], revisions: Revision[]): string {
  const baseClaims = claims.filter((claim) => claim.parentClaimId === null).length;
  if (agentId === "analyst") {
    if (revisions.length > 0) {
      return `${baseClaims}개 기본 Claim을 구조화하고 ${revisions.length}개를 반박 이후 수정했습니다.`;
    }
    return `${baseClaims}개 기본 Claim으로 문제를 구조화했습니다.`;
  }
  if (agentId === "falsifier") {
    const highSeverity = rebuttals.filter((rebuttal) => rebuttal.severity === "high").length;
    return `${rebuttals.length}개 Claim을 공격하고 high 위험 ${highSeverity}개를 제시했습니다.`;
  }
  return `Claim ${claims.length}개 · 반박 ${rebuttals.length}개 · 수정 ${revisions.length}개 기록을 남겼습니다.`;
}

function relationshipForClaim(
  claim: Claim,
  rebuttals: Rebuttal[],
  revisions: Revision[],
): AgentRelationship[] {
  const claimRebuttals = rebuttals.filter((rebuttal) => rebuttal.targetClaimId === claim.id);
  const claimRevisions = revisions.filter((revision) => revision.claimId === claim.id);

  if (claimRebuttals.length === 0 && claimRevisions.length === 0) {
    return [{ id: `${claim.id}:unlinked`, claim, rebuttal: null, revision: null, missingReferences: [] }];
  }

  const relationships: AgentRelationship[] = [];
  for (const rebuttal of claimRebuttals) {
    const linkedRevisions = claimRevisions.filter((revision) => revision.rebuttalId === rebuttal.id);
    if (linkedRevisions.length === 0) {
      relationships.push({ id: `${claim.id}:${rebuttal.id}`, claim, rebuttal, revision: null, missingReferences: [] });
      continue;
    }
    for (const revision of linkedRevisions) {
      relationships.push({ id: `${claim.id}:${rebuttal.id}:${revision.id}`, claim, rebuttal, revision, missingReferences: [] });
    }
  }

  for (const revision of claimRevisions.filter((item) => !claimRebuttals.some((rebuttal) => rebuttal.id === item.rebuttalId))) {
    relationships.push({
      id: `${claim.id}:${revision.id}`,
      claim,
      rebuttal: null,
      revision,
      missingReferences: [`반박 ${revision.rebuttalId}`],
    });
  }
  return relationships;
}

function buildRelationships(artifact: CanonicalRunArtifact): { relationships: AgentRelationship[]; warnings: string[] } {
  const claimById = new Map(artifact.claims.map((claim) => [claim.id, claim]));
  const rebuttalById = new Map(artifact.rebuttals.map((rebuttal) => [rebuttal.id, rebuttal]));
  const rootClaims = artifact.claims.filter((claim) => claim.parentClaimId === null);
  const relationships = rootClaims.flatMap((claim) => relationshipForClaim(claim, artifact.rebuttals, artifact.revisions));
  const warnings: string[] = [];

  for (const rebuttal of artifact.rebuttals) {
    if (claimById.has(rebuttal.targetClaimId)) {
      continue;
    }
    const missing = `Claim ${rebuttal.targetClaimId}`;
    warnings.push(`반박 ${rebuttal.id}가 없는 Claim을 가리킵니다.`);
    relationships.push({ id: `${rebuttal.id}:missing-claim`, claim: null, rebuttal, revision: null, missingReferences: [missing] });
  }

  for (const revision of artifact.revisions) {
    const claim = claimById.get(revision.claimId);
    const rebuttal = rebuttalById.get(revision.rebuttalId);
    if (!claim || !rebuttal) {
      const missingReferences = [
        ...(!claim ? [`Claim ${revision.claimId}`] : []),
        ...(!rebuttal ? [`반박 ${revision.rebuttalId}`] : []),
      ];
      warnings.push(`수정 ${revision.id}의 연결 대상이 누락되었습니다.`);
      relationships.push({ id: `${revision.id}:missing-reference`, claim: claim ?? null, rebuttal: rebuttal ?? null, revision, missingReferences });
    }
  }

  return { relationships, warnings };
}

export function buildAgentBoardModel(artifact: CanonicalRunArtifact): AgentBoardModel {
  const roundsById = new Map(artifact.rounds.map((round) => [round.id, round]));
  const agentIds = new Set<string>([
    ...artifact.agentRuns.map((agentRun) => agentRun.agentId),
    ...artifact.claims.map((claim) => claim.authorAgentId),
    ...artifact.rebuttals.map((rebuttal) => rebuttal.authorAgentId),
    ...artifact.revisions.map((revision) => revision.authorAgentId),
  ]);
  const orderedAgentIds = [...agentIds].sort((left, right) => {
    const knownOrder = ["analyst", "falsifier"];
    const leftIndex = knownOrder.indexOf(left);
    const rightIndex = knownOrder.indexOf(right);
    if (leftIndex !== -1 || rightIndex !== -1) {
      return (leftIndex === -1 ? knownOrder.length : leftIndex) - (rightIndex === -1 ? knownOrder.length : rightIndex);
    }
    return left.localeCompare(right);
  });

  const agents = orderedAgentIds.map((agentId): AgentBoardAgent => {
    const agentRuns = artifact.agentRuns
      .filter((agentRun) => agentRun.agentId === agentId)
      .sort((left, right) => (roundsById.get(left.roundId)?.index ?? Number.MAX_SAFE_INTEGER) - (roundsById.get(right.roundId)?.index ?? Number.MAX_SAFE_INTEGER));
    const claims = artifact.claims.filter((claim) => claim.authorAgentId === agentId);
    const rebuttals = artifact.rebuttals.filter((rebuttal) => rebuttal.authorAgentId === agentId);
    const revisions = artifact.revisions.filter((revision) => revision.authorAgentId === agentId);
    return {
      id: agentId,
      metadata: getAgentMetadata(agentId),
      status: aggregateAgentStatus(agentRuns),
      runs: agentRuns.map((agentRun) => toBoardRun(roundsById, agentRun)),
      claims,
      rebuttals,
      revisions,
      summary: agentSummary(agentId, claims, rebuttals, revisions),
    };
  });

  const { relationships, warnings } = buildRelationships(artifact);
  const baseClaims = artifact.claims.filter((claim) => claim.parentClaimId === null);
  const actionCounts: Record<Revision["action"], number> = {
    maintain: 0,
    narrow: 0,
    conditionalize: 0,
    withdraw: 0,
  };
  for (const revision of artifact.revisions) {
    actionCounts[revision.action] += 1;
  }
  const actionSummary = (Object.entries(actionCounts) as [Revision["action"], number][])
    .filter(([, count]) => count > 0)
    .map(([action, count]) => `${actionLabels[action]} ${count}`)
    .join(" · ");

  return {
    problem: artifact.run.scenario,
    agents,
    relationships,
    outcome: {
      claimCount: baseClaims.length,
      challengedCount: new Set(artifact.rebuttals.map((rebuttal) => rebuttal.targetClaimId)).size,
      revisedCount: artifact.revisions.length,
      actionCounts,
      finalActionSummary: actionSummary || "아직 반박 이후 수정이 없습니다.",
    },
    warnings,
  };
}
