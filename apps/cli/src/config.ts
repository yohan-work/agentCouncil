import { z } from "zod";

const positiveInteger = (fallback: number) =>
  z.preprocess(
    (value) => (value === undefined || value === "" ? fallback : Number(value)),
    z.number().int().positive(),
  );

const nonnegativeNumber = (fallback: number) =>
  z.preprocess(
    (value) => (value === undefined || value === "" ? fallback : Number(value)),
    z.number().min(0),
  );

const environmentSchema = z.object({
  OLLAMA_BASE_URL: z.string().url().default("http://127.0.0.1:11434"),
  OLLAMA_MODEL: z.string().min(1).default("gemma4:e2b"),
  OLLAMA_KEEP_ALIVE: z.string().min(1).default("15m"),
  OLLAMA_CONTEXT_TOKENS: positiveInteger(8192),
  OLLAMA_OUTPUT_TOKENS: positiveInteger(2048),
  OLLAMA_TEMPERATURE: nonnegativeNumber(0),
  AGENT_TIMEOUT_MS: positiveInteger(180_000),
  COUNCIL_DB_PATH: z.string().min(1).default(".agent-council/agent-council.db"),
  COUNCIL_ARTIFACT_DIR: z.string().min(1).default("artifacts/runs"),
});

export type AppConfig = {
  ollama: {
    baseUrl: string;
    model: string;
    keepAlive: string;
    contextTokens: number;
    outputTokens: number;
    temperature: number;
  };
  agentTimeoutMs: number;
  databasePath: string;
  artifactDirectory: string;
};

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = environmentSchema.parse(environment);
  return {
    ollama: {
      baseUrl: parsed.OLLAMA_BASE_URL,
      model: parsed.OLLAMA_MODEL,
      keepAlive: parsed.OLLAMA_KEEP_ALIVE,
      contextTokens: parsed.OLLAMA_CONTEXT_TOKENS,
      outputTokens: parsed.OLLAMA_OUTPUT_TOKENS,
      temperature: parsed.OLLAMA_TEMPERATURE,
    },
    agentTimeoutMs: parsed.AGENT_TIMEOUT_MS,
    databasePath: parsed.COUNCIL_DB_PATH,
    artifactDirectory: parsed.COUNCIL_ARTIFACT_DIR,
  };
}
