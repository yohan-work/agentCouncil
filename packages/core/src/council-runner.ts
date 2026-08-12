import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  analystOutputSchema,
  analystRevisionOutputSchema,
  falsifierOutputSchema,
} from "@agent-council/agents";
import type { CouncilRepository } from "@agent-council/database";
import type {
  AgentDefinition,
  AgentRunRecord,
  CanonicalRunArtifact,
  Claim,
  GenerationResult,
  ModelProvider,
  Rebuttal,
  RoundRecord,
  RunLimits,
  RunRecord,
  Scenario,
  SerializedError,
} from "@agent-council/shared";
import {
  ProviderCancelledError,
  ProviderError,
  ProviderTimeoutError,
  createId,
  hashValue,
  nowIso,
  sanitizeValue,
  scenarioSchema,
  serializeError,
  serializedErrorSchema,
  stableStringify,
} from "@agent-council/shared";
import type { z } from "zod";

import { normalizeClaims, normalizeRebuttals, normalizeRevisions, prioritizeClaims } from "./claim-normalizer";
import type { AgentRegistry, PromptRegistry } from "./registry";

export type CouncilRunnerOptions = {
  repository: CouncilRepository;
  provider: ModelProvider;
  agents: AgentRegistry;
  prompts: PromptRegistry;
  artifactDirectory: string;
};

export type CouncilRunResult = {
  runId: string;
  artifactPath: string;
  artifact: CanonicalRunArtifact;
};

export class CouncilRunError extends Error {
  readonly runId: string;

  constructor(runId: string, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "CouncilRunError";
    this.runId = runId;
  }
}

function sanitizedError(error: unknown): SerializedError {
  return serializedErrorSchema.parse(sanitizeValue(serializeError(error)));
}

function limitsFromScenario(scenario: Scenario): RunLimits {
  return {
    timeoutMs: scenario.budget.timeoutMs,
    maxRetries: 1,
    maxInputTokens: scenario.budget.maxInputTokens,
    maxOutputTokens: scenario.budget.maxOutputTokens,
  };
}

export class CouncilRunner {
  private readonly repository: CouncilRepository;
  private readonly provider: ModelProvider;
  private readonly agents: AgentRegistry;
  private readonly prompts: PromptRegistry;
  private readonly artifactDirectory: string;
  private sequence = 0;

  constructor(options: CouncilRunnerOptions) {
    this.repository = options.repository;
    this.provider = options.provider;
    this.agents = options.agents;
    this.prompts = options.prompts;
    this.artifactDirectory = resolve(options.artifactDirectory);
  }

