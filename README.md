# Agent Council

서로 다른 책임과 평가 기준을 가진 전문 Agent가 Claim을 만들고, 반박하고, 수정한 과정을 구조화된 trace로 보존하는 로컬 우선 실험 프로젝트입니다.

현재 구현 범위는 Phase 0~2입니다.

- MatrAIx reference audit와 전체 파일 inventory
- Zod 기반 domain schema와 versioned Agent/Prompt Registry
- SQLite/Drizzle Run·Trace 저장
- deterministic Mock provider와 로컬 Ollama provider
- Analyst → Falsifier → Analyst Revision 상태 머신
- CLI와 6개 eval scenario

## 요구 사항

- Node.js 24+
- pnpm 10+
- 선택: Ollama와 로컬 `gemma4:e2b`

외부 유료 API는 사용하지 않습니다. 기본 test는 Ollama 없이 실행됩니다.

## 설치

```bash
pnpm install
cp .env.example .env
```

## 검증

```bash
pnpm reference:scan
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## 실행

Ollama 서버와 모델을 확인합니다.

```bash
ollama serve
pnpm run doctor
```

다른 터미널에서 실제 local run을 실행합니다.

```bash
pnpm run council run --scenario data/eval-cases/slack-build-vs-buy.json
pnpm run eval --provider ollama
```

LLM 없이 상태 머신을 확인하려면 mock provider를 사용합니다.

```bash
pnpm run council run \
  --provider mock \
  --scenario data/eval-cases/slack-build-vs-buy.json
pnpm run eval --provider mock
```

Run 결과는 기본적으로 `.agent-council/agent-council.db`와 `artifacts/runs/`에 저장됩니다.

```bash
pnpm run council replay --run <run-id>
pnpm run council replay --artifact artifacts/runs/<run-id>.json
```

## 로컬 웹 시각화

실행 결과를 브라우저에서 확인하려면 먼저 Run을 생성한 뒤 웹 앱을 실행합니다.

```bash
pnpm run council run \
  --provider ollama \
  --scenario data/eval-cases/slack-build-vs-buy.json
pnpm dev
```

브라우저에서 [http://127.0.0.1:5173](http://127.0.0.1:5173)을 열면 `artifacts/runs/`의 canonical JSON을 읽어 다음을 확인할 수 있습니다.

- Run 목록과 provider/model/status/latency/token summary
- Input normalization → Analyst → Claim normalization → Falsifier → Revision timeline
- Claim → Rebuttal → Revision lineage
- before/after 변경, 실패 원인, retry attempt, raw/validated output

웹 앱은 모델을 직접 호출하지 않고 기존 artifact를 읽기 전용으로 시각화합니다. 결과가 없으면 먼저 CLI `run`을 실행해야 하며, Ollama가 꺼져 있어도 이미 생성된 artifact는 열 수 있습니다.

## 문서

- [프로젝트 구축 요청](docs/phase-01.md)
- [Reference audit](docs/reference-audit.md)
- [Architecture decisions](docs/architecture-decisions.md)
- [Domain model](docs/domain-model.md)
- [Evaluation strategy](docs/evaluation-strategy.md)
- [Implementation plan](docs/implementation-plan.md)

`refer/`는 read-only reference이며 애플리케이션 runtime, build 또는 배포 입력에 포함되지 않습니다.
