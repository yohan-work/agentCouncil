# Agent Council 프로젝트 구축 요청

## 0. 프로젝트 배경

이 저장소는 MatrAIx 저장소 전체를 `refer/` 폴더에 참고용으로 복사해둔 상태다.

하지만 이 프로젝트의 목표는 MatrAIx를 그대로 복제하거나 UI만 변경하는 것이 아니다.

목표는 다음과 같다.

> 서로 다른 전문성과 판단 특성을 가진 실제 에이전트를 만들고, 이들이 독립적으로 문제를 분석하고 서로의 주장을 반박·수정·판정하도록 한다. 이후 전체 과정을 시각화하고, 단일 AI보다 실제로 더 유용한지 평가할 수 있는 Agent Council 시스템을 구축한다.

단순한 프롬프트 역할극이나 여러 AI의 채팅 화면이 되어서는 안 된다.

각 에이전트는 다음을 가져야 한다.

- 명확하게 구분되는 책임
- 다른 에이전트와 중복되지 않는 판단 기준
- 구조화된 입력과 출력
- 제한된 도구와 권한
- 개별 평가 데이터셋
- 버전 관리되는 프롬프트
- 실패 조건과 품질 기준
- 실행 기록과 비용 측정
- 실제 성능 개선 루프

최종 결과물은 개인 학습 프로젝트이지만, 실제 문제를 입력해 사용할 수 있고 외부 발표도 가능한 완성도를 목표로 한다.

---

# 1. 가장 먼저 해야 할 작업

코드를 바로 작성하지 말고 현재 저장소를 먼저 조사하라.

다음 순서로 진행한다.

## 1.1 저장소 조사

다음을 확인한다.

