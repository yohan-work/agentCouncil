# Handoff: Agent Council Phase 0~2 구현

- ID: 2026-08-12-1445-agent-council-phase-02
- 상태: 완료
- 기록 시각: 2026-08-12 14:45 KST
- 관련 Socratic: [2026-08-12-1445-agent-council-phase-02](../socratic/2026-08-12-1445-agent-council-phase-02.md)

## 목표와 결과

- 목표: `docs/phase-01.md`의 Phase 0~2 실행 계획을 무료 로컬 `gemma4:e2b` 단일 모델 기준으로 구현한다.
- 결과: reference audit부터 CLI, SQLite trace, Mock/Ollama provider, Analyst → Falsifier → Revision, 6개 fixture, unit/integration/eval gate까지 완료했다.

## 변경 사항

- `docs/reference-audit.md`, `docs/reference-inventory.csv`, `docs/architecture-decisions.md`, `docs/domain-model.md`, `docs/evaluation-strategy.md`, `docs/implementation-plan.md`: reference 경계·제품 결정·도메인·평가·실행 계획을 기록했다.
- `packages/shared`, `packages/agents`, `packages/providers`, `packages/database`, `packages/core`, `packages/evals`: schema-first domain, versioned registry, 중앙 generation policy, repository, 상태 머신과 평가를 구현했다.
- `apps/cli`, `data/eval-cases`, `tests`: `doctor`, `run`, `replay`, `eval`, 6개 scenario fixture와 실패/timeout/cancel/retry 테스트를 추가했다.
- `package.json`, `pnpm-lock.yaml`, `.env.example`, `.gitignore`, `README.md`: Node 24/pnpm 10 실행과 runtime dependency(`better-sqlite3`, `dotenv`) 및 `gemma4:e2b` 기본값을 정리했다.

## 검증 증거

- `pnpm reference:scan` → 2,691 files; `REUSE=238`, `ADAPT=589`, `IGNORE=1,864`.
- `pnpm lint` → 통과.
- `pnpm typecheck` → 통과.
- `pnpm test` → 6 files, 17 tests 통과.
- `pnpm build` → `dist/cli/index.js` ESM build 통과.
- `node dist/cli/index.js doctor --provider mock` → DB/structured output 통과.
- `node dist/cli/index.js eval --provider mock` → EC-01~03 모두 통과.
- `node dist/cli/index.js doctor` → Ollama 0.32.8, `gemma4:e2b`, smoke JSON 통과.
- `node dist/cli/index.js eval --provider ollama` → EC-01~03 모두 통과, 각 AgentRun usage와 `estimatedCost=0` 확인.

## 미검증 및 차단 요인

- Phase 0~2 범위 밖의 Web UI, Judge, Persona Panel, 전체 6-agent council은 구현하지 않았다.
- EC-04~06은 fixture와 schema에 포함했지만 기본 Phase 2 gate의 live 실행 대상이 아니다.
- 실행 중인 Ollama 서버가 필요하며, 서버가 없으면 `doctor`가 provider `ok:false`를 반환한다.

## 다음 세션 재개 순서

1. `docs/implementation-plan.md`와 `docs/goal/current.md`를 읽고 Phase 3 범위를 확정한다.
2. `packages/shared/src/domain.ts`의 canonical artifact와 `packages/core/src/registry.ts` 계약을 변경하지 않고 새 Agent를 추가한다.
3. 새 Agent마다 `definition.ts`, `prompt.md`, `schema.ts`, `examples/`, `eval-cases/`, `README.md`를 추가한다.
4. `pnpm lint && pnpm typecheck && pnpm test && pnpm build`를 실행하고, Ollama 사용 시 `node dist/cli/index.js doctor` 후 case별 eval을 실행한다.
