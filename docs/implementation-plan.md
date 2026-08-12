# Agent Council Phase 0~2 Implementation Plan

## 목표

무료 로컬 환경에서 Agent Council의 핵심인 구조화 Claim → Rebuttal → Revision 흐름을 CLI로 증명한다. `gemma4:e2b` 하나를 Ollama에 유지하고 모든 호출을 순차 실행한다.

## Phase 0 — 조사와 결정

- `reference-audit.md`와 자동 생성 `reference-inventory.csv`로 모든 reference 파일을 `REUSE/ADAPT/IGNORE` 분류한다.
- `architecture-decisions.md`에 8개 제품 질문과 manager/state-machine/provider 결정을 기록한다.
- `domain-model.md`에 entity, 상태, lineage, persistence 경계를 정의한다.
- `evaluation-strategy.md`에 mock/live 계층과 초기 6개 case를 정의한다.
- 완료 기준: 라이선스 예외, runtime 제외 범위, Agent/Persona 경계, Phase 2 gate가 문서화된다.

## Phase 1 — 실행 기반

1. pnpm TypeScript workspace와 `shared`, `core`, `agents`, `providers`, `database`, `evals`, CLI app을 구성한다.
2. Zod v4 domain schema와 Agent/Prompt Registry를 단일 진실 공급원으로 만든다.
3. SQLite/Drizzle schema와 repository를 구현해 Run/Round/AgentRun/artifact/trace를 저장한다.
4. `MockProvider`, `OllamaProvider`, 중앙 retry/timeout/cancel 및 redaction을 구현한다.
5. CLI `doctor`, `run`, `replay`, `eval`을 제공한다.
- 완료 기준: mock 단일 Agent의 성공과 실패가 DB에 기록되고 schema failure를 재현한다.

## Phase 2 — Analyst/Falsifier vertical slice

1. Analyst definition/prompt/schema/eval README를 작성하고 Scenario에서 구조화 Claim을 생성한다.
2. Claim ID와 provenance를 정규화한다.
3. Falsifier가 우선 Claim ID를 대상으로 반례, 실패 시나리오, 누락 근거, 반증 test를 생성한다.
4. Analyst가 `maintain/narrow/conditionalize/withdraw`로 응답하고 before/after를 저장한다.
5. canonical JSON artifact를 export해 replay와 후속 UI가 같은 경로를 사용하게 한다.
- 완료 기준: mock E2E와 3개 로컬 live case가 평가 계약을 만족한다.

## 예상 구조

```text
apps/cli/                 doctor/run/replay/eval entrypoint
packages/shared/          Zod domain schemas, IDs, canonical JSON
packages/core/            Registry, state machine, orchestration
packages/agents/          versioned definitions/prompts/schemas/eval cases
packages/providers/       mock and Ollama adapters
packages/database/        Drizzle schema, migration, repository
packages/evals/           case catalog and deterministic checks
data/eval-cases/          six scenario fixtures
artifacts/runs/            generated canonical replay JSON (gitignored)
```

## 실행과 검증

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm run doctor
pnpm run council run --scenario data/eval-cases/slack-build-vs-buy.json
pnpm run eval --provider ollama
```

`doctor`의 Ollama 검사와 live eval은 서버와 `gemma4:e2b`가 준비된 경우에만 통과한다. CI와 기본 test는 `MockProvider`만 사용한다.

## 확정 기본값

- package manager: pnpm 10
- runtime: Node.js 24+
- model provider: Ollama `/api/chat`
- model: `gemma4:e2b`
- concurrency: 1
- temperature: 0
- keep-alive: `15m`
- max retries: 1
- context/output: 8,192 / 2,048 tokens
- database: `.agent-council/agent-council.db`
- artifacts: `artifacts/runs/<run-id>.json`
- 외부 유료 API, UI, Persona Panel, 전체 6-Agent Council은 Phase 0~2에서 제외

## Phase 3 — 로컬 Run detail 시각화

- `apps/web`에 React + Vite 기반 localhost viewer를 추가한다.
- Vite dev middleware가 `artifacts/runs/*.json`을 읽어 `GET /api/runs`, `GET /api/runs/:runId`로 제공한다.
- 브라우저는 `canonicalRunArtifact`만 사용해 Run summary, 5단계 execution timeline, 선택 단계 상세 패널을 렌더링한다.
- Claim → Rebuttal → Revision 연결과 before/after를 카드 기반 lineage로 표시한다. DB 직접 조회, 모델 호출, artifact 편집은 하지 않는다.
- 완료 기준: mock 또는 live artifact 하나로 localhost 화면이 열리고, 모든 stage 선택과 lineage 탐색이 가능하며 `refer/`가 API/build 입력에 포함되지 않는다.

실행:

```bash
pnpm web:build
pnpm dev
```

기본 브라우저 주소는 `http://127.0.0.1:5173`이다.
