# S-025c 복구 코드 (Recovery Code)

## 상태

- 상태: ready
- 구현 여부: not-started
- 검증 여부: not-tested

## 부모 / 의존 스펙

- 부모: `docs/spec/S-025-backend-foundation.md` (ready) — 결정 항목 2(디바이스 ID 분실 흐름), 3(저장소: `recovery:<hash>` 키), 4(API 표면).
- 의존: `docs/spec/S-025a-device-id-and-storage-adapter.md` (draft) — owner 재매핑 후 GET/PUT 흐름은 S-025a 어댑터 위에서 동작.
- 호스트: `docs/spec/S-026-parent-area-gate.md` (draft) — `parent.recovery` 슬롯에 발급/입력 UI를 둔다. 재발급/사용은 hold-to-confirm 2s 이중 게이트.
- 무관: 본 스펙은 OAuth(S-025d)에 의존하지 않는다. **OAuth 없이도** 어린이 어항을 새 기기로 옮기는 부모 흐름을 단독으로 제공한다.

본 스펙은 S-025 매핑 표를 상속한다. **발급/표시/입력은 모두 부모 영역에서만** 일어난다. 어린이 영역에는 어떤 복구 코드 UI도 노출되지 않는다.

## 목표

- 디바이스 분실/브라우저 데이터 초기화 시, **OAuth 없이도** 부모가 새 기기에서 같은 어항을 이어 쓸 수 있는 한 번의 텍스트 코드를 발급한다.
- 코드는 부모만 보고 보관하며, 어린이는 코드의 존재 자체를 인지하지 않는다.
- 어린이 우발 발급/사용 가능성을 0으로 만든다(부모 영역 게이트 + 이중 hold-to-confirm).
- 코드의 평문은 서버에 저장되지 않는다(`recovery:<sha256(code)>` 해시 키).

## 범위

- 포함:
  - 코드 포맷: **단어-단어-2자리 숫자** (예: `frog-bubble-42`). 큐레이트된 단어 풀(약 200~500개)에서 충돌 확률 무시 가능한 조합 추첨.
  - 단일 활성 코드: 한 어항당 활성 코드는 항상 1개. 재발급 시 이전 코드는 즉시 무효화.
  - 코드 만료: 발급 후 **30일** 또는 사용 즉시.
  - API:
    - `POST /api/recovery-code` — 부모 영역 게이트 후 호출, 새 코드를 발급해 응답에 plain text 코드를 **1회만** 반환. 서버는 sha256 해시만 저장.
    - `POST /api/recovery-redeem` — `{ code, newDeviceId }`로 owner 재매핑. 성공 시 코드 즉시 무효화.
  - KV 스키마(S-025 결정 3 보강):
    - `recovery:<sha256(code)>` → `{ aquariumId, expiresAt, issuedAt }`.
    - `recovery-active:<aquariumId>` → `<sha256(code)>` (재발급 시 이전 활성 코드를 무효화하기 위한 역인덱스).
  - 부모 영역 `parent.recovery` 슬롯:
    - “복구 코드 발급” 버튼(hold-to-confirm 2s, 재발급 시 이전 코드가 무효화됨을 단조 톤으로 안내).
    - 발급 직후 **큰 글씨 코드** + 복사 버튼 + “이 코드를 부모님이 보관하세요” 안내. **한 번만 보이고 다시는 보이지 않는다**(평문 미저장).
    - “복구 코드로 어항 가져오기” 버튼 → 코드 입력 필드 + 가져오기 hold-to-confirm 2s.
    - 새 기기에서 기존 어린이가 이미 그린 어항이 있을 경우 “이 태블릿의 어항을 새로 가져온 어항으로 바꾸시겠어요?” hold-to-confirm 2s.
  - 어린이 영역 영향:
    - 코드 redeem 후 어린이 영역은 새로 받은 어항으로 자연스럽게 교체된다(빈 어항이었던 경우)/덮어쓰여진다(이미 어항이 있던 경우).
    - sprite 로딩 지연 시 회색 실루엣 + 거품 placeholder fallback(S-025a 재사용).
  - 한도/남용 방지:
    - 디바이스당 발급 빈도 1회/시간.
    - redeem 시도 5회/분/IP, 실패 5회 누적 시 30분 cooldown.
  - 테스트:
    - 코드 추첨 분포(단어 풀 충돌 확률), sha256 해시 검증, 만료/사용 시 무효화, 재발급 시 이전 코드 무효화, rate limit 분기.

