# Phase 4 Agent 협업 보드 시각화

## 목적

CLI가 생성한 canonical run artifact를 브라우저에서 읽기 전용으로 탐색한다. 첫 화면의 중심은 실행 로그가 아니라 `중앙 문제 → Agent 역할 → Claim → Rebuttal → Revision` 관계다. 사용자는 한 번에 현재 사고 구조를 파악하고, 필요한 경우 선택한 Agent 또는 관계의 근거와 output을 펼친다.

## 실행

```bash
pnpm run council run --provider mock --scenario data/eval-cases/slack-build-vs-buy.json
pnpm dev
```

브라우저에서 <http://127.0.0.1:5173>을 연다. 실제 Ollama 결과를 보려면 `--provider ollama`로 Run을 먼저 생성한다. 웹 앱은 모델을 호출하지 않으므로 Ollama가 꺼져 있어도 이미 저장된 artifact는 확인할 수 있다.

## 데이터 경계

- Vite dev middleware가 `artifacts/runs/`를 읽는다.
- `GET /api/runs`는 schema를 통과한 artifact의 summary만 반환한다.
- `GET /api/runs/:runId`는 UUID 형식의 `run_...` 파일만 읽고 `canonicalRunArtifactSchema`로 검증한다.
- 브라우저는 `@agent-council/shared/browser`와 `canonicalRunArtifact`만 사용한다. SQLite와 Node 전용 agent/prompt loader를 bundle에 넣지 않는다.
- `refer/`는 Vite alias, static asset, API 응답, build input에서 제외한다.

## 화면 읽는 순서

1. **Run summary**: scenario, provider/model, 상태, 기본 Claim 수, 반박 대상 수, 수정 수, latency와 local cost를 확인한다. 수정된 자식 Claim은 별도 record로 보되 기본 Claim 수에 중복 집계하지 않는다.
2. **중앙 문제**: scenario의 problem, context, goals, constraints와 현재까지의 수정 요약을 읽는다.
3. **양측 Agent**: 왼쪽 Analyst는 구조화·수정, 오른쪽 Falsifier는 반증·공격을 담당한다. 각 카드는 실행된 Agent만 보여주며 역할, 요약, record 수와 phase chip을 제공한다.
4. **관계 카드**: `Claim → Rebuttal → Revision`을 한 줄로 비교한다. 반박 또는 수정이 없는 Claim도 빈 칸으로 보존하고, 참조가 끊긴 record는 경고로 표시한다.
5. **Inspector**: Agent 카드를 선택하면 역할·non-goal·실행 phase·usage·validated/raw output을 확인한다. 관계 카드를 선택하면 Claim, strongest counterargument, failure scenario, before/after 수정 이유를 확인한다.
6. **Execution details**: timeline 5단계와 trace event는 보조 영역으로 접혀 있다. 실행 순서가 필요할 때만 펼친다.

## 구현 경계

- `apps/web/src/agent-board-model.ts`가 canonical artifact를 browser-safe `AgentBoardModel`로 변환한다.
- Analyst의 `independent_analysis`와 `revision` 호출은 하나의 Agent 카드로 묶되 내부 phase를 보존한다.
- `apps/web/src/agent-metadata.ts`는 UI 표시용 정적 메타데이터다. 실제 prompt/definition은 Node 전용 `packages/agents`에서 계속 관리한다.
- API 계약과 canonical artifact schema는 변경하지 않는다. UI는 read-only다.

## 범위 밖

Judge verdict, Persona Panel, baseline comparison, 실시간 streaming, artifact 편집·재실행, 인증·원격 배포와 아직 실행되지 않은 6-Agent 역할은 이후 Phase에서 다룬다.