  async run(input: unknown, signal = new AbortController().signal): Promise<CouncilRunResult> {
    const scenario = scenarioSchema.parse(input);
    const runId = createId("run");
    const limits = limitsFromScenario(scenario);
    const createdAt = nowIso();
    const artifactPath = resolve(this.artifactDirectory, `${runId}.json`);
    let runRecord: RunRecord = {
      id: runId,
      scenarioId: scenario.id,
      scenario,
      provider: this.provider.name,
      model: this.provider.model,
      status: "pending",
      limits,
      createdAt,
      startedAt: null,
      completedAt: null,
      error: null,
      artifactPath: null,
    };
    let activeRound: RoundRecord | null = null;
    this.sequence = 0;

    this.repository.createRun(runRecord);
    for (const prompt of this.prompts.list()) {
      this.repository.persistPromptVersion(prompt);
    }
    this.emit(runId, "run.created", {
      scenarioId: scenario.id,
      provider: this.provider.name,
      model: this.provider.model,
    });

    try {
      if (signal.aborted) {
        throw new ProviderCancelledError("Run was cancelled before it started.");
      }
      runRecord = { ...runRecord, status: "running", startedAt: nowIso() };
      this.repository.updateRun(runRecord);
      this.emit(runId, "run.started", { limits });

      activeRound = this.startRound(runId, 0, "input_normalization");
      this.emit(runId, "input.normalized", {
        scenarioId: scenario.id,
        goals: scenario.goals.length,
        constraints: scenario.constraints.length,
        knownFacts: scenario.knownFacts.length,
        assumptions: scenario.assumptions.length,
      });
      activeRound = this.completeRound(activeRound);

      activeRound = this.startRound(runId, 1, "independent_analysis");
      const analystDefinition = this.agents.get("analyst");
      const analystResult = await this.executeAgent({
        runId,
        round: activeRound,
        definition: analystDefinition,
        input: { mode: "analysis", scenario },
        outputSchema: analystOutputSchema,
        limits,
        signal,
      });
      activeRound = this.completeRound(activeRound);

      activeRound = this.startRound(runId, 2, "claim_normalization");
      const claims = normalizeClaims({
        drafts: analystResult.data.claims,
        runId,
        roundId: activeRound.id,
        authorAgentId: analystDefinition.id,
        maximum: scenario.budget.maxClaims,
      });
      for (const claim of claims) {
        this.repository.insertClaim(claim);
      }
      this.emit(runId, "claims.normalized", {
        count: claims.length,
        sourceAgentRunAttempts: analystResult.attempts.length,
      });
      activeRound = this.completeRound(activeRound);

      activeRound = this.startRound(runId, 3, "rebuttal");
      const falsifierDefinition = this.agents.get("falsifier");
      const selectedClaims = prioritizeClaims(claims, scenario.budget.maxRebuttals);
      const falsifierResult = await this.executeAgent({
        runId,
        round: activeRound,
        definition: falsifierDefinition,
        input: { mode: "falsification", scenario, claims: selectedClaims },
        outputSchema: falsifierOutputSchema,
        limits,
        signal,
      });
      const rebuttals = normalizeRebuttals({
        drafts: falsifierResult.data.rebuttals,
        allowedClaims: selectedClaims,
        runId,
        roundId: activeRound.id,
        authorAgentId: falsifierDefinition.id,
      });
      this.validateFalsifierCoverage(
        selectedClaims,
        rebuttals,
        falsifierResult.data.unchallengedClaimIds,
      );
      const challengedIds = new Set(rebuttals.map((rebuttal) => rebuttal.targetClaimId));
      const challengedClaims = claims.map((claim) =>
        challengedIds.has(claim.id) ? { ...claim, status: "challenged" as const } : claim,
      );
      for (const rebuttal of rebuttals) {
        this.repository.insertRebuttal(rebuttal);
        this.repository.updateClaimStatus(rebuttal.targetClaimId, "challenged");
      }
      this.emit(runId, "rebuttals.normalized", {
        selectedClaims: selectedClaims.length,
        rebuttals: rebuttals.length,
        unchallengedClaims: falsifierResult.data.unchallengedClaimIds.length,
      });
      activeRound = this.completeRound(activeRound);

      activeRound = this.startRound(runId, 4, "revision");
      const claimById = new Map(challengedClaims.map((claim) => [claim.id, claim]));
      const revisionPairs = rebuttals.map((rebuttal) => ({
        claim: claimById.get(rebuttal.targetClaimId),
        rebuttal,
      }));
      if (revisionPairs.some((pair) => pair.claim === undefined)) {
        throw new Error("A Rebuttal could not be paired with its Claim.");
      }
      const revisionResult = await this.executeAgent({
        runId,
        round: activeRound,
        definition: analystDefinition,
        input: { mode: "revision", pairs: revisionPairs },
        outputSchema: analystRevisionOutputSchema,
        limits,
        signal,
      });
      const revisions = normalizeRevisions({
        drafts: revisionResult.data.revisions,
        claims: challengedClaims,
        rebuttals,
        runId,
        roundId: activeRound.id,
        authorAgentId: analystDefinition.id,
      });
      this.validateRevisionCoverage(rebuttals, revisions);
      for (const revision of revisions) {
        if (revision.action === "withdraw") {
          this.repository.updateClaimStatus(revision.claimId, "withdrawn");
        }
        if (revision.after) {
          this.repository.insertClaim(revision.after);
        }
        this.repository.insertRevision(revision);
      }
      this.emit(runId, "revisions.normalized", {
        total: revisions.length,
        maintain: revisions.filter((revision) => revision.action === "maintain").length,
        narrow: revisions.filter((revision) => revision.action === "narrow").length,
        conditionalize: revisions.filter((revision) => revision.action === "conditionalize").length,
        withdraw: revisions.filter((revision) => revision.action === "withdraw").length,
      });
      activeRound = this.completeRound(activeRound);

      const completedAt = nowIso();
      runRecord = {
        ...runRecord,
        status: "completed",
        completedAt,
        artifactPath,
      };
      this.repository.updateRun(runRecord);
      this.emit(runId, "run.completed", { artifactPath });
      const artifact = this.exportArtifact(runId, artifactPath);
      return { runId, artifactPath, artifact };
    } catch (error) {
      const cancelled = signal.aborted || error instanceof ProviderCancelledError;
      const terminalStatus = cancelled ? "cancelled" : "failed";
      const serialized = sanitizedError(error);
      if (activeRound?.status === "running") {
        activeRound = {
          ...activeRound,
          status: cancelled ? "cancelled" : "failed",
          completedAt: nowIso(),
          error: serialized,
        };
        this.repository.updateRound(activeRound);
      }
      runRecord = {
        ...runRecord,
        status: terminalStatus,
        completedAt: nowIso(),
        error: serialized,
        artifactPath,
      };
      this.repository.updateRun(runRecord);
      this.emit(runId, `run.${terminalStatus}`, { error: serialized });
      try {
        this.exportArtifact(runId, artifactPath);
      } catch (artifactError) {
        this.emit(runId, "artifact.export_failed", {
          error: sanitizedError(artifactError),
        });
      }
      throw new CouncilRunError(runId, `Council run ${terminalStatus}: ${serialized.message}`, error);
    }
  }

