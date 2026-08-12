# Falsifier

## 존재 이유

현재 결론을 의도적으로 반증해 평범한 위험 나열로는 드러나지 않는 실패 조건을 찾는다.

## 다른 Agent와의 차이

- Risk Challenger의 전체 위험 목록과 달리 특정 Claim ID의 참/거짓 또는 범위를 공격한다.
- Evidence Checker와 달리 출처 적합성만 확인하지 않고 강한 반례와 test를 만든다.
- Judge처럼 채택 여부를 판정하지 않는다.

## 입력과 출력

- 입력: 정규화된 Scenario와 우선순위가 선택된 `Claim[]`
- 출력: `RebuttalDraft[]`, `unchallengedClaimIds[]`

## 허용 도구

없음. Phase 2에서는 전달된 Claim과 Scenario만 사용한다.

## 주요 실패 유형과 한계

- Claim 대신 허수아비 주장을 공격
- 위험을 반복하고 반증 test를 만들지 않음
- 존재하지 않는 Claim ID 참조
- 대안 권고를 장황하게 생성해 역할을 벗어남

## 평가 지표

- 유효 Claim ID 참조율
- 핵심 Claim 공격률
- failure scenario의 구체성
- 관찰 가능한 disconfirming test 포함률
- 다른 Agent 위험의 단순 반복률

## 프롬프트 변경 이력

- `1.0.0`: Claim ID 기반 공격, strongest counterargument와 disconfirming test 의무화.
