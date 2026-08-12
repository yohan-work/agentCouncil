import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type {
  AgentRunRecord,
  CanonicalRunArtifact,
  Claim,
  PromptVersion,
  Rebuttal,
  Revision,
  RoundRecord,
  RunRecord,
  TraceEvent,
} from "@agent-council/shared";
import {
  agentRunRecordSchema,
  canonicalRunArtifactSchema,
  claimSchema,
  promptVersionSchema,
  rebuttalSchema,
  revisionSchema,
  roundRecordSchema,
  runRecordSchema,
  stableStringify,
  traceEventSchema,
} from "@agent-council/shared";
import Database from "better-sqlite3";
import { and, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";

import { initialMigrationSql } from "./migration";
import * as schema from "./schema";

function parseJson(value: string): unknown {
  return JSON.parse(value) as unknown;
}

function confidenceToPpm(value: number): number {
  return Math.round(value * 1_000_000);
}

function confidenceFromPpm(value: number): number {
  return value / 1_000_000;
}

export class CouncilRepository {
  readonly databasePath: string;
  private readonly client: Database.Database;
  private readonly db: ReturnType<typeof drizzle<typeof schema>>;

  constructor(databasePath: string) {
    this.databasePath = databasePath === ":memory:" ? databasePath : resolve(databasePath);
    if (this.databasePath !== ":memory:") {
      mkdirSync(dirname(this.databasePath), { recursive: true });
    }
    this.client = new Database(this.databasePath);
    this.client.pragma("foreign_keys = ON");
    if (this.databasePath !== ":memory:") {
      this.client.pragma("journal_mode = WAL");
    }
    this.client.exec(initialMigrationSql);
    this.db = drizzle(this.client, { schema });
  }

  healthCheck(): { ok: true; databasePath: string } {
    this.client.prepare("SELECT 1 AS ok").get();
    return { ok: true, databasePath: this.databasePath };
  }

  close(): void {
    this.client.close();
  }

  createRun(record: RunRecord): void {
    const parsed = runRecordSchema.parse(record);
    this.db
      .insert(schema.runs)
      .values({
        id: parsed.id,
        scenarioId: parsed.scenarioId,
        scenarioJson: stableStringify(parsed.scenario),
        provider: parsed.provider,
        model: parsed.model,
        status: parsed.status,
        limitsJson: stableStringify(parsed.limits),
        createdAt: parsed.createdAt,
        startedAt: parsed.startedAt,
        completedAt: parsed.completedAt,
        errorJson: parsed.error ? stableStringify(parsed.error) : null,
        artifactPath: parsed.artifactPath,
      })
      .run();
  }

  updateRun(record: RunRecord): void {
    const parsed = runRecordSchema.parse(record);
    this.db
      .update(schema.runs)
      .set({
        status: parsed.status,
        startedAt: parsed.startedAt,
        completedAt: parsed.completedAt,
        errorJson: parsed.error ? stableStringify(parsed.error) : null,
        artifactPath: parsed.artifactPath,
      })
      .where(eq(schema.runs.id, parsed.id))
      .run();
  }

  createRound(record: RoundRecord): void {
    const parsed = roundRecordSchema.parse(record);
    this.db
      .insert(schema.rounds)
      .values({
        id: parsed.id,
        runId: parsed.runId,
        index: parsed.index,
        kind: parsed.kind,
        status: parsed.status,
        startedAt: parsed.startedAt,
        completedAt: parsed.completedAt,
        errorJson: parsed.error ? stableStringify(parsed.error) : null,
      })
      .run();
  }

  updateRound(record: RoundRecord): void {
    const parsed = roundRecordSchema.parse(record);
    this.db
      .update(schema.rounds)
      .set({
        status: parsed.status,
        startedAt: parsed.startedAt,
        completedAt: parsed.completedAt,
        errorJson: parsed.error ? stableStringify(parsed.error) : null,
      })
      .where(eq(schema.rounds.id, parsed.id))
      .run();
  }

  createAgentRun(record: AgentRunRecord): void {
    const parsed = agentRunRecordSchema.parse(record);
    this.db
      .insert(schema.agentRuns)
      .values({
        id: parsed.id,
        runId: parsed.runId,
        roundId: parsed.roundId,
        agentId: parsed.agentId,
        agentVersion: parsed.agentVersion,
        status: parsed.status,
        inputHash: parsed.inputHash,
        rawOutput: parsed.rawOutput,
        validatedOutputJson:
          parsed.validatedOutput === null ? null : stableStringify(parsed.validatedOutput),
        attemptsJson: stableStringify(parsed.attempts),
        usageJson: parsed.usage ? stableStringify(parsed.usage) : null,
        errorJson: parsed.error ? stableStringify(parsed.error) : null,
        startedAt: parsed.startedAt,
        completedAt: parsed.completedAt,
      })
      .run();
  }

  updateAgentRun(record: AgentRunRecord): void {
    const parsed = agentRunRecordSchema.parse(record);
    this.db
      .update(schema.agentRuns)
      .set({
        status: parsed.status,
        rawOutput: parsed.rawOutput,
        validatedOutputJson:
          parsed.validatedOutput === null ? null : stableStringify(parsed.validatedOutput),
        attemptsJson: stableStringify(parsed.attempts),
        usageJson: parsed.usage ? stableStringify(parsed.usage) : null,
        errorJson: parsed.error ? stableStringify(parsed.error) : null,
        startedAt: parsed.startedAt,
        completedAt: parsed.completedAt,
      })
      .where(eq(schema.agentRuns.id, parsed.id))
      .run();
  }

  insertClaim(value: Claim): void {
    const parsed = claimSchema.parse(value);
    this.db
      .insert(schema.claims)
      .values({
        id: parsed.id,
        runId: parsed.runId,
        roundId: parsed.roundId,
        authorAgentId: parsed.authorAgentId,
        text: parsed.text,
        claimType: parsed.claimType,
        evidenceRefsJson: stableStringify(parsed.evidenceRefs),
        assumptionsJson: stableStringify(parsed.assumptions),
        confidence: confidenceToPpm(parsed.confidence),
        importance: parsed.importance,
        rationale: parsed.rationale,
        status: parsed.status,
        parentClaimId: parsed.parentClaimId,
        createdAt: parsed.createdAt,
      })
      .run();
  }

  updateClaimStatus(claimId: string, status: Claim["status"]): void {
    this.db.update(schema.claims).set({ status }).where(eq(schema.claims.id, claimId)).run();
  }

  insertRebuttal(value: Rebuttal): void {
    const parsed = rebuttalSchema.parse(value);
    this.db
      .insert(schema.rebuttals)
      .values({
        id: parsed.id,
        runId: parsed.runId,
        roundId: parsed.roundId,
        targetClaimId: parsed.targetClaimId,
        authorAgentId: parsed.authorAgentId,
        strongestCounterargument: parsed.strongestCounterargument,
        failureScenario: parsed.failureScenario,
        missingEvidenceJson: stableStringify(parsed.missingEvidence),
        disconfirmingTest: parsed.disconfirmingTest,
        severity: parsed.severity,
        confidence: confidenceToPpm(parsed.confidence),
        createdAt: parsed.createdAt,
      })
      .run();
  }

  insertRevision(value: Revision): void {
    const parsed = revisionSchema.parse(value);
    this.db
      .insert(schema.revisions)
      .values({
        id: parsed.id,
        runId: parsed.runId,
        roundId: parsed.roundId,
        claimId: parsed.claimId,
        rebuttalId: parsed.rebuttalId,
        authorAgentId: parsed.authorAgentId,
        action: parsed.action,
        beforeJson: stableStringify(parsed.before),
        afterJson: parsed.after ? stableStringify(parsed.after) : null,
        rationale: parsed.rationale,
        confidence: confidenceToPpm(parsed.confidence),
        createdAt: parsed.createdAt,
      })
      .run();
  }

  appendTrace(value: TraceEvent): void {
    const parsed = traceEventSchema.parse(value);
    this.db
      .insert(schema.traceEvents)
      .values({
        id: parsed.id,
        runId: parsed.runId,
        sequence: parsed.sequence,
        type: parsed.type,
        timestamp: parsed.timestamp,
        payloadJson: stableStringify(parsed.payload),
      })
      .run();
  }

  persistPromptVersion(value: PromptVersion): void {
    const parsed = promptVersionSchema.parse(value);
    const key = `${parsed.agentId}@${parsed.agentVersion}`;
    const existing = this.db
      .select()
      .from(schema.promptVersions)
      .where(eq(schema.promptVersions.key, key))
      .get();
    if (existing && existing.contentHash !== parsed.contentHash) {
      throw new Error(`Prompt ${key} changed without a version bump.`);
    }
    if (!existing) {
      this.db
        .insert(schema.promptVersions)
        .values({ key, ...parsed })
        .run();
    }
  }

  getRun(runId: string): RunRecord | undefined {
    const row = this.db.select().from(schema.runs).where(eq(schema.runs.id, runId)).get();
    if (!row) {
      return undefined;
    }
    return runRecordSchema.parse({
      id: row.id,
      scenarioId: row.scenarioId,
      scenario: parseJson(row.scenarioJson),
      provider: row.provider,
      model: row.model,
      status: row.status,
      limits: parseJson(row.limitsJson),
      createdAt: row.createdAt,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      error: row.errorJson ? parseJson(row.errorJson) : null,
      artifactPath: row.artifactPath,
    });
  }

  getAgentRuns(runId: string): AgentRunRecord[] {
    return this.db
      .select()
      .from(schema.agentRuns)
      .where(eq(schema.agentRuns.runId, runId))
      .orderBy(asc(schema.agentRuns.startedAt))
      .all()
      .map((row) =>
        agentRunRecordSchema.parse({
          id: row.id,
          runId: row.runId,
          roundId: row.roundId,
          agentId: row.agentId,
          agentVersion: row.agentVersion,
          status: row.status,
          inputHash: row.inputHash,
          rawOutput: row.rawOutput,
          validatedOutput: row.validatedOutputJson ? parseJson(row.validatedOutputJson) : null,
          attempts: parseJson(row.attemptsJson),
          usage: row.usageJson ? parseJson(row.usageJson) : null,
          error: row.errorJson ? parseJson(row.errorJson) : null,
          startedAt: row.startedAt,
          completedAt: row.completedAt,
        }),
      );
  }

  buildArtifact(runId: string, exportedAt: string): CanonicalRunArtifact {
    const run = this.getRun(runId);
    if (!run) {
      throw new Error(`Run ${runId} does not exist.`);
    }
    const roundRecords = this.db
      .select()
      .from(schema.rounds)
      .where(eq(schema.rounds.runId, runId))
      .orderBy(asc(schema.rounds.index))
      .all()
      .map((row) =>
        roundRecordSchema.parse({
          id: row.id,
          runId: row.runId,
          index: row.index,
          kind: row.kind,
          status: row.status,
          startedAt: row.startedAt,
          completedAt: row.completedAt,
          error: row.errorJson ? parseJson(row.errorJson) : null,
        }),
      );
    const claimRecords = this.db
      .select()
      .from(schema.claims)
      .where(eq(schema.claims.runId, runId))
      .orderBy(asc(schema.claims.createdAt))
      .all()
      .map((row) =>
        claimSchema.parse({
          id: row.id,
          runId: row.runId,
          roundId: row.roundId,
          authorAgentId: row.authorAgentId,
          text: row.text,
          claimType: row.claimType,
          evidenceRefs: parseJson(row.evidenceRefsJson),
          assumptions: parseJson(row.assumptionsJson),
          confidence: confidenceFromPpm(row.confidence),
          importance: row.importance,
          rationale: row.rationale,
          status: row.status,
          parentClaimId: row.parentClaimId,
          createdAt: row.createdAt,
        }),
      );
    const rebuttalRecords = this.db
      .select()
      .from(schema.rebuttals)
      .where(eq(schema.rebuttals.runId, runId))
      .orderBy(asc(schema.rebuttals.createdAt))
      .all()
      .map((row) =>
        rebuttalSchema.parse({
          id: row.id,
          runId: row.runId,
          roundId: row.roundId,
          targetClaimId: row.targetClaimId,
          authorAgentId: row.authorAgentId,
          strongestCounterargument: row.strongestCounterargument,
          failureScenario: row.failureScenario,
          missingEvidence: parseJson(row.missingEvidenceJson),
          disconfirmingTest: row.disconfirmingTest,
          severity: row.severity,
          confidence: confidenceFromPpm(row.confidence),
          createdAt: row.createdAt,
        }),
      );
    const revisionRecords = this.db
      .select()
      .from(schema.revisions)
      .where(eq(schema.revisions.runId, runId))
      .orderBy(asc(schema.revisions.createdAt))
      .all()
      .map((row) =>
        revisionSchema.parse({
          id: row.id,
          runId: row.runId,
          roundId: row.roundId,
          claimId: row.claimId,
          rebuttalId: row.rebuttalId,
          authorAgentId: row.authorAgentId,
          action: row.action,
          before: parseJson(row.beforeJson),
          after: row.afterJson ? parseJson(row.afterJson) : null,
          rationale: row.rationale,
          confidence: confidenceFromPpm(row.confidence),
          createdAt: row.createdAt,
        }),
      );
    const traces = this.db
      .select()
      .from(schema.traceEvents)
      .where(eq(schema.traceEvents.runId, runId))
      .orderBy(asc(schema.traceEvents.sequence))
      .all()
      .map((row) =>
        traceEventSchema.parse({
          id: row.id,
          runId: row.runId,
          sequence: row.sequence,
          type: row.type,
          timestamp: row.timestamp,
          payload: parseJson(row.payloadJson),
        }),
      );

    return canonicalRunArtifactSchema.parse({
      schemaVersion: "1.0",
      exportedAt,
      run,
      rounds: roundRecords,
      agentRuns: this.getAgentRuns(runId),
      claims: claimRecords,
      rebuttals: rebuttalRecords,
      revisions: revisionRecords,
      traceEvents: traces,
    });
  }

  hasPromptVersion(agentId: string, agentVersion: string): boolean {
    return Boolean(
      this.db
        .select({ key: schema.promptVersions.key })
        .from(schema.promptVersions)
        .where(
          and(
            eq(schema.promptVersions.agentId, agentId),
            eq(schema.promptVersions.agentVersion, agentVersion),
          ),
        )
        .get(),
    );
  }
}
