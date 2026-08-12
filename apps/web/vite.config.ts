import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { createArtifactApiMiddleware } from "./server/artifact-store";

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    {
      name: "agent-council-artifact-api",
      configureServer(server) {
        server.middlewares.use(
          createArtifactApiMiddleware(resolve(projectRoot, "artifacts/runs")),
        );
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: resolve(projectRoot, "dist/web"),
    emptyOutDir: true,
  },
});
