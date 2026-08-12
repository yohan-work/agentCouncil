# 현재 목표

- 상태: 완료
- 마지막 갱신: 2026-08-12 16:34 KST
- 현재 작업 단위: Agent Council Phase 4 Agent 협업 보드 시각화

## 목표와 성공 기준

- 목표: 기존 timeline-first Run detail을 중앙 문제와 실제 실행 Agent의 역할·관계가 먼저 보이는 읽기 전용 협업 보드로 전환한다.
- 성공 기준: canonical artifact 하나로 중앙 문제, Analyst/Falsifier 카드, `Claim → Rebuttal → Revision` 관계, Agent/관계 Inspector, 접힌 실행 상세를 확인하고 lint/typecheck/test/build/web smoke를 통과한다.

## 범위와 확정된 결정

- 포함: `AgentBoardModel`, browser-safe Agent metadata, 요약 우선 협업 보드, responsive 양측 Agent 레이아웃, 관계 선택 Inspector, missing-reference 경고, 접힌 Execution details, web/model/browser tests와 문서 갱신.
- 제외: Judge verdict, Persona Panel, baseline 비교, 실시간 streaming, artifact 편집·재실행, 인증·원격 배포, 아직 실행되지 않은 6-Agent placeholder.
- 결정: 브라우저의 데이터 원천은 기존 `canonicalRunArtifact`와 API 계약으로 유지한다. Node 전용 `packages/agents` 로더는 import하지 않고 `apps/web/src/agent-metadata.ts`를 사용한다.
- 결정: 기본 Claim 수는 `parentClaimId === null`인 원 주장만 집계하고, 수정된 자식 Claim은 관계/record로 보존한다.
- 결정: Agent 카드 클릭은 Agent Inspector, 관계 카드 클릭은 Claim/Rebuttal/Revision Inspector로 분리하며 timeline은 2차 접힘 영역으로 유지한다.

## 현재 상태

- 완료: `apps/web/src/agent-board-model.ts`에서 AgentRun grouping, 역할 요약, 관계 매핑, action count와 missing-reference 경고를 생성한다.
- 완료: `apps/web/src/App.tsx`와 `apps/web/src/styles.css`를 중앙 문제·양측 Agent·관계 카드·Inspector 중심으로 개편하고 320px~desktop responsive 규칙을 추가했다.
- 완료: `tests/web/agent-board-model.test.ts`, `tests/web/App.test.tsx`에 grouping, relationship, missing reference, Agent/관계 선택 상호작용을 추가했다.
- 완료: `docs/visualization.md`, `docs/implementation-plan.md`, `README.md`를 Phase 4 보드 기준으로 갱신했다.
- 검증됨: `pnpm lint`, `pnpm typecheck`, `pnpm test`(24개), `pnpm web:test`(7개), `pnpm build`, `pnpm web:build`, localhost curl 및 Playwright에서 실제 `gemma4:e2b` 보드·Analyst Inspector 캡처를 통과했다.
- 미검증: 배포 환경과 전체 6-Agent/Judge/Persona 확장은 다음 Phase 범위다.

## 마지막 체크포인트

- Handoff: [2026-08-12-1634-agent-council-phase-04-agent-board](../handoff/2026-08-12-1634-agent-council-phase-04-agent-board.md)
- Socratic: [2026-08-12-1634-agent-council-phase-04-agent-board](../socratic/2026-08-12-1634-agent-council-phase-04-agent-board.md)

## 재개 지점

1. `docs/visualization.md`와 최신 Handoff를 읽고, 다음 Phase에서 Judge/Persona/baseline을 canonical artifact schema와 API 경계 안에 추가한다.
2. 새 artifact record가 추가되면 `buildAgentBoardModel`의 grouping·관계·집계 테스트와 Playwright smoke를 먼저 확장한다.
