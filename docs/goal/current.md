# 현재 목표

- 상태: 완료
- 마지막 갱신: 2026-08-12 15:16 KST
- 현재 작업 단위: Agent Council Phase 3 로컬 Run detail 시각화

## 목표와 성공 기준

- 목표: 기존 canonical run artifact를 localhost에서 읽기 전용으로 탐색할 수 있는 실행 흐름 시각화를 제공한다.
- 성공 기준: React/Vite 화면에서 Run summary, 5단계 timeline, 선택 단계 상세, Claim → Rebuttal → Revision lineage를 확인하고, artifact API와 build/test/browser smoke가 통과한다.

## 범위와 확정된 결정

- 포함: Phase 0~2 전체 구현, React/Vite `apps/web`, validated artifact API, Run detail timeline, 단계별 상세 패널, Claim lineage, web/unit/integration/browser smoke 검증.
- 제외: Judge verdict, Persona Panel, 전체 6-agent council, baseline 비교, 실시간 streaming, artifact 편집·재실행, 인증·원격 배포.
- 결정: `gemma4:e2b`를 기본 모델로 사용하고 concurrency를 1로 고정하며 독립성은 별도 호출과 컨텍스트 격리로 보장한다. 비용은 provider usage에 항상 `estimatedCost: 0`으로 기록한다.
- 결정: 웹은 React + Vite localhost 서버로 실행하고, 브라우저 데이터 원천은 SQLite가 아닌 `canonicalRunArtifact` JSON으로 제한한다. `packages/shared/src/browser.ts`로 Node crypto 의존성을 브라우저 bundle에서 제외한다.

## 현재 상태

- 완료: `docs/reference-audit.md`, `docs/reference-inventory.csv`, 아키텍처·도메인·평가·구현 계획, 8개 workspace/package, SQLite repository, 중앙 structured-output retry/timeout/cancel, Mock/Ollama provider, CLI, Analyst → Falsifier → Revision 상태 머신, 6개 eval fixture와 테스트를 구현했다.
- 완료: mock `doctor`/run/eval, 실제 `gemma4:e2b` Ollama `doctor`, Phase 2 3개 live eval(EC-01~03)이 모두 통과했다.
- 완료: `apps/web`의 React/Vite 화면, `GET /api/runs`, `GET /api/runs/:runId`, 빈 목록·오류 상태, timeline/detail/lineage UI와 web tests를 구현했다.
- 완료: `pnpm lint`, `pnpm typecheck`, `pnpm test`(22개), `pnpm web:test`(5개), `pnpm build`, `pnpm web:build`, localhost API 및 Playwright browser smoke가 통과했다.
- 차단 요인 또는 미검증: Judge/Persona Panel, 전체 6-agent council, baseline 비교와 원격 배포는 다음 Phase 범위다.

## 마지막 체크포인트

- Handoff: [2026-08-12-1516-agent-council-phase-03-visualization](../handoff/2026-08-12-1516-agent-council-phase-03-visualization.md)
- Socratic: [2026-08-12-1516-agent-council-phase-03-visualization](../socratic/2026-08-12-1516-agent-council-phase-03-visualization.md)

## 재개 지점

1. 다음 Phase에서 Judge/Persona/baseline을 추가할 경우 `docs/visualization.md`의 read-only artifact 경계를 유지하고, 기존 canonical artifact schema를 먼저 확장한다.