- 제외:
  - 복구 코드의 SMS/이메일 자동 전송(부모가 직접 보관/입력).
  - QR 코드/딥링크(미래 스펙 후보).
  - 어린이 영역에서의 코드 발급/입력 노출.
  - “두 기기에서 같이 살아있는” 시나리오 — 본 스펙은 **기기 이전 전용**. OAuth 흐름(S-025d) 책임.
  - 멀티 프로필(형제 시나리오) — S-025f 후보.

## 사용자 흐름

### 어린이 흐름

1. 어린이는 복구 코드의 존재를 모른다. 어떤 코드 UI도, 안내도 보지 않는다.
2. 부모가 새 기기에서 코드를 사용하면 어린이 영역에 어항이 “복원”되며, sprite 로딩 지연 시 회색 실루엣 + 거품 placeholder가 잠시 보이다가 자연스럽게 교체된다.

### 부모 흐름 — 코드 발급

1. 부모가 부모 영역에 진입한다(S-026 게이트).
2. `parent.recovery` 슬롯에서 “복구 코드 발급” 버튼을 본다.
   - 처음 발급이면 “이 어항을 다른 기기에서 다시 열기 위한 코드를 만듭니다”.
   - 이미 활성 코드가 있다면 “기존 코드를 새 코드로 바꿉니다(이전 코드는 즉시 무효화됩니다)”.
3. 버튼을 **2초 hold-to-confirm**.
4. 응답에 plain text 코드가 큰 글씨로 한 번 표시된다(`frog-bubble-42`). 복사 버튼 1회 사용 가능.
5. 부모가 화면을 닫으면 코드는 다시 표시되지 않는다(서버에 평문 미저장).

### 부모 흐름 — 코드 사용(새 기기)

1. 새 기기에서 앱을 처음 연다. 어린이는 빈 어항 또는 자기가 그린 새 어항을 본다.
2. 부모가 부모 영역에 진입한다(S-026 게이트).
3. `parent.recovery`에서 “복구 코드로 어항 가져오기” 입력 필드에 코드를 입력한다.
4. **가져오기 hold-to-confirm 2s**.
5. 새 기기에 이미 그린 어항이 있다면 추가 confirm “이 태블릿의 어항을 새로 가져온 어항으로 바꾸시겠어요?” hold-to-confirm 2s.
6. 성공 시 어린이 영역의 어항이 자연스럽게 교체된다. 부모는 단조 톤 성공 알림을 본다.
7. 실패 시(잘못된 코드/만료/cooldown) 부모 가독성 메시지가 표시된다. 어린이 영역은 영향 없다.

## UI/상태 요구사항

- 어린이 영역:
  - 복구 코드 발급/입력/표시 UI **없음**.
  - 코드 사용 직후 어항 교체에 따른 sprite 로딩은 S-025a fallback(회색 실루엣 + 거품) 재사용.
- 부모 영역 `parent.recovery` 슬롯:
  - “복구 코드 발급” 버튼(2s hold-to-confirm).
  - 발급 직후 큰 글씨(예: 32–40px) 단색 코드 + 복사 버튼 1개. 코드는 한 번만 표시.
  - “복구 코드로 어항 가져오기” 입력 필드 + 가져오기 버튼(2s hold-to-confirm).
  - 덮어쓰기 confirm 다이얼로그(2s hold-to-confirm). 어항 두 본의 시각 미리보기 사용(S-025a 충돌 카드 스타일 재사용).
  - 모든 상태 표시는 단조 색 변화, 점멸 없음.
