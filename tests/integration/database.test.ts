import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { CouncilRepository } from "@agent-council/database";
import { afterEach, describe, expect, it } from "vitest";

const repositories: CouncilRepository[] = [];

afterEach(() => {
  for (const repository of repositories.splice(0)) {
    repository.close();
  }
});

describe("CouncilRepository", () => {
  it("enforces immutable prompt versions", () => {
    const directory = mkdtempSync(join(tmpdir(), "agent-council-db-"));
    const repository = new CouncilRepository(join(directory, "test.db"));
    repositories.push(repository);
    const base = {
      agentId: "analyst",
      agentVersion: "1.0.0",
      promptPath: "prompt.md",
      contentHash: "a".repeat(64),
      content: "first prompt",
      createdAt: "2026-08-12T00:00:00.000Z",
    };
    repository.persistPromptVersion(base);
    repository.persistPromptVersion(base);

    expect(() =>
      repository.persistPromptVersion({
        ...base,
        contentHash: "b".repeat(64),
        content: "changed prompt",
      }),
    ).toThrow(/without a version bump/u);
  });
});
