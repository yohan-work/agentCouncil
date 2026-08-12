import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);
const isoTimestamp = z.string().datetime({ offset: true });

export const confidenceSchema = z.number().min(0).max(1);
export const claimTypeSchema = z.enum(["fact", "inference", "assumption", "recommendation"]);
export const claimImportanceSchema = z.enum(["low", "medium", "high", "critical"]);
export const claimStatusSchema = z.enum([
  "proposed",
  "challenged",
  "revised",
  "withdrawn",
  "accepted",
  "conditional",
  "rejected",
  "unresolved",
]);
export const revisionActionSchema = z.enum(["maintain", "narrow", "conditionalize", "withdraw"]);

export const scenarioBudgetSchema = z
  .object({
    maxClaims: z.number().int().min(1).max(50),
    maxRebuttals: z.number().int().min(1).max(50),
    maxInputTokens: z.number().int().positive(),
    maxOutputTokens: z.number().int().positive(),
    timeoutMs: z.number().int().positive(),
  })
  .strict();

export const scenarioSchema = z
  .object({
    id: nonEmptyString,
    title: nonEmptyString,
    problem: nonEmptyString,
    context: z.string(),
    goals: z.array(nonEmptyString),
    constraints: z.array(nonEmptyString),
    knownFacts: z.array(nonEmptyString),
    assumptions: z.array(nonEmptyString),
    expectedOutput: nonEmptyString,
    budget: scenarioBudgetSchema,
  })
  .strict();

export type Scenario = z.infer<typeof scenarioSchema>;
export type ScenarioBudget = z.infer<typeof scenarioBudgetSchema>;

export const agentDefinitionSchema = z
  .object({
    id: nonEmptyString,
    name: nonEmptyString,
    version: z.string().regex(/^\d+\.\d+\.\d+$/u),
    purpose: nonEmptyString,
    responsibilities: z.array(nonEmptyString).min(1),
    nonGoals: z.array(nonEmptyString).min(1),
    requiredInputs: z.array(nonEmptyString).min(1),
    outputSchema: nonEmptyString,
    allowedTools: z.array(nonEmptyString),
    promptPath: nonEmptyString,
    evaluationSuite: nonEmptyString,
    defaultModelConfig: z
      .object({
        model: nonEmptyString,
        reasoning: z.string().optional(),
        temperature: z.number().min(0).max(2).optional(),
      })
      .strict(),
  })
  .strict();

export type AgentDefinition = z.infer<typeof agentDefinitionSchema>;

export const claimDraftSchema = z
  .object({
    text: nonEmptyString,
    claimType: claimTypeSchema,
    evidenceRefs: z.array(nonEmptyString),
    assumptions: z.array(nonEmptyString),
    confidence: confidenceSchema,
    importance: claimImportanceSchema,
    rationale: nonEmptyString,
  })
  .strict();

export const analystOutputSchema = z
  .object({
    problemFrame: nonEmptyString,
    claims: z.array(claimDraftSchema).min(1).max(50),
    recommendation: nonEmptyString,
    informationGaps: z.array(nonEmptyString),
  })
  .strict();

export type AnalystOutput = z.infer<typeof analystOutputSchema>;
export type ClaimDraft = z.infer<typeof claimDraftSchema>;

export const claimSchema = z
  .object({
    id: nonEmptyString,
    runId: nonEmptyString,
    roundId: nonEmptyString,
    authorAgentId: nonEmptyString,
    text: nonEmptyString,
    claimType: claimTypeSchema,
    evidenceRefs: z.array(nonEmptyString),
    assumptions: z.array(nonEmptyString),
    confidence: confidenceSchema,
    importance: claimImportanceSchema,
    rationale: nonEmptyString,
    status: claimStatusSchema,
    parentClaimId: nonEmptyString.nullable(),
    createdAt: isoTimestamp,
  })
  .strict();

export type Claim = z.infer<typeof claimSchema>;

export const rebuttalDraftSchema = z
  .object({
    targetClaimId: nonEmptyString,
    strongestCounterargument: nonEmptyString,
    failureScenario: nonEmptyString,
    missingEvidence: z.array(nonEmptyString),
    disconfirmingTest: nonEmptyString,
    severity: z.enum(["low", "medium", "high"]),
    confidence: confidenceSchema,
  })
  .strict();

export const falsifierOutputSchema = z
  .object({
    rebuttals: z.array(rebuttalDraftSchema).min(1).max(50),
    unchallengedClaimIds: z.array(nonEmptyString),
  })
  .strict();

export type FalsifierOutput = z.infer<typeof falsifierOutputSchema>;
export type RebuttalDraft = z.infer<typeof rebuttalDraftSchema>;