- 필요한 상태:
  - 클라이언트 메모리: `appState.recovery = { phase: 'idle'|'issuing'|'showing'|'redeeming'|'overwrite-confirm'|'done'|'error', issuedCode?: string, lastError?: { code, message } }`.
  - `issuedCode`는 메모리에만 보관. 부모 영역 닫힘 시 즉시 폐기.
  - localStorage 영속화 없음.
- 모션/접근성:
  - 코드 표시 화면은 정적. 복사 성공 시 0.5s 단조 색 변화 1회.
  - hold-to-confirm은 S-026의 동일 패턴(ring fill, prefers-reduced-motion 시 fade-fill).

## 어린이/부모 영역 매핑(S-025 표 보강)

| 기능 | 어린이 영역 | 부모 영역 | 비고 |
| --- | --- | --- | --- |
| 복구 코드 발급 | 노출 안 함 | `parent.recovery` + 2s hold-to-confirm | 평문 1회만 표시 |
| 복구 코드 표시 | 노출 안 함 | 큰 글씨 + 복사 1회 | 닫으면 다시 못 봄 |
| 코드 입력 | 노출 안 함 | `parent.recovery` 입력 + 2s hold | 텍스트 입력 부모 가독성 OK |
| 새 기기에서 덮어쓰기 confirm | 노출 안 함 | 시각 미리보기 + 2s hold | 어린이의 새 그림 보호 |
| 코드 사용 후 어항 교체 | sprite fallback만 노출 | 단조 톤 성공 메시지 | 어린이 정서 보존 |
| 실패(잘못된 코드/만료/cooldown) | 노출 안 함 | `parent.recovery` 카드 안내 | 부모 가독성 메시지 |

## 구현 메모

- 디렉터리 구조(추가/이동):
  - 신규: `src/features/recovery/index.js`, `state.js`, `view.js`, `events.js` — 부모 영역 슬롯 컴포넌트.
  - 신규: `api/recovery-code.js`, `api/recovery-redeem.js`.
  - 신규: `api/_lib/recoveryCode.js` — 단어 풀, 추첨, sha256 해시 helper.
  - 신규: `api/_lib/recoveryCode.test.js`(혹은 동일 디렉터리 vitest) — 추첨 분포/해시 검증.
  - 변경: `src/features/aquarium/storage/sync.js` — redeem 성공 후 어항 GET 트리거 + 어린이 영역 교체 wiring.
  - 변경: `src/features/parent-area/view.js` — `parent.recovery` 슬롯 호출.
- 코드 추첨/해시:
  - 단어 풀은 어린이 친화 단어(동물/색/자연/요리) 200~500개. 비속어 필터링.
  - 두 단어 + 2자리 숫자 = 약 200² × 100 = 4M 조합(2단어 풀 200 기준). 충돌 확률은 무시 가능. 풀이 500이면 25M 조합.
  - 서버는 plain code를 응답에 1회만 반환하고, 내부에는 `recovery:<sha256(code)>`만 저장. plain code 로그도 남기지 않는다.
- KV 키 스키마(부모 스펙 결정 3 보강):
  - `recovery:<sha256(code)>` → `{ aquariumId, expiresAt: ISO8601, issuedAt: ISO8601 }`.
  - `recovery-active:<aquariumId>` → `<sha256(code)>`. 재발급 시 이 키의 이전 값(이전 해시) 키를 즉시 삭제.
  - redeem 성공 시 두 키 모두 즉시 삭제.
- 만료/cooldown:
  - 발급 시 `expiresAt = issuedAt + 30d`.
  - redeem 시 `now > expiresAt`이면 400 + `error.code = 'expired'`.
  - rate limit:
    - 발급: 1회/시간/디바이스.
    - redeem: 5회/분/IP + 5회 실패 누적 시 30분 cooldown(`recovery-cooldown:<ip>` 키).
