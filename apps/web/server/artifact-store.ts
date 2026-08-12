import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

import {
  canonicalRunArtifactSchema,
  type CanonicalRunArtifact,
} from "../../../packages/shared/src/index";

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

type HttpError = Error & { statusCode: number };

const runIdPattern = /^run_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

function httpError(statusCode: number, message: string): HttpError {
  const error = new Error(message) as HttpError;
  error.statusCode = statusCode;
  return error;
}

function artifactFilePath(artifactDirectory: string, runId: string): string {
  if (!runIdPattern.test(runId)) {
    throw httpError(404, `Run ${runId} was not found.`);
  }
  return join(resolve(artifactDirectory), `${runId}.json`);
}

function parseArtifact(raw: string, filePath: string): CanonicalRunArtifact {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    throw httpError(422, `Artifact ${filePath} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  const result = canonicalRunArtifactSchema.safeParse(parsed);
  if (!result.success) {
    throw httpError(422, `Artifact ${filePath} failed schema validation.`);
  }
  return result.data;
}

function readArtifactFile(filePath: string): CanonicalRunArtifact {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    if (code === "ENOENT") {
      throw httpError(404, `Artifact ${filePath} was not found.`);
    }
    throw httpError(500, `Unable to read artifact ${filePath}.`);
  }
  return parseArtifact(raw, filePath);
}

function elapsedMs(startedAt: string | null, completedAt: string | null): number {
  if (!startedAt || !completedAt) {
    return 0;
  }
  return Math.max(0, new Date(completedAt).getTime() - new Date(startedAt).getTime());
}

export function summarizeArtifact(artifact: CanonicalRunArtifact): RunSummary {
  const inputTokens = artifact.agentRuns.reduce(
    (total, agentRun) => total + (agentRun.usage?.inputTokens ?? 0),
    0,
  );
  const outputTokens = artifact.agentRuns.reduce(
    (total, agentRun) => total + (agentRun.usage?.outputTokens ?? 0),
    0,
  );
  const durationMs = artifact.agentRuns.reduce(
    (total, agentRun) => total + (agentRun.usage?.durationMs ?? 0),
    0,
  ) || elapsedMs(artifact.run.startedAt, artifact.run.completedAt);

  return {
    runId: artifact.run.id,
    scenarioId: artifact.run.scenarioId,
    title: artifact.run.scenario.title,
    status: artifact.run.status,
    provider: artifact.run.provider,
    model: artifact.run.model,
    createdAt: artifact.run.createdAt,
    startedAt: artifact.run.startedAt,
    completedAt: artifact.run.completedAt,
    claims: artifact.claims.length,
    rebuttals: artifact.rebuttals.length,
    revisions: artifact.revisions.length,
    durationMs,
    inputTokens,
    outputTokens,
  };
}

export function readArtifact(artifactDirectory: string, runId: string): CanonicalRunArtifact {
  return readArtifactFile(artifactFilePath(artifactDirectory, runId));
}

export function listArtifactSummaries(artifactDirectory: string): RunSummary[] {
  let fileNames: string[];
  try {
    fileNames = readdirSync(resolve(artifactDirectory));
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    if (code === "ENOENT") {
      return [];
    }
    throw httpError(500, "Unable to list run artifacts.");
  }

  return fileNames
    .filter((fileName) => fileName.endsWith(".json") && runIdPattern.test(fileName.slice(0, -5)))
    .flatMap((fileName) => {
      try {
        return [summarizeArtifact(readArtifactFile(join(resolve(artifactDirectory), fileName)))];
      } catch {
        return [];
      }
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function requestPath(request: IncomingMessage): string {
  return new URL(request.url ?? "/", "http://localhost").pathname;
}

export function createArtifactApiMiddleware(artifactDirectory: string) {
  return (request: IncomingMessage, response: ServerResponse, next: () => void): void => {
    const path = requestPath(request);
    if (path.startsWith("/api/runs") && request.method !== "GET") {
      sendJson(response, 405, { error: "Only GET is supported for artifact APIs." });
      return;
    }
    if (path === "/api/runs") {
      try {
        sendJson(response, 200, { runs: listArtifactSummaries(artifactDirectory) });
      } catch (error) {
        const statusCode = error && typeof error === "object" && "statusCode" in error ? error.statusCode : 500;
        sendJson(response, Number(statusCode), { error: error instanceof Error ? error.message : String(error) });
      }
      return;
    }

    const match = /^\/api\/runs\/([^/]+)$/u.exec(path);
    if (!match?.[1]) {
      next();
      return;
    }

    let runId: string;
    try {
      runId = decodeURIComponent(match[1]);
    } catch {
      sendJson(response, 404, { error: "Run was not found." });
      return;
    }

    try {
      sendJson(response, 200, readArtifact(artifactDirectory, runId));
    } catch (error) {
      const statusCode = error && typeof error === "object" && "statusCode" in error ? error.statusCode : 500;
      sendJson(response, Number(statusCode), { error: error instanceof Error ? error.message : String(error) });
    }
  };
}
