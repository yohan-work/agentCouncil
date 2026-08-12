# Socratic: Agent Council Phase 3 로컬 Run detail 시각화

- ID: 2026-08-12-1516-agent-council-phase-03-visualization
- 상태: 완료
- 관련 Handoff: [2026-08-12-1516-agent-council-phase-03-visualization](../handoff/2026-08-12-1516-agent-council-phase-03-visualization.md)

## 질문과 확인된 사실

| 질문 | 답 | 상태 | 근거 |
| --- | --- | --- | --- |
| UI가 기존 결과와 같은 계약을 사용하는가? | 브라우저는 `canonicalRunArtifactSchema`로 검증된 JSON만 읽고, SQLite나 모델을 직접 호출하지 않는다. | 확인됨 | `apps/web/server/artifact-store.ts`, `apps/web/src/api.ts`, `packages/shared/src/domain.ts` |
| 여러 Run을 확인할 수 있는가? | `GET /api/runs`가 valid artifact summary를 생성일 내림차순으로 반환하고 selector가 최신 Run을 기본 선택한다. | 확인됨 | `apps/web/server/artifact-store.ts`, `apps/web/src/App.tsx`, localhost curl smoke |
| 실행 흐름과 판단 변화가 보이는가? | 5단계 timeline과 단계별 상세, Claim → Rebuttal → Revision 카드 및 before/after가 제공된다. | 확인됨 | `apps/web/src/App.tsx`, `apps/web/src/styles.css`, Playwright snapshot |
| 잘못된 입력과 경로 조작을 제한하는가? | `run_` UUID filename만 허용하고 JSON/schema 오류와 path traversal을 404/422로 처리하며 API는 GET만 허용한다. | 확인됨 | `apps/web/server/artifact-store.ts`, `tests/web/artifact-store.test.ts` |
| 브라우저 bundle이 reference나 Node-only crypto를 포함하지 않는가? | browser 전용 shared export를 사용했고 `dist/web`에서 `MatrAIx`, `refer/MatrAIx`, `/refer/` 문자열을 찾지 못했다. | 확인됨 | `packages/shared/src/browser.ts`, `pnpm web:build`, `rg -n "MatrAIx|refer/MatrAIx|/refer/" dist/web` |
| 실제 localhost에서 화면이 동작하는가? | Vite 서버가 HTML과 API를 제공했고, Playwright에서 Run selector·5 stages·Rebuttal 상세를 확인했다. | 확인됨 | `pnpm dev`, `curl`, `output/playwright/phase-3-run-detail.png`, Playwright snapshot |

## 판단

- 확인됨: Phase 3의 목표인 실행 흐름 중심 read-only Run detail 시각화가 구현되었다.
- 추론: 현재 artifact 계약만으로도 Judge/Persona가 추가되기 전까지 핵심 판단 변화의 설명 가능성을 확보할 수 있다.
- 미확인: 장기적으로 Run 비교·baseline 지표가 추가될 때 현재 카드 레이아웃이 충분한지와 대규모 artifact 성능.

## 다음 계획

1. 다음 Phase에서 Verdict/Persona/비교 지표를 canonical artifact에 추가하고 같은 API 검증 경계를 확장한다 — 근거/의존성: `packages/shared/src/domain.ts`, `apps/web/server/artifact-store.ts` — 확인 방법: 새 schema migration, API contract test, UI regression.

## 중단 또는 방향 전환 조건

- artifact 크기나 Run 수가 커져 API 전체 JSON 전송 또는 card 렌더링이 느려지면 pagination, summary/detail 분리, virtualization을 먼저 도입한다.
