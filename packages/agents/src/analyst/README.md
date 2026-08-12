# Analyst

## 존재 이유

사용자 문제를 바로 결론으로 압축하지 않고 목표, 제약, 사실, 가정과 검증 가능한 Claim으로 바꾼다. 반박 이후에는 원주장의 소유자로서 명시적인 Revision을 만든다.

## 다른 Agent와의 차이

- Falsifier처럼 결론을 공격하지 않고 최초 문제 구조와 Claim을 소유한다.
- Evidence Checker처럼 출처 자체를 검증하지 않고 근거가 필요한 위치를 표시한다.
- Practitioner/Risk Challenger의 전문 영역을 대신 결론 내리지 않는다.

## 입력과 출력

- analysis 입력: 정규화된 `Scenario`
- analysis 출력: `problemFrame`, `ClaimDraft[]`, `recommendation`, `informationGaps`
- revision 입력: `Claim + Rebuttal` pair
- revision 출력: `RevisionDraft[]`

## 허용 도구

없음. Phase 2에서 외부 검색이나 파일 접근을 허용하지 않는다.

## 주요 실패 유형과 한계

- 입력에 없는 사실을 보충하는 환각
- 여러 Claim을 한 문장에 합치는 문제
- 전문 Agent의 책임을 선점하는 과도한 결론
- 작은 로컬 모델에서 schema 누락 또는 action/revisedText 불일치

## 평가 지표

- 구조화 출력 성공률
- 사실/추론/가정 분류 정확성
- Claim 구체성과 비중복성
- non-goal 준수
- 반박과 Revision action의 정합성

## 프롬프트 변경 이력

- `1.0.0`: analysis/revision 모드, 근거 없는 출처 금지, 네 가지 Revision action 도입.