  exportArtifact(runId: string, artifactPath?: string): CanonicalRunArtifact {
    const target = artifactPath ?? resolve(this.artifactDirectory, `${runId}.json`);
    mkdirSync(resolve(target, ".."), { recursive: true });
    const artifact = this.repository.buildArtifact(runId, nowIso());
    const temporaryPath = `${target}.tmp`;
    writeFileSync(temporaryPath, `${stableStringify(artifact, 2)}\n`, "utf8");
    renameSync(temporaryPath, target);
    return artifact;
  }

  private startRound(
    runId: string,
    index: RoundRecord["index"],
    kind: RoundRecord["kind"],
  ): RoundRecord {
    const pending: RoundRecord = {
      id: createId("round"),
      runId,
      index,
      kind,
      status: "pending",
      startedAt: null,
      completedAt: null,
      error: null,
    };
    this.repository.createRound(pending);
    const running: RoundRecord = { ...pending, status: "running", startedAt: nowIso() };
    this.repository.updateRound(running);
    this.emit(runId, "round.started", { roundId: running.id, index, kind });
    return running;
  }

  private completeRound(round: RoundRecord): RoundRecord {
    const completed: RoundRecord = { ...round, status: "completed", completedAt: nowIso() };
    this.repository.updateRound(completed);
    this.emit(round.runId, "round.completed", {
      roundId: round.id,
      index: round.index,
      kind: round.kind,
    });
    return completed;
  }

