import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const source = (packageName: string) =>
  fileURLToPath(new URL(`./packages/${packageName}/src/index.ts`, import.meta.url));
const browserSharedSource = fileURLToPath(new URL("./packages/shared/src/browser.ts", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@agent-council/shared/browser": browserSharedSource,
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
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    testTimeout: 10_000,
  },
});
