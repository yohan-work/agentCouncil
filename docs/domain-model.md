# Agent Council Domain Model

## 경계와 원칙

- Orchestrator가 `Run`의 상태와 사용자 결과를 소유한다.
- Agent는 허용된 입력만 받고 구조화된 결과만 반환한다.
- Persona는 사실 판정에 참여하지 않고 최종 결과의 이해도·수용도를 평가한다.
- raw model output과 validated domain object를 별도로 보존한다.
- 모든 Claim, Rebuttal, Revision, Verdict는 안정적인 ID와 lineage를 가진다.
- Phase 0~2에서는 Persona/Cohort/Verdict 타입을 정의할 수 있지만 실행 경로는 Analyst와 Falsifier까지만 구현한다.

## 주요 관계

```text
Scenario ──< Run ──< Round ──< AgentRun
                   │             │
                   │             └── AgentDefinition + PromptVersion
                   ├──< Claim ──< Rebuttal
                   │       └────< Revision
                   └──< TraceEvent

CouncilTemplate ──< AgentDefinition
Run ──< Verdict              (Phase 3)
Run ──< PersonaEvaluation    (Phase 4)
Persona >── Cohort           (Phase 4)
Run ──< MetricScore          (Phase 5)
```

## Entity 계약

| Entity | 핵심 필드 | 불변 조건 | Phase |
| --- | --- | --- | --- |
| `Scenario` | problem, goals, constraints, knownFacts, assumptions, budgets | problem은 비어 있지 않고 모든 배열은 명시적으로 존재 | 1 |
| `CouncilTemplate` | agentIds, round policy, limits | registry에 없는 Agent를 참조하지 않음 | 3 |
| `AgentDefinition` | id, version, responsibilities, nonGoals, schemaId, promptPath | `(id, version)`은 불변·유일 | 1 |
| `Persona` | internal fields, source provenance | source record를 직접 domain type으로 사용하지 않음 | 4 |
| `Cohort` | personaIds, selection policy | 사실 판정 투표에 사용하지 않음 | 4 |
| `Run` | scenarioId, provider, model, status, limits, timestamps | terminal status 이후 상태 변경 금지 | 1 |
| `Round` | runId, index, kind, status | 같은 Run 안에서 index 유일 | 1 |
| `AgentRun` | roundId, agent/version, input hash, raw/validated output, usage/error | 성공 시 validated output 필수, 실패 시 error 필수 | 1 |
| `Claim` | author, text, type, evidenceRefs, assumptions, confidence, status | author와 original text 보존 | 2 |
| `Evidence` | source, excerpt/summary, support type | 존재하지 않는 출처를 생성하지 않음 | 3 |
| `Assumption` | text, owner, validation status | fact로 승격하려면 evidence 필요 | 3 |
| `Rebuttal` | targetClaimId, counterargument, failureScenario, disconfirmingTest | 같은 Run의 실제 Claim만 참조 | 2 |
| `Revision` | claimId, rebuttalId, action, before, after | original Claim을 덮어쓰지 않음 | 2 |
| `Verdict` | claimId, decision, rationale, confidence | 새 핵심 Claim을 추가하지 않음 | 3 |
| `PersonaEvaluation` | personaId, clarity, trust, relevance, actionability | truth decision 필드 없음 | 4 |
| `MetricScore` | metric, value, rubric/version | baseline/council 조건을 함께 기록 | 5 |
| `TraceEvent` | sequence, type, timestamp, redacted payload | Run 내 sequence 단조 증가 | 1 |

## 상태 모델

### Run

```text
pending → running → completed
                 ↘ failed
                 ↘ cancelled
```

- `pending`: DB record는 생성됐으나 Round가 시작되지 않음.
- `running`: 하나 이상의 Round가 시작됨.
- `completed`: 요구된 모든 단계와 canonical artifact export가 성공함.
- `failed`: 필수 단계가 retry 후 실패함. 앞선 성공 artifact는 보존함.
- `cancelled`: `AbortSignal` 또는 사용자 취소가 관찰됨.

### AgentRun

```text
pending → running → succeeded
                 ↘ failed
                 ↘ timed_out
                 ↘ cancelled
```

schema validation 실패는 `failed`이며 원본 출력과 Zod issue를 저장한다. timeout/cancel은 retry하지 않는다.

### Claim

```text
proposed → challenged → revised → accepted | conditional | rejected | unresolved
          └────────────→ withdrawn
```

Phase 2에서는 `proposed`, `challenged`, `revised`, `withdrawn`까지만 실행한다. 판정 상태는 Phase 3 Judge가 소유한다.

## Phase 2 상태 머신과 데이터 흐름

```text
Scenario input
  → Round 0 normalize
  → Round 1 Analyst (새 session, Scenario만)
  → Claim normalization (ID, author, provenance)
  → Round 3 Falsifier (새 session, Scenario + 우선 Claim만)
  → Round 4 Analyst revision (새 session, Claim + 해당 Rebuttal만)
  → canonical JSON export
```

독립성은 병렬 실행 여부가 아니라 입력 격리로 정의한다. AgentRun에는 전달한 input의 canonical SHA-256을 저장하고 테스트에서 다른 Agent의 raw output이 포함되지 않았음을 검증한다.

## ID와 시간 규칙

- ID는 type prefix가 있는 UUID를 사용한다: `run_`, `round_`, `arun_`, `claim_`, `rebuttal_`, `revision_`, `trace_`.
- timestamp는 UTC ISO-8601로 저장하고 UI에서만 locale로 변환한다.
- Agent와 prompt version은 semantic version string을 사용한다.
- canonical JSON은 key ordering을 안정화하여 hash와 replay 비교가 가능하게 한다.

## 저장 경계

| 저장 대상 | 형태 | 민감정보 정책 |
| --- | --- | --- |
| normalized input | JSON text | 알려진 secret key를 redact하고 길이 제한 적용 |
| raw model output | text | API key/authorization pattern redact, 최대 길이 제한 |
| validated output | JSON text | Zod schema로 allowlist된 필드만 저장 |
| trace payload | JSON text | 전체 prompt 대신 hash와 요약을 기본 저장 |
| usage | integer/duration | local cost는 0, token/duration은 보존 |

## SQLite 논리 테이블

- `runs`, `rounds`, `agent_runs`
- `claims`, `rebuttals`, `revisions`
- `trace_events`, `prompt_versions`

Phase 3 이후 `evidence`, `assumptions`, `verdicts`, `persona_evaluations`, `metric_scores`를 migration으로 추가한다. Phase 0~2 타입이 존재하더라도 사용하지 않는 빈 테이블을 미리 만들지 않는다.