export const rebuttalSchema = rebuttalDraftSchema
  .extend({
    id: nonEmptyString,
    runId: nonEmptyString,
    roundId: nonEmptyString,
    authorAgentId: nonEmptyString,
    createdAt: isoTimestamp,
  })
  .strict();

export type Rebuttal = z.infer<typeof rebuttalSchema>;

export const revisionDraftSchema = z
  .object({
    claimId: nonEmptyString,
    rebuttalId: nonEmptyString,
    action: revisionActionSchema,
    revisedText: nonEmptyString.nullable(),
    rationale: nonEmptyString,
    confidence: confidenceSchema,
  })
  .strict();

export const analystRevisionOutputSchema = z
  .object({
    revisions: z.array(revisionDraftSchema).min(1).max(50),
  })
  .strict();

export type AnalystRevisionOutput = z.infer<typeof analystRevisionOutputSchema>;
export type RevisionDraft = z.infer<typeof revisionDraftSchema>;

export const revisionSchema = z
  .object({
    id: nonEmptyString,
    runId: nonEmptyString,
    roundId: nonEmptyString,
    claimId: nonEmptyString,
    rebuttalId: nonEmptyString,
    authorAgentId: nonEmptyString,
    action: revisionActionSchema,
    before: claimSchema,
    after: claimSchema.nullable(),
    rationale: nonEmptyString,
    confidence: confidenceSchema,
    createdAt: isoTimestamp,
  })
  .strict();

export type Revision = z.infer<typeof revisionSchema>;

export const runStatusSchema = z.enum(["pending", "running", "completed", "failed", "cancelled"]);
export const roundStatusSchema = z.enum(["pending", "running", "completed", "failed", "cancelled"]);
export const agentRunStatusSchema = z.enum([
  "pending",
  "running",
  "succeeded",
  "failed",
  "timed_out",
  "cancelled",
]);

export const runLimitsSchema = z
  .object({
    timeoutMs: z.number().int().positive(),
    maxRetries: z.literal(1),
    maxInputTokens: z.number().int().positive().optional(),
    maxOutputTokens: z.number().int().positive(),
  })
  .strict();

export type RunLimits = z.infer<typeof runLimitsSchema>;

export const providerUsageSchema = z
  .object({
    inputTokens: z.number().int().nonnegative().optional(),
    outputTokens: z.number().int().nonnegative().optional(),
    durationMs: z.number().nonnegative(),
    estimatedCost: z.literal(0),
  })
  .strict();

export type ProviderUsage = z.infer<typeof providerUsageSchema>;

export const serializedErrorSchema = z
  .object({
    name: nonEmptyString,
    code: nonEmptyString,
    message: nonEmptyString,
    retryable: z.boolean(),
    details: z.unknown().optional(),
  })
  .strict();

export type SerializedError = z.infer<typeof serializedErrorSchema>;

export const generationAttemptSchema = z
  .object({
    attempt: z.number().int().positive(),
    status: z.enum(["succeeded", "failed"]),
    rawOutput: z.string().optional(),
    usage: providerUsageSchema.optional(),
    error: serializedErrorSchema.optional(),
  })
  .strict();

export type GenerationAttempt = z.infer<typeof generationAttemptSchema>;

export const runRecordSchema = z
  .object({
    id: nonEmptyString,
    scenarioId: nonEmptyString,
    scenario: scenarioSchema,
    provider: nonEmptyString,
    model: nonEmptyString,
    status: runStatusSchema,
    limits: runLimitsSchema,
    createdAt: isoTimestamp,
    startedAt: isoTimestamp.nullable(),
    completedAt: isoTimestamp.nullable(),
    error: serializedErrorSchema.nullable(),
    artifactPath: z.string().nullable(),
  })
  .strict();

export type RunRecord = z.infer<typeof runRecordSchema>;

export const roundRecordSchema = z
  .object({
    id: nonEmptyString,
    runId: nonEmptyString,
    index: z.number().int().nonnegative(),
    kind: z.enum(["input_normalization", "independent_analysis", "claim_normalization", "rebuttal", "revision"]),
    status: roundStatusSchema,
    startedAt: isoTimestamp.nullable(),
    completedAt: isoTimestamp.nullable(),
    error: serializedErrorSchema.nullable(),
  })
  .strict();

export type RoundRecord = z.infer<typeof roundRecordSchema>;

