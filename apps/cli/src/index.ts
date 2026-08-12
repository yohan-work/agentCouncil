#!/usr/bin/env node
import "dotenv/config";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { analystDefinition, loadAgentBundles } from "@agent-council/agents";
import { CouncilRunError, CouncilRunner, createRegistries } from "@agent-council/core";
import { CouncilRepository } from "@agent-council/database";
import {
  createDefaultMockProvider,
  evalCaseSchema,
  evaluateArtifact,
  listEvalCases,
  loadEvalCase,
} from "@agent-council/evals";
import { MockProvider, OllamaProvider } from "@agent-council/providers";
import type { ModelProvider, Scenario } from "@agent-council/shared";
import {
  canonicalRunArtifactSchema,
  scenarioSchema,
  stableStringify,
} from "@agent-council/shared";
import { z } from "zod";

import { loadConfig } from "./config";
import type { AppConfig } from "./config";

type ParsedArguments = {
  flags: Map<string, string>;
  positionals: string[];
};

function parseArguments(arguments_: string[]): ParsedArguments {
  const flags = new Map<string, string>();
  const positionals: string[] = [];
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (!argument) {
      continue;
    }
    if (!argument.startsWith("--")) {
      positionals.push(argument);
      continue;
    }
    const equalsIndex = argument.indexOf("=");
    if (equalsIndex >= 0) {
      flags.set(argument.slice(2, equalsIndex), argument.slice(equalsIndex + 1));
      continue;
    }
    const key = argument.slice(2);
    const next = arguments_[index + 1];
    if (next && !next.startsWith("--")) {
      flags.set(key, next);
      index += 1;
    } else {
      flags.set(key, "true");
    }
  }
  return { flags, positionals };
}

function requiredFlag(arguments_: ParsedArguments, name: string): string {
  const value = arguments_.flags.get(name);
  if (!value) {
    throw new Error(`Missing required flag --${name}.`);
  }
  return value;
}

function providerName(arguments_: ParsedArguments): "mock" | "ollama" {
  const value = arguments_.flags.get("provider") ?? "ollama";
  if (value !== "mock" && value !== "ollama") {
    throw new Error(`Unsupported provider ${value}. Use mock or ollama.`);
  }
  return value;
}

function createOllamaProvider(config: AppConfig): OllamaProvider {
  return new OllamaProvider({
    ...config.ollama,
    healthTimeoutMs: 3_000,
  });
}

function loadScenario(path: string): Scenario {
  const raw = JSON.parse(readFileSync(resolve(path), "utf8")) as unknown;
  const evalCase = evalCaseSchema.safeParse(raw);
  return evalCase.success ? evalCase.data.scenario : scenarioSchema.parse(raw);
}

function createRunner(options: {
  repository: CouncilRepository;
  provider: ModelProvider;
  config: AppConfig;
}): CouncilRunner {
  const registries = createRegistries(loadAgentBundles(process.cwd()));
  return new CouncilRunner({
    repository: options.repository,
    provider: options.provider,
    agents: registries.agents,
    prompts: registries.prompts,
    artifactDirectory: options.config.artifactDirectory,
  });
}

function createInterruptController(): { controller: AbortController; dispose: () => void } {
  const controller = new AbortController();
  const abort = () => controller.abort(new Error("Interrupted by SIGINT."));
  process.once("SIGINT", abort);
  return {
    controller,
    dispose: () => process.removeListener("SIGINT", abort),
  };
}

async function runCommand(arguments_: ParsedArguments, config: AppConfig): Promise<void> {
  const scenarioPath = requiredFlag(arguments_, "scenario");
  const scenario = loadScenario(scenarioPath);
  const name = providerName(arguments_);
  const provider = name === "mock" ? createDefaultMockProvider() : createOllamaProvider(config);
  const databasePath = arguments_.flags.get("db") ?? config.databasePath;
  const repository = new CouncilRepository(databasePath);
  const interrupt = createInterruptController();
  try {
    const runner = createRunner({ repository, provider, config });
    const result = await runner.run(scenario, interrupt.controller.signal);
    process.stdout.write(
      `${stableStringify({
        runId: result.runId,
        status: result.artifact.run.status,
        artifactPath: result.artifactPath,
        claims: result.artifact.claims.length,
        rebuttals: result.artifact.rebuttals.length,
        revisions: result.artifact.revisions.length,
      }, 2)}\n`,
    );
  } finally {
    interrupt.dispose();
    repository.close();
  }
}

