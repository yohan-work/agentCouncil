import {
  normalizeClaims,
  normalizeRebuttals,
  normalizeRevisions,
  prioritizeClaims,
} from "@agent-council/core";
import type { ClaimDraft } from "@agent-council/shared";
import { describe, expect, it } from "vitest";

const drafts: ClaimDraft[] = [
  {
    text: "Critical unsupported claim",
    claimType: "recommendation",
    evidenceRefs: [],
    assumptions: ["unknown"],
    confidence: 0.9,
    importance: "critical",
    rationale: "Important",
  },
  {
    text: "Low supported claim",
    claimType: "fact",
    evidenceRefs: ["fact:0"],
    assumptions: [],
    confidence: 0.8,
    importance: "low",
    rationale: "Input fact",
  },
];

describe("Claim lineage normalization", () => {
  it("assigns IDs and prioritizes critical weakly grounded claims", () => {
    const claims = normalizeClaims({
      drafts,
      runId: "run_test",
      roundId: "round_test",
      authorAgentId: "analyst",
      maximum: 10,
      createdAt: "2026-08-12T00:00:00.000Z",
    });

    expect(claims[0]?.id).toMatch(/^claim_/u);
    expect(prioritizeClaims(claims, 1)[0]?.text).toBe("Critical unsupported claim");
  });

  it("rejects a Rebuttal that targets an unknown Claim", () => {
    const claims = normalizeClaims({
      drafts,
      runId: "run_test",
      roundId: "round_test",
      authorAgentId: "analyst",
      maximum: 10,
    });
    expect(() =>
      normalizeRebuttals({
        drafts: [
          {
            targetClaimId: "claim_missing",
            strongestCounterargument: "Counter",
            failureScenario: "Failure",
            missingEvidence: [],
            disconfirmingTest: "Observe failure",
            severity: "high",
            confidence: 0.8,
          },
        ],
        allowedClaims: claims,
        runId: "run_test",
        roundId: "round_rebuttal",
        authorAgentId: "falsifier",
      }),
    ).toThrow(/unknown Claim/u);
  });

  it("requires revised text only for narrowing or conditionalizing", () => {
    const claims = normalizeClaims({
      drafts: drafts.slice(0, 1),
      runId: "run_test",
      roundId: "round_test",
      authorAgentId: "analyst",
      maximum: 10,
    });
    const claim = claims[0];
    expect(claim).toBeDefined();
    if (!claim) {
      return;
    }
    const rebuttals = normalizeRebuttals({
      drafts: [
        {
          targetClaimId: claim.id,
          strongestCounterargument: "Counter",
          failureScenario: "Failure",
          missingEvidence: [],
          disconfirmingTest: "Observe failure",
          severity: "high",
          confidence: 0.8,
        },
      ],
      allowedClaims: claims,
      runId: "run_test",
      roundId: "round_rebuttal",
      authorAgentId: "falsifier",
    });
    const rebuttal = rebuttals[0];
    expect(rebuttal).toBeDefined();
    if (!rebuttal) {
      return;
    }
    expect(() =>
      normalizeRevisions({
        drafts: [
          {
            claimId: claim.id,
            rebuttalId: rebuttal.id,
            action: "maintain",
            revisedText: "This should be null",
            rationale: "Invalid",
            confidence: 0.8,
          },
        ],
        claims,
        rebuttals,
        runId: "run_test",
        roundId: "round_revision",
        authorAgentId: "analyst",
      }),
    ).toThrow(/invalid revisedText/u);
  });
});
