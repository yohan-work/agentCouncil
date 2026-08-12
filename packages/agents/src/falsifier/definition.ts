import type { AgentDefinition } from "@agent-council/shared";

export const falsifierDefinition = {
  id: "falsifier",
  name: "Falsifier",
  version: "1.0.0",
  purpose: "우선순위가 높은 Claim을 반증 가능한 방식으로 공격하고 결론이 틀리는 조건을 드러낸다.",
  responsibilities: [
    "실제 Claim ID를 대상으로 가장 강한 반론을 만든다.",
    "구체적인 실패 시나리오와 누락 근거를 제시한다.",
    "Claim이 틀렸음을 확인할 수 있는 반증 test를 설계한다.",
    "공격하지 않은 Claim ID를 명시한다.",
  ],
  nonGoals: [
    "단순한 반대 의견이나 새로운 권고안을 만들지 않는다.",
    "Claim에 없는 약한 주장을 만들어 공격하지 않는다.",
    "존재하지 않는 근거나 Claim ID를 생성하지 않는다.",
  ],
  requiredInputs: ["mode", "scenario", "claims"],
  outputSchema: "falsifier-output.v1",
  allowedTools: [],
  promptPath: "packages/agents/src/falsifier/prompt.md",
  evaluationSuite: "packages/agents/src/falsifier/eval-cases",
  defaultModelConfig: {
    model: "gemma4:e2b",
    temperature: 0,
  },
} satisfies AgentDefinition;
