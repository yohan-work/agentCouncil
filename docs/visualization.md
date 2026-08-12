# Phase 3 로컬 시각화

## 목적

CLI가 생성한 canonical run artifact를 브라우저에서 읽기 전용으로 탐색한다. 시각화의 중심은 메시지 양이 아니라 `Claim → Rebuttal → Revision` 판단 변화다.

## 실행

```bash
pnpm run council run --provider mock --scenario data/eval-cases/slack-build-vs-buy.json
pnpm dev
```

브라우저에서 <http://127.0.0.1:5173>을 연다. 실제 Ollama 결과를 보려면 `--provider ollama`로 Run을 먼저 생성한다.

## 데이터 경계

- Vite dev middleware가 `artifacts/runs/`를 읽는다.
- `GET /api/runs`는 schema를 통과한 artifact의 summary만 반환한다.
- `GET /api/runs/:runId`는 UUID 형식의 `run_...` 파일만 읽고 `canonicalRunArtifactSchema`로 검증한다.
- SQLite를 브라우저에 노출하지 않으며 웹 화면이 모델을 직접 호출하지 않는다.
- `refer/`는 Vite alias, static asset, API 응답, build input에서 제외한다.

## 화면

- 상단: scenario, provider/model, status, claim/rebuttal/revision count, latency, tokens, local cost.
- 좌측: Input normalization, Independent analysis, Claim normalization, Rebuttal, Revision timeline.
- 우측: 선택 단계의 scenario, validated/raw output, usage, retry/error, rebuttal, revision before/after.
- 하단: Claim lineage와 trace event 목록.

## 범위 밖

Judge verdict, Persona Panel, baseline comparison, 실시간 streaming, artifact 편집·재실행, 인증·원격 배포는 이후 Phase에서 다룬다.
