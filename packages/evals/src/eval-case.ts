import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import type { CanonicalRunArtifact } from "@agent-council/shared";
import { canonicalRunArtifactSchema, scenarioSchema } from "@agent-council/shared";
import { z } from "zod";

export const evalCaseSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    phase2: z.boolean(),
    scenario: scenarioSchema,
    rubric: z
      .object({
        mustFindRisks: z.array(z.string().min(1)),
        forbiddenAssertions: z.array(z.string().min(1)),
        minimumClaimCount: z.number().int().positive(),
        minimumRebuttalCount: z.number().int().positive(),
        requiredRebuttalFields: z.array(z.string().min(1)),
        allowedConclusions: z.array(z.string().min(1)),
      })
      .strict(),
  })
  .strict();

export type EvalCase = z.infer<typeof evalCaseSchema>;

export type EvalCheck = {
  id: string;
  passed: boolean;
  message: string;
};

export type ArtifactEvaluation = {
  caseId: string;
  passed: boolean;
  checks: EvalCheck[];
};

export function loadEvalCase(path: string): EvalCase {
  return evalCaseSchema.parse(JSON.parse(readFileSync(resolve(path), "utf8")) as unknown);
}

export function listEvalCases(directory = resolve("data/eval-cases")): EvalCase[] {
  return readdirSync(directory)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => loadEvalCase(join(directory, name)));
}

export function evaluateArtifact(input: unknown, evalCase: EvalCase): ArtifactEvaluation {
  const artifact: CanonicalRunArtifact = canonicalRunArtifactSchema.parse(input);
  const claimIds = new Set(artifact.claims.map((claim) => claim.id));
  const rebuttalIds = new Set(artifact.rebuttals.map((rebuttal) => rebuttal.id));
  const revisedParentIds = new Set(
    artifact.claims.flatMap((claim) => (claim.parentClaimId ? [claim.parentClaimId] : [])),
  );
  const checks: EvalCheck[] = [
    {
      id: "run_completed",
      passed: artifact.run.status === "completed",
      message: `Run status is ${artifact.run.status}.`,
    },
    {
      id: "minimum_claims",
      passed: artifact.claims.length >= evalCase.rubric.minimumClaimCount,
      message: `${artifact.claims.length} Claim records were stored.`,
    },
    {
      id: "minimum_rebuttals",
      passed: artifact.rebuttals.length >= evalCase.rubric.minimumRebuttalCount,
      message: `${artifact.rebuttals.length} Rebuttals were stored.`,
    },
    {
      id: "valid_rebuttal_targets",
      passed: artifact.rebuttals.every((rebuttal) => claimIds.has(rebuttal.targetClaimId)),
      message: "Every Rebuttal must target a stored Claim.",
    },
    {
      id: "rebuttal_contract",
      passed: artifact.rebuttals.every(
        (rebuttal) =>
          rebuttal.strongestCounterargument.length > 0 &&
          rebuttal.failureScenario.length > 0 &&
          rebuttal.disconfirmingTest.length > 0,
      ),
      message: "Every Rebuttal must contain a counterargument, failure scenario, and test.",
    },
    {
      id: "revision_coverage",
      passed:
        artifact.revisions.length === artifact.rebuttals.length &&
        artifact.revisions.every(
          (revision) => claimIds.has(revision.claimId) && rebuttalIds.has(revision.rebuttalId),
        ),
      message: "Every Rebuttal must have one traceable Revision.",
    },
    {
      id: "revision_lineage",
      passed: artifact.revisions.every(
        (revision) =>
          revision.after === null ||
          (revision.after.parentClaimId === revision.before.id && revisedParentIds.has(revision.before.id)),
      ),
      message: "Revised Claims must point to their original Claim.",
    },
    {
      id: "usage_visible",
      passed:
        artifact.agentRuns.length === 3 &&
        artifact.agentRuns.every(
          (agentRun) => agentRun.usage !== null && agentRun.usage.estimatedCost === 0,
        ),
      message: "All three AgentRuns must expose local usage and zero estimated cost.",
    },
  ];
  return {
    caseId: evalCase.id,
    passed: checks.every((check) => check.passed),
    checks,
  };
}
