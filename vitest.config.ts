import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const source = (packageName: string) =>
  fileURLToPath(new URL(`./packages/${packageName}/src/index.ts`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@agent-council/shared": source("shared"),
      "@agent-council/agents": source("agents"),
      "@agent-council/providers": source("providers"),
      "@agent-council/database": source("database"),
      "@agent-council/core": source("core"),
      "@agent-council/evals": source("evals"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 10_000,
  },
});
