import type {
  Claim,
  ClaimDraft,
  Rebuttal,
  RebuttalDraft,
  Revision,
  RevisionDraft,
} from "@agent-council/shared";
import {
  claimSchema,
  createId,
  nowIso,
  rebuttalSchema,
  revisionSchema,
} from "@agent-council/shared";

const importanceWeight: Record<Claim["importance"], number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

export function normalizeClaims(options: {
  drafts: ClaimDraft[];
  runId: string;
  roundId: string;
  authorAgentId: string;
  maximum: number;
  createdAt?: string;
}): Claim[] {
  const createdAt = options.createdAt ?? nowIso();
  return options.drafts.slice(0, options.maximum).map((draft) =>
    claimSchema.parse({
      id: createId("claim"),
      runId: options.runId,
      roundId: options.roundId,
      authorAgentId: options.authorAgentId,
      ...draft,
      status: "proposed",
      parentClaimId: null,
      createdAt,
    }),
  );
}

export function prioritizeClaims(claims: Claim[], maximum: number): Claim[] {
  return [...claims]
    .sort((left, right) => {
      const importanceDifference = importanceWeight[right.importance] - importanceWeight[left.importance];
      if (importanceDifference !== 0) {
        return importanceDifference;
      }
      const leftEvidencePenalty = left.evidenceRefs.length === 0 ? 1 : 0;
      const rightEvidencePenalty = right.evidenceRefs.length === 0 ? 1 : 0;
      const weakEvidenceDifference = rightEvidencePenalty - leftEvidencePenalty;
      if (weakEvidenceDifference !== 0) {
        return weakEvidenceDifference;
      }
      return right.confidence - left.confidence;
    })
    .slice(0, maximum);
}

export function normalizeRebuttals(options: {
  drafts: RebuttalDraft[];
  allowedClaims: Claim[];
  runId: string;
  roundId: string;
  authorAgentId: string;
  createdAt?: string;
}): Rebuttal[] {
  const allowedIds = new Set(options.allowedClaims.map((claim) => claim.id));
  const seenIds = new Set<string>();
  const createdAt = options.createdAt ?? nowIso();
  return options.drafts.map((draft) => {
    if (!allowedIds.has(draft.targetClaimId)) {
      throw new Error(`Falsifier referenced unknown Claim ${draft.targetClaimId}.`);
    }
    if (seenIds.has(draft.targetClaimId)) {
      throw new Error(`Falsifier returned more than one Rebuttal for ${draft.targetClaimId}.`);
    }
    seenIds.add(draft.targetClaimId);
    return rebuttalSchema.parse({
      id: createId("rebuttal"),
      runId: options.runId,
      roundId: options.roundId,
      authorAgentId: options.authorAgentId,
      ...draft,
      createdAt,
    });
  });
}

export function normalizeRevisions(options: {
  drafts: RevisionDraft[];
  claims: Claim[];
  rebuttals: Rebuttal[];
  runId: string;
  roundId: string;
  authorAgentId: string;
  createdAt?: string;
}): Revision[] {
  const claimById = new Map(options.claims.map((claim) => [claim.id, claim]));
  const rebuttalById = new Map(options.rebuttals.map((rebuttal) => [rebuttal.id, rebuttal]));
  const seenClaimIds = new Set<string>();
  const createdAt = options.createdAt ?? nowIso();

  return options.drafts.map((draft) => {
    const before = claimById.get(draft.claimId);
    const rebuttal = rebuttalById.get(draft.rebuttalId);
    if (!before) {
      throw new Error(`Analyst revision referenced unknown Claim ${draft.claimId}.`);
    }
    if (!rebuttal || rebuttal.targetClaimId !== draft.claimId) {
      throw new Error(`Rebuttal ${draft.rebuttalId} does not target Claim ${draft.claimId}.`);
    }
    if (seenClaimIds.has(draft.claimId)) {
      throw new Error(`Analyst returned more than one Revision for ${draft.claimId}.`);
    }
    seenClaimIds.add(draft.claimId);

    const requiresText = draft.action === "narrow" || draft.action === "conditionalize";
    if (requiresText !== (draft.revisedText !== null)) {
      throw new Error(`Revision action ${draft.action} has an invalid revisedText value.`);
    }

    const after = requiresText
      ? claimSchema.parse({
          ...before,
          id: createId("claim"),
          roundId: options.roundId,
          text: draft.revisedText,
          confidence: draft.confidence,
          status: "revised",
          parentClaimId: before.id,
          createdAt,
        })
      : null;

    return revisionSchema.parse({
      id: createId("revision"),
      runId: options.runId,
      roundId: options.roundId,
      claimId: before.id,
      rebuttalId: rebuttal.id,
      authorAgentId: options.authorAgentId,
      action: draft.action,
      before,
      after,
      rationale: draft.rationale,
      confidence: draft.confidence,
      createdAt,
    });
  });
}
