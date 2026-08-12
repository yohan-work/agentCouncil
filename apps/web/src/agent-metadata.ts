export type AgentMetadata = {
  displayName: string;
  role: string;
  purpose: string;
  responsibilities: string[];
  nonGoals: string[];
  icon: string;
  accent: "blue" | "red" | "purple" | "green" | "orange";
};

/**
 * Browser-safe presentation metadata.
 *
 * The runtime agent definitions intentionally stay in the Node-only agents
 * package because they load prompt files from disk. The visualization only
 * needs this small, stable display contract.
 */
export const agentMetadata: Record<string, AgentMetadata> = {
  analyst: {
    displayName: "Analyst",
    role: "구조화 · 수정",
    purpose: "문제를 Claim으로 구조화하고 반박 이후의 수정안을 만듭니다.",
    responsibilities: ["Problem framing", "Claim drafting", "Revision decision"],
    nonGoals: ["반박을 대신 판단하지 않음", "확인되지 않은 사실을 증명하지 않음"],
    icon: "A",
    accent: "blue",
  },
  falsifier: {
    displayName: "Falsifier",
    role: "반증 · 공격",
    purpose: "각 Claim의 실패 조건과 가장 강한 반론을 찾아냅니다.",
    responsibilities: ["Counterargument", "Failure scenario", "Disconfirming test"],
    nonGoals: ["대안을 최종 승인하지 않음", "근거 없는 반론을 확대하지 않음"],
    icon: "F",
    accent: "red",
  },
};

export function getAgentMetadata(agentId: string): AgentMetadata {
  return (
    agentMetadata[agentId] ?? {
      displayName: agentId,
      role: "참여 Agent",
      purpose: "이 실행에서 생성된 기록과 연결된 Agent입니다.",
      responsibilities: [],
      nonGoals: [],
      icon: agentId.slice(0, 1).toUpperCase() || "?",
      accent: "purple",
    }
  );
}
