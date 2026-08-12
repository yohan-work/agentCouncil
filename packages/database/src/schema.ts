import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const runs = sqliteTable("runs", {
  id: text("id").primaryKey(),
  scenarioId: text("scenario_id").notNull(),
  scenarioJson: text("scenario_json").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  status: text("status").notNull(),
  limitsJson: text("limits_json").notNull(),
  createdAt: text("created_at").notNull(),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  errorJson: text("error_json"),
  artifactPath: text("artifact_path"),
});

export const rounds = sqliteTable(
  "rounds",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    index: integer("round_index").notNull(),
    kind: text("kind").notNull(),
    status: text("status").notNull(),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    errorJson: text("error_json"),
  },
  (table) => [uniqueIndex("rounds_run_index_uq").on(table.runId, table.index)],
);

export const agentRuns = sqliteTable(
  "agent_runs",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    roundId: text("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    agentId: text("agent_id").notNull(),
    agentVersion: text("agent_version").notNull(),
    status: text("status").notNull(),
    inputHash: text("input_hash").notNull(),
    rawOutput: text("raw_output"),
    validatedOutputJson: text("validated_output_json"),
    attemptsJson: text("attempts_json").notNull(),
    usageJson: text("usage_json"),
    errorJson: text("error_json"),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
  },
  (table) => [index("agent_runs_run_idx").on(table.runId)],
);

export const claims = sqliteTable(
  "claims",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    roundId: text("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    authorAgentId: text("author_agent_id").notNull(),
    text: text("text").notNull(),
    claimType: text("claim_type").notNull(),
    evidenceRefsJson: text("evidence_refs_json").notNull(),
    assumptionsJson: text("assumptions_json").notNull(),
    confidence: integer("confidence_ppm").notNull(),
    importance: text("importance").notNull(),
    rationale: text("rationale").notNull(),
    status: text("status").notNull(),
    parentClaimId: text("parent_claim_id"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("claims_run_idx").on(table.runId)],
);

export const rebuttals = sqliteTable(
  "rebuttals",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    roundId: text("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    targetClaimId: text("target_claim_id")
      .notNull()
      .references(() => claims.id),
    authorAgentId: text("author_agent_id").notNull(),
    strongestCounterargument: text("strongest_counterargument").notNull(),
    failureScenario: text("failure_scenario").notNull(),
    missingEvidenceJson: text("missing_evidence_json").notNull(),
    disconfirmingTest: text("disconfirming_test").notNull(),
    severity: text("severity").notNull(),
    confidence: integer("confidence_ppm").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("rebuttals_run_idx").on(table.runId)],
);

export const revisions = sqliteTable(
  "revisions",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    roundId: text("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    claimId: text("claim_id")
      .notNull()
      .references(() => claims.id),
    rebuttalId: text("rebuttal_id")
      .notNull()
      .references(() => rebuttals.id),
    authorAgentId: text("author_agent_id").notNull(),
    action: text("action").notNull(),
    beforeJson: text("before_json").notNull(),
    afterJson: text("after_json"),
    rationale: text("rationale").notNull(),
    confidence: integer("confidence_ppm").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("revisions_run_idx").on(table.runId)],
);

export const traceEvents = sqliteTable(
  "trace_events",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    type: text("type").notNull(),
    timestamp: text("timestamp").notNull(),
    payloadJson: text("payload_json").notNull(),
  },
  (table) => [uniqueIndex("trace_events_run_sequence_uq").on(table.runId, table.sequence)],
);

export const promptVersions = sqliteTable("prompt_versions", {
  key: text("key").primaryKey(),
  agentId: text("agent_id").notNull(),
  agentVersion: text("agent_version").notNull(),
  promptPath: text("prompt_path").notNull(),
  contentHash: text("content_hash").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
});