export const agentRunRecordSchema = z
  .object({
    id: nonEmptyString,
    runId: nonEmptyString,
    roundId: nonEmptyString,
    agentId: nonEmptyString,
    agentVersion: nonEmptyString,
    status: agentRunStatusSchema,
    inputHash: nonEmptyString,
    rawOutput: z.string().nullable(),
    validatedOutput: z.unknown().nullable(),
    attempts: z.array(generationAttemptSchema),
    usage: providerUsageSchema.nullable(),
    error: serializedErrorSchema.nullable(),
    startedAt: isoTimestamp.nullable(),
    completedAt: isoTimestamp.nullable(),
  })
  .strict();

export type AgentRunRecord = z.infer<typeof agentRunRecordSchema>;

export const traceEventSchema = z
  .object({
    id: nonEmptyString,
    runId: nonEmptyString,
    sequence: z.number().int().nonnegative(),
    type: nonEmptyString,
    timestamp: isoTimestamp,
    payload: z.record(z.string(), z.unknown()),
  })
  .strict();

export type TraceEvent = z.infer<typeof traceEventSchema>;

export const promptVersionSchema = z
  .object({
    agentId: nonEmptyString,
    agentVersion: nonEmptyString,
    promptPath: nonEmptyString,
    contentHash: z.string().regex(/^[a-f0-9]{64}$/u),
    content: nonEmptyString,
    createdAt: isoTimestamp,
  })
  .strict();

export type PromptVersion = z.infer<typeof promptVersionSchema>;

export const canonicalRunArtifactSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    exportedAt: isoTimestamp,
    run: runRecordSchema,
    rounds: z.array(roundRecordSchema),
    agentRuns: z.array(agentRunRecordSchema),
    claims: z.array(claimSchema),
    rebuttals: z.array(rebuttalSchema),
    revisions: z.array(revisionSchema),
    traceEvents: z.array(traceEventSchema),
  })
  .strict();

export type CanonicalRunArtifact = z.infer<typeof canonicalRunArtifactSchema>;

export const evidenceSchema = z
  .object({
    id: nonEmptyString,
    runId: nonEmptyString,
    source: nonEmptyString,
    summary: nonEmptyString,
    directlySupportsClaimIds: z.array(nonEmptyString),
    status: z.enum(["verified", "unverified", "missing"]),
  })
  .strict();

export const assumptionSchema = z
  .object({
    id: nonEmptyString,
    runId: nonEmptyString,
    text: nonEmptyString,
    ownerAgentId: nonEmptyString,
    status: z.enum(["open", "supported", "refuted"]),
  })
  .strict();

export const verdictSchema = z
  .object({
    claimId: nonEmptyString,
    decision: z.enum(["accepted", "conditional", "deferred", "rejected"]),
    rationale: nonEmptyString,
    survivingEvidence: z.array(nonEmptyString),
    unresolvedRisks: z.array(nonEmptyString),
    confidence: confidenceSchema,
  })
  .strict();

export const personaSchema = z
  .object({
    id: nonEmptyString,
    name: nonEmptyString,
    evaluationPerspective: nonEmptyString,
    traits: z.record(z.string(), nonEmptyString),
    provenance: z
      .object({
        sourcePath: nonEmptyString,
        sourceSha256: nonEmptyString,
        sourcePersonaId: nonEmptyString,
        sourceSchemaVersion: nonEmptyString,
        adapterVersion: nonEmptyString,
      })
      .strict(),
  })
  .strict();

export const cohortSchema = z
  .object({
    id: nonEmptyString,
    name: nonEmptyString,
    personaIds: z.array(nonEmptyString).min(1),
  })
  .strict();

export const personaEvaluationSchema = z
  .object({
    runId: nonEmptyString,
    personaId: nonEmptyString,
    clarity: confidenceSchema,
    trust: confidenceSchema,
    relevance: confidenceSchema,
    actionability: confidenceSchema,
    concerns: z.array(nonEmptyString),
    missingInformation: z.array(nonEmptyString),
  })
  .strict();

export const metricScoreSchema = z
  .object({
    runId: nonEmptyString,
    metric: nonEmptyString,
    value: z.number(),
    rubricVersion: nonEmptyString,
    notes: z.string(),
  })
  .strict();

export const councilTemplateSchema = z
  .object({
    id: nonEmptyString,
    name: nonEmptyString,
    agentIds: z.array(nonEmptyString).min(1),
    maxRounds: z.number().int().positive(),
  })
  .strict();

export type Evidence = z.infer<typeof evidenceSchema>;
export type Assumption = z.infer<typeof assumptionSchema>;
export type Verdict = z.infer<typeof verdictSchema>;
export type Persona = z.infer<typeof personaSchema>;
export type Cohort = z.infer<typeof cohortSchema>;
export type PersonaEvaluation = z.infer<typeof personaEvaluationSchema>;
export type MetricScore = z.infer<typeof metricScoreSchema>;
export type CouncilTemplate = z.infer<typeof councilTemplateSchema>;