- redeem 흐름:
  - 클라이언트가 `{ code, newDeviceId }`로 요청.
  - 서버 원자성: KV는 다중 키 트랜잭션을 보장하지 않으므로 다음 패턴으로 race를 차단한다.
    1. `recovery-lock:<hash> = newDeviceId, NX, EX=10s` (SETNX 락 획득). 실패(이미 잠금) → 409 `code = 'in_progress'`.
    2. `recovery:<hash>` GET → 부재면 락 해제 후 400 `code = 'not_found'`. 만료면 락 해제 후 400 `code = 'expired'`.
    3. 다음 키들을 차례로 갱신(부모 스펙 “4가지 키 일관성” 정책의 표준 순서):
       - 기존 owner의 `oldDeviceId`를 알기 위해 `owner:<aquariumId>` GET.
       - `owner:<aquariumId> = { deviceId: newDeviceId, accountId? }`(기존 `accountId` 그대로 유지 — S-025d 통합 항목).
       - `device:<newDeviceId> = { aquariumId, createdAt, lastSeenAt }` upsert.
       - `device:<oldDeviceId>` 삭제(이전 디바이스는 더 이상 이 어항을 소유하지 않음).
       - **이전 디바이스 OAuth link도 정리**: `deviceAccountLink:<oldDeviceId>` 삭제(stale 매핑 제거). `accountId`가 있었다면 `account:<accountId>.linkedDeviceIds`에서 `oldDeviceId` 제거 + `newDeviceId` 추가.
       - `recovery:<hash>` 및 `recovery-active:<aquariumId>` 삭제.
    4. 락 해제(키 자체는 EX=10s로 자연 만료되나 명시 삭제 권장).
  - 응답: 성공 + 새 ETag. 클라이언트는 어항 GET을 트리거해 어린이 영역에 반영. `accountId`가 유지되었다면 부모 영역에 1회 안내(S-025d 통합).
  - 이전 디바이스 거동: 다음 GET에서 `aquarium_not_found`(404) 또는 `owner_changed`(403)를 받는다(`owner:<aquariumId>`는 존재하나 `device:<oldDeviceId>`가 비어 owner 검증 시 deviceId 불일치 → 403). 어린이 영역 무변화 + 부모 영역 sync indicator만 `owner-changed` 상태(S-025a 정의).
- 어린이 영역 교체:
  - 새 기기에 이미 그린 어항이 있을 때 덮어쓰기 확인은 **부모 영역에서만** 일어난다. 어린이 영역에는 다이얼로그가 뜨지 않는다.
  - 교체 시 `appState.imagePipeline`의 진행/실패 카운터(S-025b)는 새 어항 기준으로 리셋.
- 환경변수: 추가 없음(KV 통합 환경변수 재사용).
- 외부 패키지: `node:crypto`의 `createHash('sha256')` 사용 → 신규 의존성 없음.

## 위협 모델

| 경로 | 위협 | 완화 |
| --- | --- | --- |
| 코드 추측(brute force) | redeem API에 코드를 무차별 시도 | 코드 공간 ≥ 4M 조합 + redeem 5회/분/IP + 5회 실패 후 30분 cooldown. |
| 코드 노출(스크린샷/공유) | 부모가 코드를 외부에 노출 | 부모 책임 영역. 단일 활성 코드 정책으로 손실 시 즉시 재발급해 무효화 가능. |
| 코드 평문 유출(로그/응답 캐시) | 서버 로그에 코드가 남으면 데이터 탈취 위험 | 서버는 plain code를 로그에 남기지 않는다. 응답은 캐시 금지 헤더(`Cache-Control: no-store`). KV에는 해시만 저장. |
| 어린이 우발 발급 | 어린이가 부모 영역 진입 + 발급 트리거 | 부모 영역 게이트(1.5s) + 발급/재발급 2s hold-to-confirm 이중 차단. |
| 어린이 우발 사용 | 어린이가 redeem 시도 | 코드를 모름 + 부모 영역 입력 + 2s hold + 덮어쓰기 추가 2s hold. |
| 부모가 새 기기에서 어린이의 새 그림 덮어쓰기 | 부모 실수로 어린이 작품 손실 | 덮어쓰기 confirm을 시각 미리보기 + 2s hold-to-confirm로 분리. |
| 동시 redeem(같은 코드 여러 기기) | 두 기기에서 같은 코드를 동시 사용 | `recovery-lock:<hash>` SETNX(EX=10s)로 진입 직렬화. 락 획득 실패 시 409 `in_progress`. 본 redeem 완료 시 `recovery:<hash>` 삭제로 두 번째 요청은 400 `not_found`. |
| OAuth 흐름과의 충돌 | OAuth 연결된 어항을 복구 코드로 옮길 때 ownership 일관성 | redeem 성공 시 owner의 `deviceId`만 갱신. `accountId`는 유지. OAuth 사용자에게 “복구 코드로 옮긴 디바이스도 계정에 연결됩니다” 부모 영역 안내. (구현은 S-025d done 이후 보강) |

