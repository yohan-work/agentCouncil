# Socratic: Agent Council Phase 4 Agent 협업 보드

- ID: 2026-08-12-1634-agent-council-phase-04-agent-board
- 상태: 완료
- 관련 Handoff: [2026-08-12-1634-agent-council-phase-04-agent-board](../handoff/2026-08-12-1634-agent-council-phase-04-agent-board.md)

## 질문과 확인된 사실

| 질문 | 답 | 상태 | 근거 |
| --- | --- | --- | --- |
| 첫 화면에서 실행 흐름보다 사고 구조를 먼저 읽을 수 있는가? | 중앙 문제를 중심으로 Analyst와 Falsifier를 양쪽에 배치하고, 관계 카드를 그 아래에 배치했다. | 확인됨 | `apps/web/src/App.tsx`, `apps/web/src/styles.css`, Playwright full-page screenshot |
| 실제 Agent 실행을 역할 단위로 묶는가? | `agentId`로 AgentRun을 묶고 Analyst의 analysis/revision phase를 하나의 카드 안에 보존한다. | 확인됨 | `apps/web/src/agent-board-model.ts`, `tests/web/agent-board-model.test.ts` |
| Claim 수와 수정 자식 Claim을 혼동하지 않는가? | 기본 집계는 `parentClaimId === null`만 사용하고, 전체 record는 Agent 통계와 관계에 보존한다. | 확인됨 | `buildAgentBoardModel`, `RunSummaryHeader`, model test |
| Claim → Rebuttal → Revision 관계를 한눈에 확인할 수 있는가? | 연결된 세 record를 한 카드의 세 단계로 렌더링하며, 누락된 연결도 빈 칸·경고로 유지한다. | 확인됨 | `RelationshipCard`, `buildRelationships`, missing-reference test |
| 세부 output이 첫 화면을 압도하지 않는가? | Agent/관계 선택 시 Inspector가 열리고 raw/validated JSON과 timeline/trace는 접힌 상세 영역에 둔다. | 확인됨 | `AgentDetailPanel`, `ExecutionDetails`, Playwright Analyst selection |
| 브라우저에서 Node 전용 loader를 피하는가? | 표시 메타데이터를 별도 browser-safe 모듈로 분리하고 shared browser export만 import한다. | 확인됨 | `apps/web/src/agent-metadata.ts`, `App.tsx`, `pnpm web:build` |
| 기존 API와 artifact 경계를 보존하는가? | `GET /api/runs`, `GET /api/runs/:runId`, canonical schema와 read-only 동작을 변경하지 않았다. | 확인됨 | `apps/web/server/artifact-store.ts`, API tests, full test suite |
| 실제 로컬 화면에서 읽기 쉬운가? | 실행 중인 localhost에서 `gemma4:e2b` artifact를 열고 보드 및 Analyst Inspector를 확인·캡처했다. | 확인됨 | `curl`, Playwright snapshot, `output/playwright/phase-4-agent-board-analyst.png` |

## 판단

- 확인됨: Phase 4의 핵심은 더 많은 로그가 아니라 실제 Agent 역할과 판단 변화의 시각적 관계이며, 현재 실행된 Analyst/Falsifier를 중심으로 구현되었다.
- 확인됨: 320px 이상 responsive 규칙에서 데스크톱 양측 배치가 태블릿 2열, 모바일 세로 순서로 전환된다.
- 추론: 향후 Agent 수가 늘어나면 양측 lane을 무한히 확장하기보다 현재 실행된 Agent만 핵심 lane에 두고 나머지는 Additional agents로 제공하는 방식이 인지 부하를 낮춘다.
- 미확인: Judge/Persona/baseline이 추가될 때 중앙 문제와 관계 카드가 동일한 밀도를 유지할지, 실제 사용자 평가가 필요한 상태다.

## 다음 계획

1. Judge/Persona/baseline schema와 artifact export 계약을 정의한다 — 근거/의존성: `packages/shared/src/domain.ts`, Phase 0~2 제외 범위 — 확인 방법: schema/API contract test.
2. 새 평가 결과를 Agent board의 별도 evidence/verdict lane으로 연결한다 — 근거/의존성: `AgentBoardModel` relationship boundary — 확인 방법: model test와 fixture.
3. 실제 사용자 3개 scenario에서 관계 카드의 요약 문구와 누락 상태를 검토한다 — 근거/의존성: 현재 mock/live artifact 목록 — 확인 방법: Playwright screenshot review와 짧은 사용성 체크.

## 중단 또는 방향 전환 조건

- canonical artifact를 확장하지 않고 UI가 임의로 verdict나 점수를 추정해야 하는 요구가 나오면 구현을 중단하고 schema/API 계약부터 재설계한다.
- Agent 수가 늘어 양측 보드가 768px 이상에서도 읽히지 않으면 핵심 lane과 Additional agents 분리 기준을 재검토한다.
