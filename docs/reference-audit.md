# MatrAIx Reference Audit

- 조사 기준일: 2026-08-12
- 원본 위치: `refer/MatrAIx-Persona-8B-main/`
- 목적: MatrAIx의 유용한 데이터 계약만 출처와 함께 선별하고 Agent Council 런타임과 분리한다.

## 조사 결과 요약

| 항목 | 조사 결과 |
| --- | --- |
| 원본 | MatrAIx 저장소 snapshot |
| 현재 위치 | `refer/MatrAIx-Persona-8B-main/` |
| 크기와 파일 수 | 약 66MB, 2,691개 파일 |
| 원본 라이선스 | 루트는 MIT, `packages/rewardkit/`은 Apache-2.0 |
| 재사용 후보 | Persona taxonomy/schema, 200개 dev sample, Task Spec, structured-output 및 reporting 예제 |
| 참고만 할 항목 | task authoring 구조, verifier/reporting 분리, Viewer와 Playground의 정보 구조 |
| 제외할 항목 | Python/Harbor runtime, Viewer/Playground 코드, computer-use 환경, 생성 파이프라인, 대규모 산출물 |
| 내부 변환 방식 | 원본을 직접 import하지 않고 scanner와 versioned adapter를 거쳐 자체 Zod schema로 변환 |
| 출처 보존 방식 | 원본 상대 경로, SHA-256, 원본 ID, 원본 schema version, adapter version 기록 |

루트에는 기존 애플리케이션이나 패키지 매니저 설정이 없으므로 reference의 Python·React 구조를 상속할 기술적 의무가 없다. Agent Council은 TypeScript/pnpm 기반으로 새로 구성한다.

## 분류 기준

전체 파일의 기계 판독 가능한 분류는 `docs/reference-inventory.csv`에 기록한다. 이 파일은 `pnpm reference:scan`으로 재생성하며 다음 세 등급만 사용한다.

| 등급 | 의미 | 초기 처리 |
| --- | --- | --- |
| `REUSE` | 라이선스와 출처를 보존해 원본 데이터 또는 계약으로 사용할 수 있음 | 필요한 최소 필드만 adapter 입력으로 허용 |
| `ADAPT` | 구조와 설계 원칙만 참고하고 자체 타입·코드로 재작성 | 원본 코드를 import하거나 복사하지 않음 |
| `IGNORE` | Phase 0~2 런타임과 평가에 필요하지 않음 | build, test, 배포 입력에서 제외 |

### REUSE

- `LICENSE`: MIT 고지의 기준 원문.
- `persona/schema/**`: dimension catalog와 taxonomy의 의미를 검토하는 원본 계약.
- `persona/datasets/matraix-persona-dev-sample/**`: 200개 개발 샘플 중 Phase 4에서 12~30개를 선별할 후보. Phase 0~2 런타임에는 연결하지 않는다.
- `application/task-spec/**`: task bundle, structured output, verifier와 reporting의 책임 분리 원칙 및 예제.

### ADAPT

- `application/tasks/**`와 `examples/tasks/**`: scenario/eval case 작성 방식만 참고한다.
- `docs/persona/**`, `docs/application/**`: provenance, cohort, verifier/reporting 개념을 자체 문서에 반영한다.
- `src/matraix/persona_*`, 관련 schema/reporting 테스트: 경계 조건과 실패 사례만 추출해 TypeScript 테스트로 새로 작성한다.
- Viewer/Playground의 화면 정보 구조: Phase 6 디자인 시 참고할 수 있으나 컴포넌트나 런타임은 재사용하지 않는다.

### IGNORE

- `environment/**`, `configs/**`: Harbor, Docker, computer-use 및 외부 실행 환경.
- `application/playground/**`, `apps/viewer/**`: 기존 backend/frontend 런타임과 UI.
- `persona/synthesis/**`, `persona/post_process/**`, 대규모 dataset pipeline: 자동 생성과 1M pipeline은 초기 범위 밖이다.
- `packages/**`: Agent Council에 불필요한 독립 패키지. 특히 Apache-2.0인 `packages/rewardkit/**`은 복사하지 않는다.
- 생성 이미지, 영상, 캐시, lockfile 등 제품 동작에 필요하지 않은 부속물.

## Reference 경계

```text
refer/MatrAIx 원본 (read-only)
        ↓ scanner: 분류·hash·license 확인
선별된 source record
        ↓ versioned adapter (Phase 4)
Agent Council Persona schema
        ↓ cohort selection
Persona Panel input
```

- `refer/`를 workspace package, TypeScript path alias, Next.js static asset 또는 배포 artifact에 포함하지 않는다.
- 런타임에서 `refer/`를 직접 읽지 않는다. 향후 adapter 명령이 자체 `data/personas/` artifact를 생성하는 단방향 흐름만 허용한다.
- 원본의 demographic dimension을 자동으로 행동 특성으로 해석하지 않는다. scenario와 평가 목적에 직접 필요한 필드만 명시적으로 allowlist한다.
- 원본 record 전체를 prompt에 넣지 않는다. 내부 ID와 평가에 필요한 최소 속성만 전달한다.

## 라이선스와 출처 정책

1. MIT 대상 파일을 실제 데이터로 배포할 경우 원저작권 고지와 MIT 허가문을 함께 보존한다.
2. `packages/rewardkit/**`은 Apache-2.0 별도 범위로 표시한다. Phase 0~2에서는 사용하지 않는다.
3. 변환 record에는 `sourceRepository`, `sourcePath`, `sourceSha256`, `sourcePersonaId`, `sourceSchemaVersion`, `adapterVersion`, `adaptedAt`을 저장한다.
4. 설계만 참고한 `ADAPT` 항목은 구현 문서에 reference 경로를 남기되 원본 코드를 붙여 넣지 않는다.
5. inventory에서 라이선스를 결정하지 못한 파일은 자동으로 재사용하지 않고 `IGNORE`로 취급한다.

## 확인된 사실과 남은 불확실성

- 확인됨: 루트 `LICENSE`는 MIT이며 dev sample manifest는 200개 persona와 schema version `1.0`, dimension count 1,290을 선언한다.
- 확인됨: reference는 Survey, Chatbot, Web, OS/App Task Spec과 structured reporting 예제를 포함한다.
- 확인됨: Viewer와 Playground는 별도 JavaScript/Python 런타임이며 Agent Council 핵심 도메인에 필요하지 않다.
- 미확인: 실제 발표용으로 선별할 MatrAIx persona 12~30개의 적합성과 편향은 Phase 4에서 별도 검토한다.
- 미확인: 외부 원본 snapshot의 정확한 upstream commit은 제공된 파일만으로 확인되지 않는다. 현 snapshot의 SHA-256 inventory를 기준 provenance로 사용한다.
