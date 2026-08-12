import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

import { afterEach, describe, expect, it } from "vitest";

import {
  createArtifactApiMiddleware,
  listArtifactSummaries,
  readArtifact,
} from "../../apps/web/server/artifact-store";

import { makeWebFixtureArtifact } from "./fixture";

const directories: string[] = [];

afterEach(() => {
  directories.splice(0);
});

function setupDirectory() {
  const directory = mkdtempSync(join(tmpdir(), "agent-council-web-"));
  directories.push(directory);
  return directory;
}

function responseCapture() {
  let body = "";
  let statusCode = 0;
  const response = {
    setHeader: () => undefined,
    end: (value?: string) => {
      body = value ?? "";
    },
    get statusCode() {
      return statusCode;
    },
    set statusCode(value: number) {
      statusCode = value;
    },
  } as unknown as ServerResponse;
  return { response, get body() { return body; }, get status() { return statusCode; } };
}

describe("artifact store", () => {
  it("lists valid artifacts by newest creation time and summarizes usage", () => {
    const directory = setupDirectory();
    const artifact = makeWebFixtureArtifact();
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, `${artifact.run.id}.json`), JSON.stringify(artifact));

    const [summary] = listArtifactSummaries(directory);
    expect(summary?.runId).toBe(artifact.run.id);
    expect(summary?.claims).toBe(2);
    expect(summary?.rebuttals).toBe(1);
    expect(summary?.inputTokens).toBe(310);
    expect(summary?.outputTokens).toBe(127);
  });

  it("rejects path traversal and malformed artifact content", () => {
    const directory = setupDirectory();
    expect(() => readArtifact(directory, "../secrets")).toThrow(/not found/u);
    const malformedId = "run_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    writeFileSync(join(directory, `${malformedId}.json`), "not json");
    expect(() => readArtifact(directory, malformedId)).toThrow(/not valid JSON/u);
  });

  it("serves list and detail routes without exposing the filesystem", () => {
    const directory = setupDirectory();
    const artifact = makeWebFixtureArtifact();
    writeFileSync(join(directory, `${artifact.run.id}.json`), JSON.stringify(artifact));
    const middleware = createArtifactApiMiddleware(directory);

    const list = responseCapture();
    middleware({ method: "GET", url: "/api/runs" } as IncomingMessage, list.response, () => undefined);
    expect(list.status).toBe(200);
    expect(JSON.parse(list.body).runs).toHaveLength(1);

    const detail = responseCapture();
    middleware({ method: "GET", url: `/api/runs/${artifact.run.id}` } as IncomingMessage, detail.response, () => undefined);
    expect(detail.status).toBe(200);
    expect(JSON.parse(detail.body).run.id).toBe(artifact.run.id);

    const traversal = responseCapture();
    middleware({ method: "GET", url: "/api/runs/%2E%2E%2Fsecret" } as IncomingMessage, traversal.response, () => undefined);
    expect(traversal.status).toBe(404);

    const method = responseCapture();
    middleware({ method: "POST", url: "/api/runs" } as IncomingMessage, method.response, () => undefined);
    expect(method.status).toBe(405);
  });
});
