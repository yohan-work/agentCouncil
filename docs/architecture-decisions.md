# Agent Council Architecture Decisions

- 상태: Phase 0 결정
- 기준: `docs/phase-01.md`, 현재 저장소 조사, `docs/reference-audit.md`

## 1. MatrAIx에서 반드시 가져와야 하는 개념은 무엇인가?

**질문**  
Agent Council의 목적을 강화하면서 reference 종속성을 만들지 않는 최소 개념은 무엇인가?

**가설**  
Persona schema/provenance, task별 structured output, verifier와 reporting의 책임 분리만 필요하다.

**가설을 지지하는 근거**  
MatrAIx의 dev sample은 명시적 schema version과 provenance를 가지며 Task Spec은 trial fact와 집계 정책을 구분한다. 두 개념은 Persona Panel과 eval 재현성에 직접 기여한다.

**가설을 반박할 수 있는 조건**  
Agent Council 실행을 위해 Harbor runtime이나 Playground가 필수라는 통합 테스트 결과가 나오면 재검토한다.

**현재 결정**  
schema/sample/Task Spec은 `REUSE`, 개념적 실행·평가 구조는 `ADAPT`한다. 모든 데이터는 자체 schema로 변환한다.

**남은 불확실성**  
Phase 4에서 사용할 최소 persona field allowlist와 실제 cohort 구성.

## 2. 가져오지 않아도 시스템 목적을 달성할 수 있는 부분은 무엇인가?

**질문**  
어떤 reference 구성요소를 제외해도 독립 분석과 반박·수정·판정을 증명할 수 있는가?

**가설**  
Viewer, Playground, Harbor, computer-use 환경, persona 생성/1M pipeline은 필요하지 않다.

**가설을 지지하는 근거**  
Phase 0~2의 성공 기준은 CLI, 구조화 출력, trace, Claim/Rebuttal/Revision 저장이다. 해당 기능은 자체 TypeScript runtime과 SQLite로 완결된다.

**가설을 반박할 수 있는 조건**  
선정한 eval case가 브라우저나 OS 조작 없이는 평가 불가능해지는 경우다.

**현재 결정**  
초기 runtime과 build에서 `refer/` 전체를 제외하고 필요한 계약만 문서와 자체 타입으로 옮긴다.

**남은 불확실성**  
Phase 6 UI에서 reference Viewer의 정보 구조를 어느 정도 참고할지는 미정이다.

## 3. Persona와 전문 Agent는 어떻게 다른가?

**질문**  
사실 판단과 사용자 수용성 평가를 어떻게 분리할 것인가?

**가설**  
Agent는 전문 판단을 생성·검증하고 Persona는 판정이 끝난 결과를 특정 사용자 관점에서 평가해야 한다.

**가설을 지지하는 근거**  
Persona의 선호나 인구통계는 사실의 진위를 결정하는 근거가 아니다. 반면 이해도·관련성·행동 가능성에는 영향을 줄 수 있다.

**가설을 반박할 수 있는 조건**  
Persona가 사실 판정에 참여했을 때 객관 지표가 반복적으로 향상되고 편향이 증가하지 않는다는 eval 결과가 나오면 재검토한다.

**현재 결정**  
Agent/Judge는 Claim과 Verdict를 소유하고 Persona Panel은 완성된 report에 대한 `PersonaEvaluation`만 생성한다.

**남은 불확실성**  
Persona Panel이 볼 report의 상세 수준과 익명화 규칙은 Phase 4에서 확정한다.

## 4. 여러 Agent가 단일 Agent보다 나은지 어떻게 증명할 것인가?

**질문**  
추가 비용과 지연을 정당화하는 비교 방법은 무엇인가?

**가설**  
같은 scenario와 같은 기반 모델을 사용하는 baseline과 Council을 반복 실행해 품질·비용·시간을 함께 비교해야 한다.

**가설을 지지하는 근거**  
모델과 입력 조건을 통제하면 개선이 역할 분리와 프로토콜에서 왔는지 측정할 수 있다. Claim 단위 artifact는 groundedness, 가정 탐지, 반증 품질을 채점할 수 있게 한다.

**가설을 반박할 수 있는 조건**  
평가 rubric의 채점자 일치도가 낮거나 반복 실행 분산이 효과 크기보다 크면 결론을 보류한다.

**현재 결정**  
Phase 2는 구조와 Analyst/Falsifier 유용성을 검증하고, Phase 5에서 동일 모델 baseline, 반복 실행, blind rubric 비교를 완성한다.

**남은 불확실성**  
로컬 모델의 반복 횟수와 사람 평가 표본 수.

## 5. Agent 대화와 의미 있는 판단 변화는 어떻게 다른가?

**질문**  
단순 메시지 교환을 판단 개선으로 오인하지 않으려면 무엇을 저장해야 하는가?

**가설**  
Claim ID에 연결된 Rebuttal, before/after Revision, Judge Verdict가 있어야 판단 변화를 증명할 수 있다.

