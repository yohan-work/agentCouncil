# 현재 목표

- 상태: 완료
- 마지막 갱신: 2026-08-12 14:46 KST
- 현재 작업 단위: Agent Council Phase 0~2 구현

## 목표와 성공 기준

- 목표: MatrAIx reference를 감사하고, 무료 로컬 Ollama 기반의 Agent Council 실행 기반과 Analyst → Falsifier vertical slice를 구현한다.
- 성공 기준: Phase 0 문서가 근거를 포함하고, mock provider로 전체 상태 머신을 재현하며, SQLite에 성공·실패 trace가 저장되고, lint/typecheck/test/build와 Phase 2 live gate가 통과한다.

## 범위와 확정된 결정

- 포함: reference audit, 아키텍처·도메인·평가 문서, TypeScript workspace, Zod schema, Registry, SQLite/Drizzle, Mock/Ollama provider, CLI, Analyst/Falsifier/Revision, 초기 eval case.
- 제외: Web UI, Persona Panel, Judge를 포함한 전체 Council, 외부 검색 도구, 유료 API, 다중 모델 병렬 비교.
- 결정: `gemma4:e2b`를 기본 모델로 사용하고 concurrency를 1로 고정하며 독립성은 별도 호출과 컨텍스트 격리로 보장한다. 비용은 provider usage에 항상 `estimatedCost: 0`으로 기록한다.

## 현재 상태

- 완료: `docs/reference-audit.md`, `docs/reference-inventory.csv`, 아키텍처·도메인·평가·구현 계획, 8개 workspace/package, SQLite repository, 중앙 structured-output retry/timeout/cancel, Mock/Ollama provider, CLI, Analyst → Falsifier → Revision 상태 머신, 6개 eval fixture와 테스트를 구현했다.
- 완료: mock `doctor`/run/eval, 실제 `gemma4:e2b` Ollama `doctor`, Phase 2 3개 live eval(EC-01~03)이 모두 통과했다.
- 차단 요인 또는 미검증: Phase 0~2 범위 밖인 Web UI, Judge/Persona Panel, 전체 6-agent council 및 non-Phase-2 live eval은 구현·검증 대상이 아니다.

## 마지막 체크포인트

- Handoff: [2026-08-12-1446-agent-council-phase-02-cli](../handoff/2026-08-12-1446-agent-council-phase-02-cli.md)
- Socratic: [2026-08-12-1446-agent-council-phase-02-cli](../socratic/2026-08-12-1446-agent-council-phase-02-cli.md)

## 재개 지점

1. 다음 작업에서 UI 또는 Phase 3 agent를 시작할 경우 `docs/implementation-plan.md`의 제외 범위를 갱신하고, 기존 canonical artifact와 registry 계약을 먼저 재사용한다.
