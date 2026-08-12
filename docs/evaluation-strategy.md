# Agent Council Evaluation Strategy

## 평가 목표

Agent 수나 대화량이 아니라 단일 Agent 대비 오류 감소, 반증 가능성, 실행 가능성의 개선을 측정한다. Phase 2에서는 Analyst/Falsifier vertical slice의 신뢰성을 먼저 검증하고 전체 Council 비교는 Phase 5로 확장한다.

## 평가 계층

1. **Contract test**: Zod schema, Registry, ID/lineage, 상태 전이.
2. **Deterministic integration**: `MockProvider`로 성공, retry, malformed JSON, timeout, cancel, DB 기록을 재현.
3. **Local model smoke/eval**: Ollama `gemma4:e2b`, concurrency 1로 실제 구조화 출력과 역할 준수 확인.
4. **Baseline comparison**: Phase 5에서 같은 모델·scenario·budget으로 generic single Agent와 Council을 blind 비교.

LLM이 없어도 1~2 계층은 항상 실행할 수 있어야 한다. 실제 모델 실패를 fixture로 덮어 성공처럼 표시하지 않는다.

## 핵심 지표

| 지표 | 측정 | Phase 2 방식 |
| --- | --- | --- |
| Structured Output Success | retry 안/후 schema를 통과한 비율 | 3개 live case 모두 통과해야 함 |
| Role Adherence | responsibilities 수행, nonGoals 위반 여부 | case rubric의 필수 항목 비율 |
| Claim Quality | 구체성, 유형·가정·확신도 적합성 | deterministic shape + rubric |
| Falsification Quality | 핵심 Claim 공격, 반례, 실패 시나리오, 반증 test | Claim ID별 필수 필드 + rubric |
| Revision Traceability | 공격과 응답, before/after 보존 | DB 및 artifact invariant |
| Groundedness | 근거 없는 사실 단정 수 | case의 forbidden assertion과 비교 |
| Redundancy | 의미 중복 Claim 비율 | Phase 3 normalization 이후 정식 적용 |
| Stability | 반복 실행 결론 변동 | Phase 5에서 반복 표본으로 적용 |
| Latency | 전체/Agent별 duration | Ollama 응답과 wall clock |
| Cost | API 또는 추정 비용 | local은 0, tokens는 별도 공개 |

## Phase 2 통과 조건

- unit/integration test 전부 통과.
- mock 기반 end-to-end run이 canonical JSON과 SQLite record를 동일 ID로 생성.
- invalid JSON/schema는 1회만 retry하고 두 번째 실패 시 Run을 `failed`로 종료.
- timeout/cancel은 즉시 terminal 상태로 기록하고 retry하지 않음.
- 3개 live eval case에서 구조화 출력 3/3 성공.
- role rubric 필수 항목의 90% 이상 충족.
- 각 case에 핵심 Claim 1개 이상, 해당 Claim을 대상으로 하는 Rebuttal과 검증 가능한 `disconfirmingTest` 1개 이상 존재.
- 원본 Claim과 Revision before/after가 모두 보존.
- latency와 token usage가 결과 artifact에 존재하며 `estimatedCost`는 0.

live 조건을 실행하지 못하면 Phase 2 코드는 완료될 수 있지만 제품 품질은 `미검증`으로 보고한다.

## 초기 Eval Case

### EC-01 교육회사 내부 협업 서비스 자체 구축

- 문제: 교육회사가 Slack/Jandi 대신 내부 협업 서비스를 자체 구축해야 하는가?
- 확인된 사실: 회사 규모, 예산, 보안 요구, 기존 SaaS 비용은 입력 없이는 미확인이다.
- 반드시 찾아야 하는 위험: 총소유비용, 운영 인력, 보안/감사, migration, 기회비용.
- 피해야 하는 단정: 구체적 SaaS 가격이나 규제 준수 여부를 출처 없이 확정.
- 최소 좋은 답변: build/buy 조건, 필요한 추가 데이터, 단계적 검증, 반증 test.
- 허용 결론: 구매 유지, 조건부 구축, 제한적 extension 구축, 결정 보류.

### EC-02 Figma 일부 노드 미확인 상태 구현

- 문제: 일부 Figma node를 읽지 못한 채 구현을 진행해도 되는가?
- 확인된 사실: 확인되지 않은 node의 중요도와 대체 reference 존재 여부는 scenario 입력에 의존한다.
- 반드시 찾아야 하는 위험: 잘못된 layout 추정, component state 누락, 접근성, 재작업.
- 피해야 하는 단정: 보이지 않은 node의 디자인을 본 것처럼 설명.
- 최소 좋은 답변: 진행 가능한 안전 범위, blocker 기준, placeholder/assumption 표시, 확인 절차.
- 허용 결론: 영향 없는 기반 작업만 진행, mock으로 격리, 확인 전 중단.

### EC-03 GSAP pin과 Swiper 결합

- 문제: 한 section에서 GSAP pin과 Swiper를 함께 사용할 때의 위험은 무엇인가?
- 확인된 사실: DOM 구조, scroll container, breakpoint, library version은 입력 없이는 미확인이다.
- 반드시 찾아야 하는 위험: transform/scroll ownership 충돌, pin spacer, resize refresh, touch gesture, cleanup, 접근성.
- 피해야 하는 단정: 재현 없이 특정 library bug라고 확정.
- 최소 좋은 답변: 최소 재현, event/ownership 설계, breakpoint와 teardown test.
- 허용 결론: 분리, 제한적 결합, 대체 interaction.

### EC-04 iOS 키보드와 fixed header

- 문제: 키보드 노출 시 fixed header 위치 변화가 제품 bug인가?
- 확인할 항목: visual/layout viewport, 브라우저·OS 버전, 기대 UX, 재현 조건.

### EC-05 소규모 AI 동아리 운영 개선

- 문제: 제한된 운영 인력으로 학습과 결과물 품질을 함께 높이는 방법은 무엇인가?
- 확인할 항목: 구성원 목표, 참여율, 운영 시간, 성공 지표.

### EC-06 새 AI MVP의 문제 적합성

- 문제: 제안된 AI MVP가 실제 사용자 문제를 해결하는가?
- 확인할 항목: 대상 사용자, 현재 대안, 빈도·심각도, 지불/전환 의향, 가장 싼 반증 실험.

EC-04~06은 Phase 3~5 확장용이며 Phase 2 live gate에는 EC-01~03만 사용한다.

## Rubric과 결과 형식

각 case는 다음 machine-readable 필드를 가진다.

```text
id, title, scenario,
mustFindRisks[], forbiddenAssertions[],
minimumClaimCount, minimumRebuttalCount,
requiredRebuttalFields[], allowedConclusions[]
```

자동 채점은 schema/invariant/필수 phrase 범주만 판정한다. 의미 품질은 사람이 raw output을 가린 상태에서 rubric으로 검토하고 `grader`, `rubricVersion`, `notes`를 남긴다. 작은 로컬 모델의 표현 차이를 특정 문자열 하나로 과적합하지 않는다.

## 성능 제약

- Ollama model concurrency는 1.
- 동일 run의 Agent 호출도 순차 실행하지만 새 대화로 컨텍스트를 격리한다.
- 기본 keep-alive는 15분으로 한 모델만 메모리에 유지한다.
- 기본 context는 8,192, output 상한은 2,048 tokens로 시작하고 실측 OOM/지연이 있으면 낮춘다.
- 여러 로컬 모델을 동시에 적재하거나 자동 fallback하지 않는다.
