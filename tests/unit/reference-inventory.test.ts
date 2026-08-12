import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("reference inventory", () => {
  it("covers every scanned file and preserves the nested Apache license", () => {
    const inventory = readFileSync("docs/reference-inventory.csv", "utf8");
    const lines = inventory.trim().split("\n");

    expect(lines).toHaveLength(2692);
    expect(inventory).toContain('"packages/rewardkit/LICENSE","IGNORE"');
    expect(inventory).toContain('"Apache-2.0"');
  });
});