- 현재 저장소 전체 구조
- 사용 중인 패키지 매니저
- 기존 프레임워크와 설정
- [`AGENTS.md`](http://AGENTS.md) 또는 별도 작업 지침
- `refer/` 내부의 MatrAIx 구조
- MatrAIx의 라이선스 파일
- 페르소나 스키마
- 샘플 페르소나
- Task Spec
- Survey 및 Chat 예제
- 평가 및 Reporting 관련 구조
- Viewer, Playground, 실행 환경, 데이터 생성 파이프라인
- 실제로 재사용 가능한 파일과 참고만 해야 하는 파일

`refer/` 전체를 애플리케이션 런타임에 연결하거나 그대로 복사하지 않는다.

## 1.2 Reference Audit 작성

다음 문서를 작성한다.

```text
docs/reference-audit.md

```

문서에는 다음을 포함한다.


| 항목       | 내용                          |
| -------- | --------------------------- |
| 원본       | MatrAIx 저장소                 |
| 현재 위치    | `refer/`                    |
| 원본 라이선스  | 실제 파일 조사 결과                 |
| 재사용 후보   | 스키마, 샘플, Task Spec 등        |
| 참고만 할 항목 | Viewer, Playground, 실행 환경 등 |
| 제외할 항목   | 대용량 데이터, 불필요한 런타임 등         |
| 내부 변환 방식 | 프로젝트 자체 스키마로 Adapter 변환     |
| 출처 보존 방식 | 원본 경로와 변환 이력 기록             |


각 `refer/` 파일을 다음 세 등급으로 분류한다.

- `REUSE`: 출처를 기록하고 실제 데이터로 사용할 수 있음
- `ADAPT`: 설계만 참고하고 자체 형식으로 변환
- `IGNORE`: 초기 제품에서는 사용하지 않음

## 1.3 의사결정 질문

다음 질문에 대한 답을 `docs/[architecture-decisions.md](http://architecture-decisions.md)`에 기록한다.

1. MatrAIx에서 반드시 가져와야 하는 개념은 무엇인가?
2. 가져오지 않아도 시스템 목적을 달성할 수 있는 부분은 무엇인가?
3. Persona와 전문 Agent는 어떻게 다른가?
4. 여러 Agent를 쓰는 것이 단일 Agent보다 나은지 어떻게 증명할 것인가?
5. Agent 간 대화를 보여주는 것과 의미 있는 판단 변화를 보여주는 것은 어떻게 다른가?
6. 어떤 결과가 나오면 Agent Council 접근이 실패했다고 판단할 것인가?
7. 에이전트 수가 늘어날 때 얻는 가치보다 비용과 복잡성이 커지는 지점은 어디인가?
8. 발표 화면에서 반드시 증명해야 하는 한 가지 가치는 무엇인가?

각 질문에는 다음 형식으로 답한다.

```text
질문
가설
가설을 지지하는 근거
가설을 반박할 수 있는 조건
현재 결정
남은 불확실성

```

---

# 2. 제품 정의

프로젝트의 임시 이름은 `Agent Council`로 사용한다.

핵심 사용 시나리오는 다음과 같다.

1. 사용자가 분석할 문제를 입력한다.
2. 분석에 참여할 전문 에이전트를 선택한다.
3. 각 에이전트가 서로의 결과를 보지 않고 독립적으로 분석한다.
4. 분석 결과를 주장 단위로 정규화한다.
5. 반박 에이전트가 핵심 주장의 반례와 실패 시나리오를 제시한다.
6. 원래 에이전트가 주장을 유지·수정·축소·철회한다.
7. Judge가 주장별 최종 판정을 내린다.
8. Persona Panel이 사용자 관점에서 결과를 평가한다.
9. 오케스트레이터가 최종 보고서를 생성한다.
10. 단일 AI 결과와 Agent Council 결과를 비교한다.
11. 전체 실행 과정을 웹 화면에서 시각화한다.

---

# 3. 중요한 개념 분리

## 3.1 Agent

Agent는 전문적인 판단 작업을 담당한다.

예:

- 문제 구조화
- 증거 검증
- 구현 가능성 검토
- 보안·운영 위험 분석
- 반례 탐색
- 최종 판정

## 3.2 Persona

Persona는 사실을 판단하는 전문가가 아니다.

Persona는 완성된 결과를 특정 사용자 관점에서 평가한다.

예:

- 비개발자 대표가 이해할 수 있는가?
- 개발자가 실행 가능하다고 느끼는가?
- 보안 담당자가 위험하다고 느끼는가?
- 비용에 민감한 의사결정자가 수용할 수 있는가?

Persona 다수결로 사실 여부를 결정하지 않는다.

- 사실·논리·근거 판단: Agent 및 Judge
- 이해도·수용도·행동 가능성 판단: Persona Panel

## 3.3 Orchestrator

Orchestrator는 전체 상태와 최종 응답 책임을 가진다.

전문 에이전트가 사용자 응답의 소유권을 가져가는 handoff 중심 구조보다, Orchestrator가 전문 에이전트를 제한된 도구처럼 호출하는 manager 패턴을 우선 검토한다.

단, Agent 간 독립 분석과 반박 순서는 LLM의 자유 판단에 맡기지 말고 코드로 통제하는 상태 머신으로 구현한다.

---

# 4. 초기 전문 에이전트

처음부터 에이전트를 지나치게 많이 만들지 않는다.

아래 6개의 핵심 에이전트로 실제 작동하는 첫 번째 vertical slice를 완성한다.

## 4.1 Analyst

역할:

- 문제를 구성 요소로 분해
- 목표와 제약 조건 분리
- 가능한 선택지 제시
- 핵심 가정 식별
- 1차 권고안 작성

하지 말아야 할 일:

- 출처가 없는 정보를 사실처럼 단정
- 보안·비용·구현 세부사항을 모두 대신 판단
- 모르는 내용을 임의로 채우기

## 4.2 Evidence Checker

역할:

- Analyst와 다른 에이전트의 주장을 검토
- 사실, 추론, 가정, 의견을 구분
- 근거가 없는 주장을 식별
- 근거가 주장을 직접 지지하는지 평가
- 추가 확인이 필요한 항목 제시

근거가 없으면 출처를 만들어내지 말고 `evidence_missing`으로 표시한다.

## 4.3 Practitioner

역할:

- 실제 구현 가능성 검토
- 개발 기간, 복잡도, 운영 부담 분석
- 필요한 인력과 기술 확인
- MVP와 장기 기능 구분
- 현실적인 다음 행동 제시

## 4.4 Risk Challenger

역할:

- 보안, 개인정보, 비용, 운영, 종속성, 장애 가능성 검토
- 정상 시나리오보다 실패 시나리오 우선 탐색
- 어떤 조건에서 계획이 실패하는지 구체화
- 위험별 완화 방법 제안

## 4.5 Falsifier

역할:

- 현재 가장 유력한 결론을 의도적으로 반증
- 강한 반례 제시
- 누락된 대안 탐색
- 결론이 틀렸음을 확인할 수 있는 테스트 설계
- 다른 에이전트와 단순히 다른 의견을 내는 것이 아니라 반증 가능한 공격 수행

## 4.6 Judge

역할:

- 각 주장을 근거와 반박 결과로 판정
- 채택, 조건부 채택, 보류, 기각 중 하나를 선택
- 다수결이나 문장 표현력에 영향받지 않기
- 새로운 핵심 주장을 임의로 추가하지 않기
- 남은 불확실성과 신뢰도를 표시

Judge의 출력도 별도 eval 대상이어야 한다.

## 4.7 Synthesizer

별도의 LLM Agent로 시작할 필요가 있는지 검토한다.

첫 버전에서는 Orchestrator가 구조화된 판정 결과를 바탕으로 최종 보고서를 생성해도 된다.

Synthesizer를 별도 Agent로 분리하려면 다음 중 하나가 증명되어야 한다.

- 최종 응답 품질이 명확하게 향상됨
- 문체와 전문 판단을 분리할 필요가 있음
- trace 가독성이 좋아짐
- 별도 평가 기준이 필요함

---

# 5. Agent Definition 표준

모든 에이전트는 코드 안에 제각각 하드코딩하지 않는다.

다음과 같은 공통 정의 구조를 만든다.

```typescript
type AgentDefinition = {
  id: string;
  name: string;
  version: string;
  purpose: string;
  responsibilities: string[];
  nonGoals: string[];
  requiredInputs: string[];
  outputSchema: string;
  allowedTools: string[];
  promptPath: string;
  evaluationSuite: string;
  defaultModelConfig: {
    model: string;
    reasoning?: string;
    temperature?: number;
  };
};

```

각 Agent 폴더에는 최소한 다음이 존재해야 한다.

```text
agents/<agent-id>/
├── definition.ts
├── prompt.md
├── schema.ts
├── examples/
├── eval-cases/
└── README.md

```

각 에이전트 README에는 다음을 기록한다.

- 존재 이유
- 다른 Agent와의 차이
- 입력 및 출력
- 허용된 도구
- 주요 실패 유형
- 현재 알려진 한계
- 평가 지표
- 프롬프트 변경 이력

에이전트가 단순히 같은 모델에 다른 이름만 붙인 것이 되지 않도록 한다.

각 Agent는 최소 하나 이상의 차별점을 가져야 한다.

- 다른 입력 컨텍스트
- 다른 도구
- 다른 출력 스키마
- 다른 평가 기준
- 다른 비목표
- 다른 실패 조건

---

# 6. 구조화된 데이터 모델

다음 개념을 명시적인 스키마로 만든다.

```text
Scenario
CouncilTemplate
AgentDefinition
Persona
Cohort
Run
Round
AgentRun
Claim
Evidence
Assumption
Rebuttal
Revision
Verdict
PersonaEvaluation
MetricScore
TraceEvent

```

핵심 Claim 구조 예시:

```typescript
type Claim = {
  id: string;
  runId: string;
  roundId: string;
  authorAgentId: string;
  text: string;
  claimType: "fact" | "inference" | "assumption" | "recommendation";
  evidenceRefs: string[];
  assumptions: string[];
  confidence: number;
  status:
    | "proposed"
    | "challenged"
    | "revised"
    | "accepted"
    | "conditional"
    | "rejected"
    | "unresolved";
  parentClaimId?: string;
  createdAt: string;
};

```

반박 구조 예시:

```typescript
type Rebuttal = {
  id: string;
  targetClaimId: string;
  authorAgentId: string;
  strongestCounterargument: string;
  failureScenario: string;
  missingEvidence: string[];
  disconfirmingTest: string;
  severity: "low" | "medium" | "high";
  confidence: number;
};

```

최종 판정 예시:

```typescript
type Verdict = {
  claimId: string;
  decision: "accepted" | "conditional" | "deferred" | "rejected";
  rationale: string;
  survivingEvidence: string[];
  unresolvedRisks: string[];
  confidence: number;
};

```

모든 LLM 출력은 Zod 등으로 런타임 검증한다.

스키마 검증 실패 시:

1. 원본 실패를 trace에 기록
2. 제한된 횟수만 재시도
3. 자동 복구 실패 시 해당 AgentRun을 실패 처리
4. 임의의 기본값으로 정상 결과처럼 위장하지 않기

---

# 7. Council 실행 프로토콜

자유로운 그룹 채팅 형태로 만들지 않는다.

다음 상태 머신을 구현한다.

## Round 0: 입력 정규화

- 사용자의 문제
- 목표
- 제약
- 알려진 사실
- 확인되지 않은 가정
- 기대 출력
- 비용 및 라운드 제한

## Round 1: 독립 분석

Analyst, Evidence Checker, Practitioner, Risk Challenger가 서로의 결과를 보지 않고 독립적으로 실행된다.

가능하다면 병렬 실행한다.

앵커링을 방지하기 위해 이 단계에서는 다른 Agent의 결과를 전달하지 않는다.

## Round 2: Claim 정규화

에이전트 출력에서 주장을 추출해 ID를 부여한다.

중복 주장은 병합 후보로 표시하되, 원래 작성자와 출처는 보존한다.

## Round 3: 반박

Falsifier가 중요도가 높은 주장부터 공격한다.

반박 수는 무제한이 아니라 설정된 예산 안에서 제한한다.

우선순위:

1. 최종 결론에 큰 영향을 주는 주장
2. 높은 확신이지만 근거가 약한 주장
3. 비용·보안·실행 가능성과 관련된 주장
4. 에이전트 간 충돌이 있는 주장

## Round 4: 주장 수정

원래 주장을 만든 Agent는 반박을 확인하고 다음 중 하나를 선택한다.

- `maintain`: 유지
- `narrow`: 범위 축소
- `conditionalize`: 조건부 주장으로 수정
- `withdraw`: 철회

변경 전후 내용을 모두 보존한다.

## Round 5: Judge 판정

Judge는 주장별로 다음을 평가한다.

- 근거 적합성
- 논리적 일관성
- 반박 대응 여부
- 불확실성 표현
- 현실적 실행 가능성
- 결론 기여도

## Round 6: Persona Panel

선택된 Persona Cohort가 최종 결과를 평가한다.

평가 항목:

- 이해도
- 신뢰도
- 관련성
- 실행 가능성
- 수용 의향
- 주요 우려
- 이해하지 못한 용어
- 추가로 필요한 정보

## Round 7: 최종 보고서

최종 결과는 다음 구조를 포함한다.

```typescript
type CouncilReport = {
  executiveSummary: string;
  recommendedDecision: string;
  acceptedClaims: Verdict[];
  conditionalClaims: Verdict[];
  rejectedClaims: Verdict[];
  unresolvedDisagreements: string[];
  evidenceGaps: string[];
  majorRisks: string[];
  personaReactions: PersonaEvaluation[];
  nextExperiments: string[];
  overallConfidence: number;
  costSummary: {
    inputTokens: number;
    outputTokens: number;
    estimatedCost?: number;
    durationMs: number;
  };
};

```

---

# 8. 기술 구조

현재 저장소 조사 결과 더 적합한 구성이 없다면 다음 구조를 우선 검토한다.

```text
agent-council/
├── apps/
│   └── web/
├── packages/
│   ├── agents/
│   ├── core/
│   ├── evals/
│   ├── personas/
│   ├── providers/
│   ├── database/
│   └── shared/
├── data/
│   ├── personas/
│   ├── cohorts/
│   ├── scenarios/
│   └── eval-cases/
├── docs/
├── refer/
└── tests/

```

권장 기술:

- TypeScript
- Next.js
- OpenAI Agents SDK 또는 현재 공식 권장 에이전트 SDK
- Zod
- SQLite
- Drizzle ORM
- Vitest
- Playwright
- SSE 기반 실행 이벤트 전달
- React Flow 또는 동등한 그래프 라이브러리
- Recharts 또는 동등한 차트 라이브러리
- CSS Variables + SCSS Modules 또는 기존 스타일 구조

주의사항:

- API Key는 반드시 서버에서만 사용
- `.env.example` 제공
- 모델 이름을 코드 여러 곳에 하드코딩하지 않기
- provider 인터페이스 분리
- 실행 취소와 timeout 지원
- Agent별 토큰 및 비용 제한
- 최대 토론 라운드 제한
- 동시 실행 수 제한
- 재시도 정책 중앙 관리
- 개인 데이터와 비밀값을 trace에 그대로 저장하지 않기
- `refer/`가 클라이언트 번들 또는 배포 결과에 포함되지 않게 하기

---

# 9. MatrAIx Adapter

MatrAIx 데이터를 직접 애플리케이션 핵심 타입으로 사용하지 않는다.

다음 경계를 만든다.

```text
refer/MatrAIx 원본
        ↓
Reference Scanner
        ↓
MatrAIx Adapter
        ↓
프로젝트 자체 Persona Schema
        ↓
Cohort 및 Persona Panel

```

Adapter는 다음을 수행한다.

- 필요한 속성만 추출
- 누락값 처리
- 프로젝트 내부 ID 생성
- 원본 파일 경로 기록
- 변환 버전 기록
- 사용하지 않은 민감하거나 불필요한 속성 제외
- 모델 프롬프트에 필요한 최소 속성만 전달

Persona의 연령, 성별, 지역과 같은 인구통계 속성은 과제에 실제 영향이 있을 때만 사용한다.

고정관념을 강화할 가능성이 있는 속성을 무조건 행동 특성으로 변환하지 않는다.

초기에는 MatrAIx 전체 데이터가 아닌 실제 조사된 개발 샘플 중 12~30명을 선별해 사용한다.

추가로 발표용 한국형 Persona를 12명 정도 만든다.

예:

- AI 활용을 시작한 비개발자 대표
- 실무 프론트엔드 개발자
- 레거시 시스템 담당자
- AI Transformation PM
- 보안 담당자
- 서비스 운영 담당자
- 비용에 민감한 의사결정자
- 빠른 결론을 선호하는 사용자
- 구체적인 근거를 선호하는 사용자
- 새로운 기술에 회의적인 사용자
- 개인정보 노출을 우려하는 사용자
- 단계별 설명을 선호하는 사용자

---

# 10. 에이전트가 실제로 쓸모 있는지 평가하는 방법

가장 중요한 요구사항이다.

“답변이 그럴듯하다”는 평가 기준으로 사용하지 않는다.

## 10.1 Baseline

동일한 문제를 다음 두 방식으로 실행한다.

- Baseline: 범용 단일 Agent
- Experiment: Agent Council

입력 조건과 모델 조건은 최대한 동일하게 유지한다.

## 10.2 평가 지표


| 지표                      | 측정 내용                     |
| ----------------------- | ------------------------- |
| Task Success            | 사용자의 핵심 문제에 답했는가          |
| Groundedness            | 근거 없는 주장을 사실처럼 제시하지 않았는가  |
| Assumption Detection    | 숨겨진 가정을 찾아냈는가             |
| Contradiction Detection | 주장 간 모순을 발견했는가            |
| Falsification Quality   | 강한 반례와 반증 테스트를 만들었는가      |
| Actionability           | 사용자가 실행할 다음 행동이 구체적인가     |
| Calibration             | 확신 수준이 근거 강도에 적절한가        |
| Role Adherence          | 자신의 전문 역할을 벗어나지 않았는가      |
| Redundancy              | 다른 Agent와 같은 말만 반복하지 않았는가 |
| Stability               | 반복 실행 시 결론이 지나치게 흔들리지 않는가 |
| Cost                    | 토큰과 추정 비용                 |
| Latency                 | 전체 실행 시간                  |


## 10.3 Agent별 평가

각 Agent는 별도 테스트를 가진다.

예를 들어 Falsifier는 다음을 평가한다.

- 실제 핵심 주장을 공격했는가?
- 단순한 부정 의견이 아니라 반례를 제시했는가?
- 주장을 반증할 수 있는 테스트를 제안했는가?
- 이미 다른 Agent가 말한 위험을 반복하지 않았는가?

Judge는 다음을 평가한다.

- 표현이 강한 주장에 편향되지 않았는가?
- 근거 없는 다수 의견을 채택하지 않았는가?
- 반박 후 수정된 주장을 정확히 추적했는가?
- 기각된 주장을 최종 보고서에서 다시 사용하지 않았는가?

## 10.4 초기 Eval Case

최소 6개의 실제 사례를 만든다.

- 교육회사에서 Slack/Jandi 대체 서비스를 자체 구축해야 하는가?
- iOS 키보드 노출 시 fixed header 위치 문제는 버그인가?
- Figma 일부 노드를 확인하지 못한 상태에서 구현을 진행해도 되는가?
- GSAP pin과 Swiper를 한 섹션에서 함께 사용할 때의 위험은 무엇인가?
- 소규모 AI 동아리의 운영 방식을 어떻게 개선할 것인가?
- 새로운 AI MVP 아이디어가 실제 문제를 해결하는가?

각 케이스에는 다음을 기록한다.

```text
문제
확인된 사실
반드시 찾아야 하는 위험
피해야 하는 잘못된 단정
좋은 답변의 최소 조건
허용 가능한 결론
평가 루브릭

```

## 10.5 품질 통과 조건

초기 Agent를 “쓸모 있다”고 판단하기 위한 최소 기준을 정한다.

예:

- 역할 준수율 90% 이상
- 구조화 출력 성공률 95% 이상
- 근거 없는 핵심 주장 수가 Baseline보다 감소
- 실패 시나리오 발견 수가 Baseline보다 증가
- 실행 가능한 다음 행동 점수가 Baseline 이상
- 동일 Agent 간 불필요한 중복률 30% 이하
- 치명적인 판단 오류 0건
- 비용과 실행 시간이 UI에 투명하게 표시됨

Council이 Baseline보다 의미 있게 낫지 않다면 에이전트를 추가하지 않는다.

먼저 다음을 조정한다.

- 프롬프트
- 입력 컨텍스트
- 도구
- 출력 스키마
- 라운드 순서
- Agent 간 책임 경계

---

# 11. 시각화 화면

UI는 에이전트의 말풍선을 나열하는 채팅 앱처럼 만들지 않는다.

핵심은 판단이 어떻게 변했는지 보여주는 것이다.

## 11.1 Dashboard

표시 내용:

- 최근 실행
- 성공/실패 상태
- 평균 비용
- 평균 실행 시간
- Agent별 품질 점수
- Baseline 대비 개선
- 자주 발생한 실패 유형

## 11.2 Agent Library

각 Agent를 카드로 표시한다.

- 이름
- 역할
- 버전
- 주요 능력
- 허용 도구
- 현재 평가 점수
- 최근 변경
- 주요 실패 유형
- 사용 중인 Council Template

Agent 상세 화면에서는 다음을 제공한다.

- Prompt
- Input/Output Schema
- Eval 결과
- 변경 이력
- 실패 사례
- 실행 trace
- 다른 Agent와의 중복도

## 11.3 New Analysis

사용자가 설정할 수 있는 항목:

- 분석 문제
- 추가 컨텍스트
- Council Template
- 참여 Agent
- Persona Cohort
- 모델
- 최대 반박 수
- 최대 비용
- 외부 검색 허용 여부

## 11.4 Live Council

토큰 단위 텍스트 스트리밍보다 의미 있는 이벤트를 보여준다.

예:

```text
입력 정규화 완료
Analyst 독립 분석 완료
Practitioner 제약 조건 4개 발견
Evidence Checker 근거 부족 주장 3개 발견
Falsifier 핵심 주장 2개 반박
Analyst 주장 1개 조건부 수정
Judge 4개 채택, 2개 보류, 1개 기각
Persona Panel 평가 진행 중
최종 보고서 생성 완료

```

## 11.5 Claim Map

그래프로 다음 관계를 표현한다.

- 최초 주장
- 근거
- 반박
- 수정된 주장
- 최종 판정

노드 색상만으로 상태를 표현하지 말고 라벨과 아이콘을 함께 사용한다.

Claim이 많아지면 다음 필터를 제공한다.

- Agent
- 상태
- 중요도
- 신뢰도
- 라운드
- 근거 부족 여부

## 11.6 Debate Replay

시간 순서대로 다음을 재생한다.

```text
최초 주장
→ 반박
→ 작성자의 응답
→ 수정 또는 철회
→ Judge 판정

```

실제 발표 중 API 실패에 대비해 사전에 성공한 실행을 재생할 수 있는 Replay Mode를 만든다.

Replay Mode는 실제 실행 데이터와 동일한 렌더링 경로를 사용한다.

## 11.7 Persona Panel

사용자군별 다음 지표를 비교한다.

- 이해도
- 신뢰도
- 실행 의향
- 관련성
- 주요 우려

전체 평균만 보여주지 말고 사용자군 간 격차를 보여준다.

## 11.8 Baseline Comparison

발표에서 가장 중요한 화면이다.


| 평가 항목        | 단일 Agent | Agent Council |
| ------------ | --------: | -------------: |
| 근거 없는 주장     | 값        | 값             |
| 확인한 가정       | 값        | 값             |
| 발견한 실패 시나리오  | 값        | 값             |
| 수정·철회된 주장    | 값        | 값             |
| 실행 가능한 다음 단계 | 값        | 값             |
| 비용           | 값        | 값             |
| 응답 시간        | 값        | 값             |


Council이 불리한 비용과 속도도 숨기지 않는다.

---

# 12. 디자인 방향

발표용으로 깔끔하고 전문적인 제품 형태로 만든다.

- Toss 계열의 정돈된 SaaS 대시보드 분위기
- 흰색 또는 매우 옅은 회색 배경
- 차콜 계열 본문
- 하나의 단색 포인트 컬러
- 불필요한 AI 그라데이션 금지
- 과도한 글로우 효과 금지
- 과도한 유리 질감 금지
- 적절한 여백과 명확한 정보 계층
- 카드 테두리는 절제
- 애니메이션은 상태 변화 이해에 필요한 범위만 사용
- 데스크톱 발표 환경 우선
- 핵심 화면은 태블릿까지 대응
- 그래프가 없는 상황에서도 표와 목록으로 정보를 이해할 수 있게 구성

---

# 13. 구현 단계

## Phase 0: 조사 및 설계

산출물:

- `docs/[reference-audit.md](http://reference-audit.md)`
- `docs/[architecture-decisions.md](http://architecture-decisions.md)`
- `docs/[domain-model.md](http://domain-model.md)`
- `docs/[evaluation-strategy.md](http://evaluation-strategy.md)`
- `docs/[implementation-plan.md](http://implementation-plan.md)`

완료 조건:

- `refer/` 재사용 범위가 명시됨
- Agent와 Persona 경계가 정의됨
- 초기 Agent 6개의 역할 중복이 검토됨
- 첫 vertical slice가 확정됨
- 주요 기술 선택 이유가 기록됨

## Phase 1: 실행 기반

구현:

- 공통 스키마
- Agent Registry
- Prompt Registry
- Provider 인터페이스
- Run/Trace 저장
- 구조화 출력 검증
- timeout/retry/cancel
- SQLite 데이터베이스
- `.env.example`

완료 조건:

- 단일 Agent 실행 가능
- 성공과 실패가 DB에 기록됨
- 스키마 실패를 재현할 수 있음
- mock provider로 테스트 가능

## Phase 2: 첫 번째 유용한 Agent

Analyst와 Falsifier를 먼저 완성한다.

완료 조건:

- Analyst가 구조화된 주장을 생성
- Falsifier가 주장 ID를 기준으로 반박
- 주장 수정 이력이 저장
- 최소 3개의 eval case 통과
- UI 없이도 테스트와 CLI 또는 API로 실행 가능

## Phase 3: Council Engine

추가:

- Evidence Checker
- Practitioner
- Risk Challenger
- Judge
- 독립 병렬 분석
- Claim 정규화
- 반박 및 수정
- 최종 판정

완료 조건:

- 전체 상태 머신 실행 가능
- 최대 라운드 및 비용 제한 작동
- 중간 실패가 전체 실행을 무조건 손상시키지 않음
- 실행 결과가 재현 가능한 JSON으로 저장

## Phase 4: Persona Adapter와 Panel

구현:

- MatrAIx Adapter
- 선별 Persona
- 한국형 Persona
- Cohort
- Persona Panel 평가

완료 조건:

- Persona와 Agent가 코드와 UI에서 명확히 분리
- 전체 원본 데이터를 프롬프트에 넣지 않음
- 원본 출처와 변환 이력이 추적됨

## Phase 5: 평가 시스템

구현:

- Baseline 실행
- Council 실행
- Agent별 eval
- Council 전체 eval
- Metric 계산
- 반복 실행 비교
- 회귀 테스트

완료 조건:

- 동일 입력으로 Baseline과 Council 비교 가능
- Agent별 실패 사례 확인 가능
- 프롬프트 버전별 결과 비교 가능
- 품질·비용·속도를 동시에 확인 가능

## Phase 6: 시각화

구현:

- Dashboard
- Agent Library
- New Analysis
- Live Council
- Claim Map
- Debate Replay
- Persona Panel
- Baseline Comparison
- Final Report

완료 조건:

- DB의 실제 실행 데이터를 표시
- 하드코딩된 데모 결과와 실제 결과를 구분
- Replay fixture가 실제 실행과 동일한 UI 경로 사용
- 로딩, 빈 상태, 오류 상태 구현

## Phase 7: 발표 품질 마무리

구현:

- 대표 데모 시나리오
- 성공 실행 fixture
- Markdown/JSON 내보내기
- README
- 아키텍처 설명
- 데모 실행 절차
- 스크린샷 또는 발표용 캡처
- 테스트와 빌드 검증

---

# 14. 첫 번째 Vertical Slice

첫 번째 데모 문제는 다음을 사용한다.

> 교육회사가 Slack이나 Jandi 대신 사용할 내부 협업 서비스를 자체 구축해야 하는가?

사용할 Agent:

- Analyst
- Evidence Checker
- Practitioner
- Risk Challenger
- Falsifier
- Judge

사용할 Persona Cohort:

- 교육회사 대표
- 비개발자 PM
- 실무 개발자
- 서비스 운영자
- 보안 담당자
- 비용에 민감한 의사결정자

이 시나리오 하나로 다음을 증명한다.

- 독립 분석
- 관점 충돌
- 근거 부족 탐지
- 구축 비용과 운영 부담
- 보안 위험
- 반례
- 주장 수정
- 조건부 결론
- 사용자군별 수용도 차이
- 단일 AI와 Council 비교

---

# 15. 초기 범위에서 제외할 것

다음 기능은 1차 버전에서 구현하지 않는다.

- Persona 1M 전체 사용
- 자동 페르소나 생성
- 에이전트 자동 생성
- 웹·iOS·macOS 컴퓨터 제어
- 무제한 Agent 자유 토론
- 사용자별 회원가입과 권한 관리
- 조직 단위 멀티테넌시
- 결제
- 복잡한 협업 기능
- 여러 모델 제공자 동시 지원
- 전체 MatrAIx Viewer 복제
- 전체 MatrAIx Playground 복제
- 원본 실행 환경 재구현

추후 확장을 막지 않는 인터페이스까지만 설계한다.

---

# 16. 개발 원칙

- 기존 저장소 파일을 먼저 조사하고 추측하지 않는다.
- `refer/`는 기본적으로 읽기 전용으로 취급한다.
- 원본과 자체 구현의 경계를 명확히 한다.
- 가짜 평가 결과를 실제 결과처럼 표시하지 않는다.
- UI부터 만들고 실행 엔진을 나중에 끼워 맞추지 않는다.
- 먼저 CLI/API에서 vertical slice를 증명한 뒤 시각화한다.
- LLM 출력은 항상 구조화하고 검증한다.
- 모든 주장, 반박, 수정, 판정에 ID를 부여한다.
- 원본 출력과 정규화된 결과를 구분해 저장한다.
- 비용, 토큰, 시간, 오류를 trace에 포함한다.
- 독립 분석 단계의 컨텍스트 격리를 테스트한다.
- Judge가 기각한 주장이 최종 보고서에 다시 등장하지 않는지 검증한다.
- Agent 추가는 eval로 가치가 증명될 때만 허용한다.
- 관련 없는 기존 파일을 수정하지 않는다.
- lint, typecheck, unit test, integration test, build를 실행한다.
- 테스트하지 못한 항목은 완료했다고 표현하지 않는다.

---

# 17. Codex 작업 방식

다음 방식으로 진행하라.

1. 저장소와 `refer/`를 조사한다.
2. 현재 구조와 재사용 후보를 요약한다.
3. Socratic 질문에 대한 설계 결정을 문서화한다.
4. 구현 계획과 예상 변경 파일을 제시한다.
5. Phase 0 문서를 작성한다.
6. Phase 1 기반 구조를 구현한다.
7. Analyst → Falsifier vertical slice를 먼저 완성한다.
8. 테스트를 실행한다.
9. 변경 파일, 실행 방법, 테스트 결과, 남은 위험을 보고한다.
10. 이후 Phase 3 이상을 순서대로 진행한다.

막히지 않는 사소한 선택은 합리적인 기본값으로 결정하고 문서에 기록한다.

다음과 같은 중요한 선택만 작업을 중단하고 질문한다.

- 저장소의 기존 기술 구조와 제안 구조가 크게 충돌하는 경우
- 데이터 삭제나 대규모 마이그레이션이 필요한 경우
- 라이선스 또는 출처 조건이 불명확한 경우
- API 비용이 크게 발생할 수 있는 경우
- 프로젝트 핵심 목표를 바꾸는 선택이 필요한 경우

---

# 18. 최종 완료 기준

다음을 모두 만족해야 첫 발표 버전이 완료된 것으로 본다.

- 전문 Agent 6개가 실제로 실행됨
- 각 Agent의 책임과 출력이 구분됨
- Agent별 eval case가 존재함
- Agent 간 독립 분석이 보장됨
- 주장 단위 반박·수정·판정이 저장됨
- Persona와 Agent가 분리됨
- MatrAIx 데이터가 Adapter를 거쳐 사용됨
- Baseline과 Council 비교가 가능함
- 비용과 실행 시간이 표시됨
- Claim Map이 실제 데이터를 시각화함
- Debate Replay가 작동함
- 발표용 성공 fixture가 존재함
- 오류·빈 상태·취소 상태가 구현됨
- README만 보고 로컬 실행 가능함
- lint, typecheck, test, build가 통과함
- Council이 유용한 조건과 유용하지 않은 조건을 정직하게 설명함

최종적으로 다음 질문에 결과와 수치로 답할 수 있어야 한다.

> “여러 Agent를 사용했기 때문에 단일 AI보다 정확히 무엇이 좋아졌으며, 그 개선이 추가 비용과 시간을 감수할 정도로 가치 있는가?”