  private async executeAgent<T>(options: {
    runId: string;
    round: RoundRecord;
    definition: AgentDefinition;
    input: unknown;
    outputSchema: z.ZodType<T>;
    limits: RunLimits;
    signal: AbortSignal;
  }): Promise<GenerationResult<T>> {
    const prompt = this.prompts.get(options.definition.id, options.definition.version);
    let record: AgentRunRecord = {
      id: createId("arun"),
      runId: options.runId,
      roundId: options.round.id,
      agentId: options.definition.id,
      agentVersion: options.definition.version,
      status: "pending",
      inputHash: hashValue(options.input),
      rawOutput: null,
      validatedOutput: null,
      attempts: [],
      usage: null,
      error: null,
      startedAt: null,
      completedAt: null,
    };
    this.repository.createAgentRun(record);
    record = { ...record, status: "running", startedAt: nowIso() };
    this.repository.updateAgentRun(record);
    this.emit(options.runId, "agent.started", {
      agentRunId: record.id,
      agentId: record.agentId,
      agentVersion: record.agentVersion,
      roundId: record.roundId,
      inputHash: record.inputHash,
    });

    try {
      const result = await this.provider.generate({
        runId: options.runId,
        agent: options.definition,
        systemPrompt: prompt.content,
        input: options.input,
        outputSchema: options.outputSchema,
        limits: options.limits,
        signal: options.signal,
      });
      for (const attempt of result.attempts.filter((entry) => entry.status === "failed")) {
        this.emit(options.runId, "agent.attempt_failed", {
          agentRunId: record.id,
          attempt: attempt.attempt,
          error: attempt.error,
          rawOutputHash: attempt.rawOutput ? hashValue(attempt.rawOutput) : null,
        });
      }
      record = {
        ...record,
        status: "succeeded",
        rawOutput: result.rawOutput,
        validatedOutput: result.data,
        attempts: result.attempts,
        usage: result.usage,
        completedAt: nowIso(),
      };
      this.repository.updateAgentRun(record);
      this.emit(options.runId, "agent.succeeded", {
        agentRunId: record.id,
        agentId: record.agentId,
        attempts: result.attempts.length,
        usage: result.usage,
      });
      return result;
    } catch (error) {
      const serialized = sanitizedError(error);
      const attempts = error instanceof ProviderError ? error.attempts : [];
      const status: AgentRunRecord["status"] =
        error instanceof ProviderCancelledError
          ? "cancelled"
          : error instanceof ProviderTimeoutError
            ? "timed_out"
            : "failed";
      record = {
        ...record,
        status,
        rawOutput: error instanceof ProviderError ? (error.rawOutput ?? null) : null,
        attempts,
        error: serialized,
        completedAt: nowIso(),
      };
      this.repository.updateAgentRun(record);
      this.emit(options.runId, "agent.failed", {
        agentRunId: record.id,
        agentId: record.agentId,
        status,
        error: serialized,
      });
      throw error;
    }
  }

  private validateFalsifierCoverage(
    selectedClaims: Claim[],
    rebuttals: Rebuttal[],
    unchallengedClaimIds: string[],
  ): void {
    const selectedIds = new Set(selectedClaims.map((claim) => claim.id));
    const rebuttedIds = new Set(rebuttals.map((rebuttal) => rebuttal.targetClaimId));
    const unchallengedIds = new Set(unchallengedClaimIds);
    for (const claimId of unchallengedIds) {
      if (!selectedIds.has(claimId)) {
        throw new Error(`Falsifier marked unknown Claim ${claimId} as unchallenged.`);
      }
      if (rebuttedIds.has(claimId)) {
        throw new Error(`Claim ${claimId} is both rebutted and unchallenged.`);
      }
    }
    for (const claimId of selectedIds) {
      if (!rebuttedIds.has(claimId) && !unchallengedIds.has(claimId)) {
        throw new Error(`Falsifier omitted selected Claim ${claimId}.`);
      }
    }
  }

  private validateRevisionCoverage(rebuttals: Rebuttal[], revisions: { claimId: string }[]): void {
    const expected = new Set(rebuttals.map((rebuttal) => rebuttal.targetClaimId));
    const actual = new Set(revisions.map((revision) => revision.claimId));
    if (expected.size !== actual.size || [...expected].some((claimId) => !actual.has(claimId))) {
      throw new Error("Analyst must respond exactly once to every Rebuttal.");
    }
  }

  private emit(runId: string, type: string, payload: Record<string, unknown>): void {
    const sanitized = sanitizeValue(payload);
    if (sanitized === null || Array.isArray(sanitized) || typeof sanitized !== "object") {
      throw new Error("Trace payload must be an object.");
    }
    this.repository.appendTrace({
      id: createId("trace"),
      runId,
      sequence: this.sequence,
      type,
      timestamp: nowIso(),
      payload: sanitized as Record<string, unknown>,
    });
    this.sequence += 1;
  }
}