## 검증 기준

- [ ] 발급된 코드는 단어-단어-2자리숫자 포맷이며, 단어 풀에서 어린이 친화 단어가 선택된다.
- [ ] 서버 KV에는 `recovery:<sha256(code)>`만 저장되고 plain code는 어디에도 저장되지 않는다.
- [ ] 발급 응답은 plain code를 1회만 반환하고 응답 헤더에 `Cache-Control: no-store`가 포함된다.
- [ ] 어린이 영역에는 발급/입력/표시/만료/실패 UI가 **하나도 노출되지 않는다**.
- [ ] 부모 영역 발급/재발급은 2s hold-to-confirm을 만족해야만 실행된다.
- [ ] 재발급 시 이전 활성 코드의 KV 엔트리가 즉시 삭제되고, 이전 코드로 redeem 시 400을 받는다.
- [ ] redeem 성공 시 어항 owner의 `deviceId`가 새 디바이스 ID로 교체되고, `recovery:<hash>`와 `recovery-active:<aquariumId>` 키가 삭제되며, 이전 디바이스의 `device:<oldDeviceId>`와 `deviceAccountLink:<oldDeviceId>`(존재 시)도 함께 정리된다.
- [ ] 동일 코드로 동시에 두 번 redeem을 시도하면 첫 번째는 성공, 두 번째는 409(`in_progress`) 또는 400(`not_found`)을 받는다. 어항 owner는 한 번만 갱신된다.
- [ ] 만료된 코드(30일 경과)로 redeem 시도는 400 + `error.code = 'expired'`를 받는다.
- [ ] 디바이스당 발급 빈도가 1회/시간을 초과하면 429를 받는다.
- [ ] redeem 시도가 5회/분/IP를 초과하면 429를 받고, 5회 실패 누적 시 30분 cooldown이 적용된다.
- [ ] 새 기기에 이미 그린 어항이 있는 상태에서 redeem 시 부모 영역에 시각 미리보기 + 2s hold-to-confirm 덮어쓰기 다이얼로그가 표시된다. 어린이 영역에는 노출되지 않는다.
- [ ] redeem 성공 후 어린이 영역의 어항이 새 본으로 교체되고, sprite 로딩 지연 시 회색 실루엣 + 거품 placeholder fallback이 나타난다.
- [ ] 부모 영역 모든 색 변화는 단조이고, `prefers-reduced-motion` 활성 시 hold-to-confirm ring이 fade-fill로 대체된다.
- [ ] 코드 표시 화면을 닫거나 부모 영역이 idle 5분으로 잠기면 plain code는 메모리에서 폐기된다(다시 표시할 수 없다).
- [ ] `npm test`(추첨/해시/만료/cooldown 단위 테스트 포함)가 통과한다.
- [ ] `npm run lint`, `npm run build`, `npm run cleanup` 모두 통과한다.
- [ ] 브라우저 콘솔에 새 경고/오류가 발생하지 않는다(`VITE_BACKEND_ENABLED=false` 기준).

