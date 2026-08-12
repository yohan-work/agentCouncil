import { canonicalRunArtifactSchema, type CanonicalRunArtifact } from "@agent-council/shared/browser";

import type { RunSummary } from "./types";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  const payload = (await response.json()) as unknown;
  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "error" in payload
        ? String(payload.error)
        : `Request failed with HTTP ${response.status}.`;
    throw new Error(message);
  }
  return payload as T;
}

export async function loadRunSummaries(): Promise<RunSummary[]> {
  const payload = await getJson<{ runs: RunSummary[] }>("/api/runs");
  return payload.runs;
}

export async function loadRunArtifact(runId: string): Promise<CanonicalRunArtifact> {
  const payload = await getJson<unknown>(`/api/runs/${encodeURIComponent(runId)}`);
  return canonicalRunArtifactSchema.parse(payload);
}
