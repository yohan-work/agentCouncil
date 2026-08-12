import type {
  AgentRunRecord,
  CanonicalRunArtifact,
  RoundRecord,
} from "@agent-council/shared/browser";

export type RunSummary = {
  runId: string;
  scenarioId: string;
  title: string;
  status: CanonicalRunArtifact["run"]["status"];
  provider: string;
  model: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  claims: number;
  rebuttals: number;
  revisions: number;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
};

export type TimelineItem = {
  round: RoundRecord;
  agentRuns: AgentRunRecord[];
};

export const roundLabels: Record<RoundRecord["kind"], string> = {
  input_normalization: "Input normalization",
  independent_analysis: "Independent analysis",
  claim_normalization: "Claim normalization",
  rebuttal: "Rebuttal",
  revision: "Revision",
};

export function buildTimeline(artifact: CanonicalRunArtifact): TimelineItem[] {
  const agentRunsByRound = new Map<string, AgentRunRecord[]>();
  for (const agentRun of artifact.agentRuns) {
    const runs = agentRunsByRound.get(agentRun.roundId) ?? [];
    runs.push(agentRun);
    agentRunsByRound.set(agentRun.roundId, runs);
  }

  return [...artifact.rounds]
    .sort((left, right) => left.index - right.index)
    .map((round) => ({ round, agentRuns: agentRunsByRound.get(round.id) ?? [] }));
}

export function formatDuration(durationMs: number): string {
  if (durationMs < 1_000) {
    return `${Math.round(durationMs)} ms`;
  }
  return `${(durationMs / 1_000).toFixed(1)} s`;
}

export function formatTokens(inputTokens: number, outputTokens: number): string {
  return `${inputTokens.toLocaleString()} in · ${outputTokens.toLocaleString()} out`;
}

export function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) {
    return "—";
  }
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function statusLabel(status: string): string {
  return status.replaceAll("_", " ");
}

export function statusTone(status: string): string {
  if (status === "completed" || status === "succeeded") {
    return "success";
  }
  if (status === "failed" || status === "timed_out") {
    return "danger";
  }
  if (status === "cancelled") {
    return "warning";
  }
  if (status === "challenged" || status === "revised") {
    return "accent";
  }
  return "neutral";
}