## Files To Add or Change

| Path | Action | Purpose |
| --- | --- | --- |
| `src/features/recovery/index.js` | add | 부모 영역 `parent.recovery` 슬롯 진입점. |
| `src/features/recovery/state.js` | add | `appState.recovery` 정규화 + plain code 메모리 보관. |
| `src/features/recovery/view.js` | add | 발급/표시/입력/덮어쓰기 UI. |
| `src/features/recovery/events.js` | add | hold-to-confirm + 복사 + 입력 이벤트 바인딩. |
| `src/features/recovery/state.test.js` | add | 상태 머신 단위 테스트. |
| `src/features/aquarium/storage/sync.js` | change | redeem 성공 후 어항 GET 트리거 + 어린이 영역 교체. |
| `src/features/parent-area/view.js` | change | `parent.recovery` 슬롯 호출. |
| `api/recovery-code.js` | add | 발급 라우트(부모 영역에서만 호출). |
| `api/recovery-redeem.js` | add | redeem 라우트. |
| `api/_lib/recoveryCode.js` | add | 단어 풀 + 추첨 + sha256 helper. |
| `api/_lib/recoveryCode.test.js` | add | 추첨 분포/해시 검증. |
| `ARCHITECTURE.md` | change | `features/recovery/` 항목 추가. |
| `SPEC.md` | change | S-025c row 추가(draft). |
| `docs/spec/S-025c-recovery-code.md` | add | 본 문서. |

## Open Questions

- 단어 풀 크기(200 vs 500)와 다국어 지원. → MVP는 영어 단어 풀 200개로 시작. 한국어 풀은 부모 가독성과 다국어 마찰을 고려해 별도 스펙으로.
- 복구 코드 + OAuth 동시 사용 시나리오(예: OAuth로 백업 + 복구 코드도 발급). → `docs/spec/S-025d-oauth-google-apple.md` (draft) “부모 흐름 — 복구 코드와 동시 사용” 절에서 닫음. redeem 시 `accountId` 유지 + `deviceAccountLink:<newDeviceId>` 자동 upsert.
- 코드 표시 화면에서 “QR 코드” 보조 표시를 추가할지. → MVP 미포함. 부모 가독성과 보안 표면을 가중. 별도 스펙 후보.
- 발급 후 부모 영역에서 “현재 활성 코드 있음” 인디케이터를 유지할지. → 평문 미저장 정책상 “있음/없음” 플래그만(예: `recovery-active:<aquariumId>` 존재 여부)으로 표시. 코드 자체는 다시 표시하지 않는다.
- redeem 직후 기존 디바이스의 자동 sync가 “owner 없음” 상태로 폴백할 때 어떻게 안내할지. → 기존 디바이스는 다음 GET에서 빈 상태(404 또는 owner 불일치 403)를 받는다. 어린이 영역 무변화 + 부모 영역 sync indicator만 disabled로 전환(어차피 부모가 의도적으로 이전한 동작).

## Next Step

1. 본 스펙을 사람이 검토해 `ready`로 전환한다.
2. `ready` 후 다음 순서로 PR을 쪼개는 것을 권장한다.
   1. `api/_lib/recoveryCode.js`(단어 풀 + 추첨 + sha256) + 단위 테스트.
   2. `api/recovery-code.js` + 발급 흐름 + rate limit(발급 빈도).
   3. `api/recovery-redeem.js` + redeem 흐름 + rate limit + cooldown.
   4. `src/features/recovery/`(부모 영역 슬롯 컴포넌트) + hold-to-confirm wiring(S-026 모듈 재사용).
   5. `storage/sync.js`에서 redeem 성공 후 어항 GET 트리거 + 어린이 영역 교체.
3. 본 스펙이 done이 되면 부모 스펙 결정 2(디바이스 ID 분실 흐름)가 OAuth 없이도 닫힌다. OAuth는 S-025d에서 별도 보강.
