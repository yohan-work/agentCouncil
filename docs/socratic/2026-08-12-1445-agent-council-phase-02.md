# Socratic: Agent Council Phase 0~2 구현

- ID: 2026-08-12-1445-agent-council-phase-02
- 상태: 완료
- 관련 Handoff: [2026-08-12-1445-agent-council-phase-02](../handoff/2026-08-12-1445-agent-council-phase-02.md)

## 질문과 확인된 사실

| 질문 | 답 | 상태 | 근거 |
| --- | --- | --- | --- |
| Reference를 런타임에 그대로 연결하지 않고 감사할 수 있는가? | `refer/` 2,691개 파일을 `REUSE/ADAPT/IGNORE` inventory로 생성했고 결과는 238/589/1,864개다. | 확인됨 | `scripts/reference-inventory.mjs`, `docs/reference-inventory.csv`, `pnpm reference:scan` |
| 무료 단일 모델 운영 경계를 코드로 보장하는가? | 기본 모델은 `gemma4:e2b`, Ollama `/api/chat` 단일 provider, 상태 머신의 세 호출은 순차 실행하며 `estimatedCost`는 0이다. | 확인됨 | `.env.example`, `packages/providers/src/ollama-provider.ts`, `packages/core/src/council-runner.ts` |
| 구조화 출력 실패가 재현·기록되는가? | JSON/Zod 실패를 attempt trace에 남기고 최대 1회 재시도하며, 두 번 실패하면 AgentRun/Run을 실패로 기록한다. | 확인됨 | `packages/providers/src/structured-generation.ts`, `tests/integration/council-runner.test.ts` |
| 성공 결과가 replay 가능한 canonical artifact인가? | Run, Round, AgentRun, Claim, Rebuttal, Revision, trace를 SQLite에 저장하고 JSON artifact를 export/replay한다. | 확인됨 | `packages/database/src/repository.ts`, `apps/cli/src/index.ts`, `tests/integration/council-runner.test.ts` |
| 실제 로컬 모델이 Phase 2 계약을 만족하는가? | Ollama 0.32.8에서 `gemma4:e2b`가 확인됐고 doctor smoke 및 EC-01~03 live eval이 모두 통과했다. | 확인됨 | `node dist/cli/index.js doctor`, `node dist/cli/index.js eval --provider ollama` |

## 판단

- 확인됨: Phase 0~2의 문서·실행 기반·Analyst → Falsifier → Revision vertical slice와 평가 계약이 구현되었다.
- 추론: M2 Pro 32GB 환경에서는 `keep_alive=15m`, `concurrency=1`, 모델 단일화가 현재 범위의 안정적인 무료 기본값이다.
- 미확인: Judge/Persona/UI를 포함하는 Phase 3 이후의 제품 가치와 전체 6-agent 비용·품질 곡선.

## 다음 계획

1. Phase 3를 시작할 때 canonical artifact와 `AgentRegistry`를 기준으로 Judge 또는 UI를 추가한다 — 근거/의존성: `docs/implementation-plan.md`의 제외 범위 — 확인 방법: 새 agent eval과 replay schema test.

## 중단 또는 방향 전환 조건

- Ollama 단일 호출이 M2 Pro에서 반복적으로 timeout하거나 live eval의 구조화 출력 실패율이 기준을 넘으면 context/output token 및 prompt를 먼저 조정하고, 모델 병렬화는 별도 성능 근거가 있을 때만 검토한다.
