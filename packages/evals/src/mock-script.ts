import type { Claim, GenerationRequest, Rebuttal } from "@agent-council/shared";
import { claimSchema, rebuttalSchema, scenarioSchema } from "@agent-council/shared";
import { MockProvider } from "@agent-council/providers";
import type { MockStep } from "@agent-council/providers";
import { z } from "zod";

const falsifierInputSchema = z
  .object({
    mode: z.literal("falsification"),
    scenario: scenarioSchema,
    claims: z.array(claimSchema),
  })
  .strict();

const revisionInputSchema = z
  .object({
    mode: z.literal("revision"),
    pairs: z.array(z.object({ claim: claimSchema, rebuttal: rebuttalSchema }).strict()),
  })
  .strict();

function mockAnalystOutput(request: GenerationRequest<unknown>): unknown {
  const input = z.object({ mode: z.literal("analysis"), scenario: scenarioSchema }).parse(request.input);
  return {
    problemFrame: `${input.scenario.title} 결정은 목표 달성뿐 아니라 제약, 운영 비용과 실패 조건을 함께 비교해야 한다.`,
    claims: [
      {
        text: "핵심 미확인 정보가 검증되기 전에는 되돌리기 어려운 전체 투자를 승인하지 않아야 한다.",
        claimType: "recommendation",
        evidenceRefs: [],
        assumptions: input.scenario.assumptions,
        confidence: 0.82,
        importance: "critical",
        rationale: "현재 입력에는 최종 투자 판단에 필요한 비용·운영·위험 정보가 충분하지 않다.",
      },
      {
        text: "가장 비용이 낮은 제한적 실험으로 핵심 가정을 먼저 반증해야 한다.",
        claimType: "recommendation",
        evidenceRefs: [],
        assumptions: ["제한적이고 되돌릴 수 있는 실험을 설계할 수 있다."],
        confidence: 0.74,
        importance: "high",
        rationale: "전체 실행 전에 관찰 가능한 결과를 얻으면 잘못된 확신과 재작업을 줄일 수 있다.",
      },
    ],
    recommendation: "결정을 조건부로 보류하고 핵심 가정을 확인하는 작은 실험을 먼저 실행한다.",
    informationGaps: ["비용 상한", "운영 책임자", "실패 판정 기준"],
  };
}

function mockFalsifierOutput(request: GenerationRequest<unknown>): unknown {
  const input = falsifierInputSchema.parse(request.input);
  return {
    rebuttals: input.claims.map((claim: Claim, index) => ({
      targetClaimId: claim.id,
      strongestCounterargument:
        index === 0
          ? "정보가 완전하지 않다는 이유로 모든 투자를 늦추면 이미 확인된 기회비용과 긴급성을 과소평가할 수 있다."
          : "작은 실험의 결과가 실제 규모의 운영 복잡성을 대표하지 못하면 오히려 잘못된 확신을 만들 수 있다.",
      failureScenario:
        index === 0
          ? "결정 지연 비용이 검증 비용보다 큰 상황에서 경쟁 기회나 필수 일정을 놓친다."
          : "prototype은 성공하지만 실제 사용자·데이터·장애 조건에서 비용과 위험이 급증한다.",
      missingEvidence: ["결정 지연 비용", "실험과 실제 환경의 대표성"],
      disconfirmingTest:
        index === 0
          ? "48시간 내 결정 지연 비용을 산정하고 그 값이 예상 실패 손실보다 크면 보류 Claim을 축소한다."
          : "실제 부하와 운영 조건을 포함한 pilot에서 사전 한계를 초과하면 작은 실험만으로 충분하다는 Claim을 기각한다.",
      severity: "high",
      confidence: 0.78,
    })),
    unchallengedClaimIds: [],
  };
}

function mockRevisionOutput(request: GenerationRequest<unknown>): unknown {
  const input = revisionInputSchema.parse(request.input);
  return {
    revisions: input.pairs.map((pair: { claim: Claim; rebuttal: Rebuttal }, index) => ({
      claimId: pair.claim.id,
      rebuttalId: pair.rebuttal.id,
      action: index === 0 ? "conditionalize" : "narrow",
      revisedText:
        index === 0
          ? "결정 지연 비용이 예상 실패 손실보다 작을 때에만 핵심 정보 검증 전 전체 투자를 보류한다."
          : "실제 부하와 운영 조건을 포함한 제한적 pilot으로 핵심 가정을 먼저 반증한다.",
      rationale: "반박이 원 Claim의 적용 범위와 실험 대표성 조건을 구체화했다.",
      confidence: 0.76,
    })),
  };
}

export function createDefaultMockSteps(): MockStep[] {
  return [
    { agentId: "analyst", output: mockAnalystOutput },
    { agentId: "falsifier", output: mockFalsifierOutput },
    { agentId: "analyst", output: mockRevisionOutput },
  ];
}

export function createDefaultMockProvider(): MockProvider {
  return new MockProvider(createDefaultMockSteps());
}
