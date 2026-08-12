import { canonicalRunArtifactSchema, type CanonicalRunArtifact } from "@agent-council/shared/browser";

export function makeWebFixtureArtifact(): CanonicalRunArtifact {
  const createdAt = "2026-08-12T05:39:40.977Z";
  const startedAt = "2026-08-12T05:39:40.988Z";
  const completedAt = "2026-08-12T05:39:42.999Z";
  const runId = "run_00379227-cbc8-4cf5-ae8e-b3aa3ef63cdb";
  const inputRoundId = "round_49618d0b-6433-4715-b67b-5757d503d6d0";
  const analysisRoundId = "round_1e549022-c3da-40c6-9e64-d468e149fb8f";
  const claimRoundId = "round_f3c27588-3304-4edb-adc8-aef6953196d2";
  const rebuttalRoundId = "round_f0ef1197-5fe7-4474-9e2c-2f03de9e5759";
  const revisionRoundId = "round_bbe990ea-62b7-4048-800c-112be5249242";
  const claimId = "claim_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const revisedClaimId = "claim_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const rebuttalId = "rebuttal_cccccccc-cccc-4ccc-8ccc-cccccccccccc";

  const claim = {
    id: claimId,
    runId,
    roundId: claimRoundId,
    authorAgentId: "analyst",
    text: "제한된 확인 범위에서는 영향이 적은 기반 작업부터 진행할 수 있다.",
    claimType: "recommendation",
    evidenceRefs: [],
    assumptions: ["누락된 노드가 핵심 상태를 정의하지 않는다"],
    confidence: 0.68,
    importance: "high",
    rationale: "확인된 범위와 미확인 범위를 분리하면 재작업을 제한할 수 있다.",
    status: "challenged",
    parentClaimId: null,
    createdAt,
  } as const;

  const afterClaim = {
    ...claim,
    id: revisedClaimId,
    roundId: revisionRoundId,
    text: "누락된 노드가 핵심 상태를 정의하지 않는다는 확인 이후에만 기반 작업을 진행한다.",
    confidence: 0.82,
    status: "revised",
    parentClaimId: claimId,
  } as const;

  return canonicalRunArtifactSchema.parse({
    schemaVersion: "1.0",
    exportedAt: completedAt,
    run: {
      id: runId,
      scenarioId: "figma-missing-nodes",
      scenario: {
        id: "figma-missing-nodes",
        title: "일부 Figma node를 확인하지 못한 구현 결정",
        problem: "일부 Figma node를 확인하지 못한 상태에서 구현을 진행해도 되는가?",
        context: "읽지 못한 node의 중요도와 대체 reference 존재 여부는 알려지지 않았다.",
        goals: ["재작업을 제한하면서 안전하게 진행한다"],
        constraints: ["미확인 디자인을 사실처럼 표현하지 않는다"],
        knownFacts: ["일부 Figma node를 현재 확인할 수 없다"],
        assumptions: ["확인 가능한 node에서 일부 기반 작업을 추출할 수 있다"],
        expectedOutput: "진행·중단 기준, 명시적 가정, 확인 계획과 반증 test",
        budget: {
          maxClaims: 8,
          maxRebuttals: 3,
          maxInputTokens: 8192,
          maxOutputTokens: 2048,
          timeoutMs: 180000,
        },
      },
      provider: "mock",
      model: "mock-model",
      status: "completed",
      limits: {
        timeoutMs: 180000,
        maxRetries: 1,
        maxInputTokens: 8192,
        maxOutputTokens: 2048,
      },
      createdAt,
      startedAt,
      completedAt,
      error: null,
      artifactPath: null,
    },
    rounds: [
      { id: inputRoundId, runId, index: 0, kind: "input_normalization", status: "completed", startedAt, completedAt, error: null },
      { id: analysisRoundId, runId, index: 1, kind: "independent_analysis", status: "completed", startedAt, completedAt, error: null },
      { id: claimRoundId, runId, index: 2, kind: "claim_normalization", status: "completed", startedAt, completedAt, error: null },
      { id: rebuttalRoundId, runId, index: 3, kind: "rebuttal", status: "completed", startedAt, completedAt, error: null },
      { id: revisionRoundId, runId, index: 4, kind: "revision", status: "completed", startedAt, completedAt, error: null },
    ],
    agentRuns: [
      {
        id: "arun_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        runId,
        roundId: analysisRoundId,
        agentId: "analyst",
        agentVersion: "1.0.0",
        status: "succeeded",
        inputHash: "a".repeat(64),
        rawOutput: JSON.stringify({ recommendation: "조건부 진행" }),
        validatedOutput: {
          problemFrame: "확인 범위와 미확인 범위를 나눈다.",
          claims: [{ ...claim, id: undefined }],
          recommendation: "조건부 진행",
          informationGaps: ["누락된 node의 중요도"],
        },
        attempts: [{ attempt: 1, status: "succeeded", rawOutput: "{}", usage: { inputTokens: 100, outputTokens: 40, durationMs: 700, estimatedCost: 0 } }],
        usage: { inputTokens: 100, outputTokens: 40, durationMs: 700, estimatedCost: 0 },
        error: null,
        startedAt,
        completedAt,
      },
      {
        id: "arun_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        runId,
        roundId: rebuttalRoundId,
        agentId: "falsifier",
        agentVersion: "1.0.0",
        status: "succeeded",
        inputHash: "b".repeat(64),
        rawOutput: JSON.stringify({ rebuttals: 1 }),
        validatedOutput: { rebuttals: [], unchallengedClaimIds: [] },
        attempts: [{ attempt: 1, status: "succeeded", rawOutput: "{}", usage: { inputTokens: 120, outputTokens: 55, durationMs: 800, estimatedCost: 0 } }],
        usage: { inputTokens: 120, outputTokens: 55, durationMs: 800, estimatedCost: 0 },
        error: null,
        startedAt,
        completedAt,
      },
      {
        id: "arun_cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        runId,
        roundId: revisionRoundId,
        agentId: "analyst",
        agentVersion: "1.0.0",
        status: "succeeded",
        inputHash: "c".repeat(64),
        rawOutput: JSON.stringify({ revisions: 1 }),
        validatedOutput: { revisions: [] },
        attempts: [{ attempt: 1, status: "succeeded", rawOutput: "{}", usage: { inputTokens: 90, outputTokens: 32, durationMs: 500, estimatedCost: 0 } }],
        usage: { inputTokens: 90, outputTokens: 32, durationMs: 500, estimatedCost: 0 },
        error: null,
        startedAt,
        completedAt,
      },
    ],
    claims: [claim, afterClaim],
    rebuttals: [
      {
        id: rebuttalId,
        runId,
        roundId: rebuttalRoundId,
        authorAgentId: "falsifier",
        targetClaimId: claimId,
        strongestCounterargument: "누락된 node가 실제 핵심 상태를 담고 있다면 기반 작업도 재작업을 만든다.",
        failureScenario: "핵심 interaction이 보이지 않은 채 구현되어 나중에 구조를 다시 만든다.",
        missingEvidence: ["누락된 node의 interaction state"],
        disconfirmingTest: "누락 node 목록을 확보하고 핵심 상태 포함 여부를 확인한다.",
        severity: "high",
        confidence: 0.79,
        createdAt,
      },
    ],
    revisions: [
      {
        id: "revision_dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        runId,
        roundId: revisionRoundId,
        claimId: claimId,
        rebuttalId,
        authorAgentId: "analyst",
        action: "conditionalize",
        before: claim,
        after: afterClaim,
        rationale: "핵심 상태 여부를 확인하는 조건을 추가한다.",
        confidence: 0.82,
        createdAt,
      },
    ],
    traceEvents: [
      { id: "trace_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", runId, sequence: 0, type: "run.created", timestamp: createdAt, payload: {} },
      { id: "trace_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", runId, sequence: 1, type: "agent.succeeded", timestamp: completedAt, payload: { agentId: "analyst" } },
    ],
  });
}