async function doctorCommand(arguments_: ParsedArguments, config: AppConfig): Promise<void> {
  const name = providerName(arguments_);
  const provider: ModelProvider =
    name === "mock"
      ? new MockProvider([{ agentId: "analyst", output: { status: "ok" } }])
      : createOllamaProvider(config);
  const repository = new CouncilRepository(arguments_.flags.get("db") ?? config.databasePath);
  try {
    const database = repository.healthCheck();
    const health = await provider.healthCheck();
    if (!health.ok) {
      process.stdout.write(`${stableStringify({ database, provider: health }, 2)}\n`);
      process.exitCode = 1;
      return;
    }
    const smokeSchema = z.object({ status: z.literal("ok") }).strict();
    const smoke = await provider.generate({
      runId: "doctor",
      agent: analystDefinition,
      systemPrompt: "Return only JSON with status set to ok. Follow the supplied JSON Schema exactly.",
      input: { instruction: "structured output health check" },
      outputSchema: smokeSchema,
      limits: {
        timeoutMs: config.agentTimeoutMs,
        maxRetries: 1,
        maxInputTokens: Math.min(config.ollama.contextTokens, 2048),
        maxOutputTokens: 64,
      },
      signal: new AbortController().signal,
    });
    process.stdout.write(
      `${stableStringify({ database, provider: health, structuredOutput: smoke.data, usage: smoke.usage }, 2)}\n`,
    );
  } finally {
    repository.close();
  }
}

async function replayCommand(arguments_: ParsedArguments, config: AppConfig): Promise<void> {
  const artifactPath = arguments_.flags.get("artifact");
  if (artifactPath) {
    const artifact = canonicalRunArtifactSchema.parse(
      JSON.parse(readFileSync(resolve(artifactPath), "utf8")) as unknown,
    );
    process.stdout.write(`${stableStringify(artifact, 2)}\n`);
    return;
  }
  const runId = requiredFlag(arguments_, "run");
  const repository = new CouncilRepository(arguments_.flags.get("db") ?? config.databasePath);
  try {
    const artifact = repository.buildArtifact(runId, new Date().toISOString());
    process.stdout.write(`${stableStringify(artifact, 2)}\n`);
  } finally {
    repository.close();
  }
}

async function evalCommand(arguments_: ParsedArguments, config: AppConfig): Promise<void> {
  const name = providerName(arguments_);
  const selectedCase = arguments_.flags.get("case");
  const cases = selectedCase
    ? [loadEvalCase(resolve("data/eval-cases", `${selectedCase}.json`))]
    : listEvalCases().filter((entry) => entry.phase2);
  const repository = new CouncilRepository(arguments_.flags.get("db") ?? config.databasePath);
  const interrupt = createInterruptController();
  const evaluations: unknown[] = [];
  try {
    for (const evalCase of cases) {
      if (interrupt.controller.signal.aborted) {
        break;
      }
      const provider = name === "mock" ? createDefaultMockProvider() : createOllamaProvider(config);
      const runner = createRunner({ repository, provider, config });
      try {
        const result = await runner.run(evalCase.scenario, interrupt.controller.signal);
        evaluations.push({
          runId: result.runId,
          ...evaluateArtifact(result.artifact, evalCase),
        });
      } catch (error) {
        evaluations.push({
          caseId: evalCase.id,
          runId: error instanceof CouncilRunError ? error.runId : null,
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    interrupt.dispose();
    repository.close();
  }
  const passed = evaluations.every(
    (evaluation) =>
      typeof evaluation === "object" &&
      evaluation !== null &&
      "passed" in evaluation &&
      evaluation.passed === true,
  );
  process.stdout.write(`${stableStringify({ provider: name, passed, evaluations }, 2)}\n`);
  if (!passed) {
    process.exitCode = 1;
  }
}

function printHelp(): void {
  process.stdout.write(`Agent Council CLI

Commands:
  doctor [--provider ollama|mock] [--db PATH]
  run --scenario PATH [--provider ollama|mock] [--db PATH]
  replay --run RUN_ID [--db PATH]
  replay --artifact PATH
  eval [--provider ollama|mock] [--case FILE_STEM] [--db PATH]
`);
}

async function main(): Promise<void> {
  const [command = "help", ...rest] = process.argv.slice(2);
  const arguments_ = parseArguments(rest);
  const config = loadConfig();
  switch (command) {
    case "doctor":
      await doctorCommand(arguments_, config);
      break;
    case "run":
      await runCommand(arguments_, config);
      break;
    case "replay":
      await replayCommand(arguments_, config);
      break;
    case "eval":
      await evalCommand(arguments_, config);
      break;
    case "help":
    case "--help":
    case "-h":
      printHelp();
      break;
    default:
      throw new Error(`Unknown command ${command}.`);
  }
}

main().catch((error: unknown) => {
  const output = {
    error: error instanceof Error ? error.message : String(error),
    ...(error instanceof CouncilRunError ? { runId: error.runId } : {}),
  };
  process.stderr.write(`${stableStringify(output, 2)}\n`);
  process.exitCode = 1;
});