**가설을 지지하는 근거**  
자유 대화의 문장 수는 결론 품질과 무관하지만 `maintain/narrow/conditionalize/withdraw` 전이는 어떤 공격이 결론을 바꿨는지 추적한다.

**가설을 반박할 수 있는 조건**  
구조화 과정에서 핵심 의미가 지속적으로 손실되어 원문 대화만이 신뢰 가능한 경우다.

**현재 결정**  
raw output과 normalized artifact를 분리 보존하고 UI는 메시지보다 Claim lineage를 우선 표시한다.

**남은 불확실성**  
중복 Claim 자동 병합 기준은 Phase 3 eval 후 확정한다.

## 6. 어떤 결과가 나오면 Agent Council 접근이 실패한 것인가?

**질문**  
기능 동작과 제품 가치 실패를 어떻게 구분할 것인가?

**가설**  
Council이 baseline 대비 핵심 오류를 줄이지 못하거나 치명적 오류를 추가하고, 개선보다 비용·지연 증가가 큰 경우 실패다.

**가설을 지지하는 근거**  
여러 Agent 자체는 가치가 아니며, 중복 출력과 잘못된 다수 의견은 오히려 품질을 낮출 수 있다.

**가설을 반박할 수 있는 조건**  
정량 지표는 같아도 특정 고위험 오류를 안정적으로 예방한다면 제한된 용도에서 성공으로 볼 수 있다.

**현재 결정**  
치명적 판단 오류 1건 이상, schema 성공률 95% 미만, 역할 준수율 90% 미만, baseline 개선 부재가 지속되면 Agent를 늘리지 않고 경계·prompt·순서를 수정한다.

**남은 불확실성**  
발표 전 실제 측정값과 허용 가능한 지연 상한.

## 7. Agent 수 증가의 가치보다 비용과 복잡성이 커지는 지점은 어디인가?

**질문**  
새 Agent 추가를 허용할 객관적 기준은 무엇인가?

**가설**  
기존 Agent가 놓치는 독립 실패 유형을 eval에서 반복적으로 발견하고 중복률을 높이지 않을 때만 추가 가치가 있다.

**가설을 지지하는 근거**  
동일 모델을 여러 번 실행하면 토큰과 지연이 선형 증가하며 M2 Pro 32GB 환경에서는 병렬 모델 호출이 병목을 만든다.

**가설을 반박할 수 있는 조건**  
작은 모델·캐시·병렬화로 한계 비용이 충분히 감소하거나 새 Agent가 치명적 오류를 예방하는 경우다.

**현재 결정**  
단일 `gemma4:e2b`, concurrency 1로 시작한다. Agent 추가 전 고유 발견률, 중복률, latency 증가를 비교한다.

**남은 불확실성**  
실측 tokens/sec와 6-Agent 전체 run 시간.

## 8. 발표 화면에서 반드시 증명해야 하는 한 가지 가치는 무엇인가?

**질문**  
한 화면만으로 Agent Council의 존재 이유를 무엇으로 보여줄 것인가?

**가설**  
단일 Agent가 놓친 핵심 위험을 반박이 발견하고 원주장이 조건부로 수정된 과정을 baseline 수치와 함께 보여줘야 한다.

**가설을 지지하는 근거**  
Agent 수나 대화량이 아니라 더 안전하고 실행 가능한 결정으로 바뀐 증거가 제품 가치를 직접 설명한다.

**가설을 반박할 수 있는 조건**  
수정된 주장이 실제 rubric 점수를 높이지 못한다면 시각적 변화만 있고 품질 개선은 없다.

**현재 결정**  
Baseline Comparison과 Claim lineage를 발표의 중심으로 삼고 비용·시간 불이익도 같은 화면에 공개한다.

**남은 불확실성**  
대표 시나리오의 최종 실측 개선 폭.

## 기술 결정

| 결정 | 선택 | 이유 |
| --- | --- | --- |
| 오케스트레이션 | 코드 상태 머신 + manager 패턴 | 독립성, 순서, 예산, 실패를 LLM 자유 판단에서 분리 |
| 로컬 모델 | Ollama `gemma4:e2b`, concurrency 1 | 무료 실행과 M2 Pro 32GB 메모리 제약 |
| Agent 차별화 | 입력·schema·non-goal·eval 분리 | 동일 모델에 이름만 붙이는 역할극 방지 |
| provider | 자체 `ModelProvider` 인터페이스 | mock/로컬 실행을 우선하고 향후 provider 추가 허용 |
| persistence | SQLite + Drizzle | 로컬 재현성과 명시적 migration/schema |
| validation | Zod v4 | TypeScript 타입과 runtime validation의 단일 원천 |
| 실패 정책 | raw failure 기록, 1회 retry, 이후 AgentRun 실패 | 실패를 정상 결과로 위장하지 않음 |
| Phase 0~2 UI | 없음, CLI/JSON 우선 | 실행 가치를 먼저 검증 |
