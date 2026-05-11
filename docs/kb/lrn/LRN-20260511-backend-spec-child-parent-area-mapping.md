# LRN-20260511 Backend Spec Missed Child/Parent Area Mapping

## Symptom

- S-025/S-025a 백엔드 스펙 작성 시 충돌 다이얼로그, sync indicator, OAuth/복구 코드/계정 삭제 UI 등을 어른 멘탈 모델 그대로 어린이 영역에 노출하도록 설계했음.
- `/ux_review`에서 차단 4건이 도출됨: 텍스트 라벨 + timestamp 비교 다이얼로그가 4–6세 non-reader 사용 불가, sync indicator 빨강 점멸이 어린이 불안 유발, 412 conflict 다이얼로그가 어린이 워크플로 중단, 부모/어린이 영역 분리 정책 부재.

## Root Cause

- Direct cause: 백엔드/동기화 스펙을 “결정 항목별 추천/근거/대안/검증”으로 구조화하면서, 결정 항목마다 “페르소나 노출 여부 / 영역 게이팅”을 함께 묻지 않았음. 페르소나 합치 검토를 마지막에 몰아서 하면 늦음.
- Structural cause: 페르소나 정보가 `S-023`, `S-021`, `S-024`에 흩어져 있고 백엔드 스펙 템플릿에는 페르소나 hook이 없어, 백엔드 작업 시 “어린이/부모 영역 분리”가 자동으로 떠오르지 않음.

## Fix or Recovery

- S-025에 “어린이/부모 영역 분리 정책” 매핑 표를 신설하고, 모든 결정 항목과 하위 스펙이 이 표를 상속하도록 함.
- S-025a의 충돌 다이얼로그를 어린이 영역에서 제거(자동 안전 보존 모드)하고, 부모 영역 카드로 옮김. `merge`는 OAuth 연결 전까지 렌더하지 않음.
- sync indicator/오류 메시지/계정 UI/복구 코드 트리거를 모두 부모 영역으로 게이팅. sprite GET 실패 시 어린이 영역에는 회색 실루엣 + 거품 placeholder fallback.

## Prevention Rule

- 백엔드/동기화/계정/오류 처리 스펙을 작성할 때 각 결정 항목 옆에 **“노출 영역: 어린이 / 부모 / 없음”**을 명시한다. 결정 본문 외에 스펙 상단에 **부모/어린이 영역 매핑 표**를 두고 모든 항목을 한 줄씩 매핑한다.

## Harness Target

- `docs/spec/_template.md`에 백엔드/시스템 스펙용 “부모/어린이 영역 매핑 표” 섹션 옵션 추가 후보.
- 새 ADR 후보: 부모/어린이 영역 분리 정책을 단일 source of truth(`docs/kb/adr/ADR-YYYYMMDD-parent-vs-child-area.md`)로 박고 `S-023/S-024/S-025` 모두 참조하도록.
- `/ux_review` 스킬 입력 체크리스트에 “결정 항목별 페르소나 노출 영역이 명시되었는지” 확인 항목 추가.

## Repetition Signal

- first occurrence (백엔드 스펙은 본 프로젝트에서 처음). 페르소나 출처 오인은 `docs/kb/lrn/LRN-20260510-design-md-is-not-product-persona.md`와 같은 계열.

## Related Sources

- Files: `docs/spec/S-025-backend-foundation.md`, `docs/spec/S-025a-device-id-and-storage-adapter.md`
- Spec: `docs/spec/S-023-onboarding.md`, `docs/spec/S-021-magic-moment.md`, `docs/spec/S-024-touch-target-upgrade.md`
- Related LRN: `docs/kb/lrn/LRN-20260510-design-md-is-not-product-persona.md`
- Branch: `claude/backend-system-prompt-OWzwe`
