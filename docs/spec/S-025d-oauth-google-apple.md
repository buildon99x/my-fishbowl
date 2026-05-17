# S-025d Google/Apple OAuth (선택 기능)

## 상태

- 상태: ready
- 구현 여부: not-started
- 검증 여부: not-tested

> **MVP 범위 = Google only**: 본 스펙은 설계상 Google과 Apple을 함께 다루지만, **Phase 2 구현은 Google 흐름만**을 대상으로 한다. Apple Sign-In(P8 키, ES256 client_secret 동적 생성, production-only 콜백, 6개월 키 rotation 운영 노트)은 **Phase 2 부록 — deferred**로 둔다. 본문에서 “Apple”로 표기된 모든 구현 항목은 iOS 사용 비중이 임계치를 넘어 별도 ready 판단이 떨어진 시점에 활성화한다. Google 단독 구현 시점에는 `VITE_APPLE_ENABLED=false`로 고정하고 라우트/시크릿/UI 어디에도 Apple 분기를 마운트하지 않는다.

## 부모 / 의존 스펙

- 부모: `docs/spec/S-025-backend-foundation.md` (ready) — 결정 항목 2-1(OAuth), 4(API 표면), 9(관측), 10(환경 분리).
- 의존: `docs/spec/S-025a-device-id-and-storage-adapter.md` (draft) — owner 키 + 충돌 카드(merge 비활성 상태). 본 스펙이 `merge` 버튼을 활성화한다.
- 의존: `docs/spec/S-025b-image-pipeline.md` (draft) — Blob sprite를 가진 어항이 두 디바이스에서 동시 존재할 때의 결합.
- 의존: `docs/spec/S-025c-recovery-code.md` (draft) — OAuth 연결된 어항을 복구 코드로 이전할 때의 일관성(미해결 항목 본 스펙에서 닫음).
- 호스트: `docs/spec/S-026-parent-area-gate.md` (draft) — `parent.account` 슬롯에 OAuth 시작/언링크/계정 삭제를 둔다. 언링크/계정 삭제는 2s hold-to-confirm 이중 게이트.

본 스펙은 S-025 매핑 표를 상속한다. 어린이 영역에는 어떤 OAuth UI/메시지도 노출되지 않는다.

## 목표

- 부모가 **선택적으로** Google 또는 Apple 계정을 어항에 연결해, 디바이스 분실/브라우저 초기화 시에도 같은 어항을 다른 기기에서 이어 쓸 수 있게 한다.
- OAuth 연결은 **link-after** 모델로, 어린이는 항상 익명 디바이스 ID로 시작하고 부모가 명시적으로 연결한다.
- 다른 기기에서 같은 OAuth 계정으로 처음 로그인했을 때 발생하는 두 어항 충돌을 **부모 결정에 위임**한다(자동 머지 금지). 본 스펙이 `merge` 옵션을 처음 활성화한다.
- 시크릿 부재 환경에서는 라우트/UI가 자연스럽게 비활성화되어 핵심 기능은 그대로 동작한다.
- PII 최소화: provider `sub`만 저장하고 이메일/이름/프로필 이미지는 저장하지 않는다.

## 범위

- 포함:
  - OAuth 라이브러리: **`arctic`(Google/Apple Provider) + `jose`(자체 세션 JWT)**. Vanilla Vercel Functions에 맞는 얇은 결합.
  - API:
    - `GET /api/auth/config` — 활성 provider 목록. 시크릿 부재 시 `{ providers: [] }`.
    - `GET /api/auth/google/start`, `GET /api/auth/google/callback`.
    - `GET /api/auth/apple/start`, `POST /api/auth/apple/callback` (Apple은 POST form post).
    - `POST /api/auth/link` — OAuth 콜백 직후 발급된 단명 JWT + 현재 디바이스 ID로 어항을 계정에 연결.
    - `POST /api/auth/unlink` — 계정 ↔ 디바이스 매핑 해제. 어항은 디바이스 익명 소유로 복귀.
    - `DELETE /api/account` — 계정/매핑/Blob 자산/스냅샷 동기 삭제.
  - 세션:
    - 발급: HMAC-SHA256 서명 JWT, 만료 1시간, `accountId` + `provider` + `deviceId`만 클레임. 쿠키(`__Host-` prefix, `Secure`, `HttpOnly`, `SameSite=Lax`) 또는 클라이언트 보관 후 `Authorization: Bearer`.
    - 미존재/만료 시 익명으로 자동 fallback(401로 막지 않음).
    - **만료 UX**: 부모가 `parent.account`에서 작업 중 만료되면 다음 액션 시 자동으로 익명으로 fallback되고, `parent.account`는 “세션이 만료되었습니다 — 다시 백업으로 로그인하세요” 단조 톤 안내 + 재로그인 버튼으로 전환된다. 어린이 영역 무변화. 본 스펙 MVP에서는 refresh token을 도입하지 않는다.
    - **dev 환경 쿠키**: `__Host-` prefix는 `Secure`(HTTPS)를 요구하므로 localhost http에서 동작하지 않는다. dev 빌드에서는 prefix 없이 `mf_session=...; Path=/; HttpOnly; SameSite=Lax`만 사용한다(`process.env.VERCEL_ENV !== 'production'` 분기). production/preview는 `__Host-` 필수.
  - **콜백 deviceId 바인딩(중요)**:
    - top-level 리다이렉트와 Apple POST form_post에는 `X-Device-Id` 헤더가 전달되지 않는다.
    - `/api/auth/<provider>/start`에서 서버는 `X-Device-Id`를 1회 읽어 `__Host-mf_oauth_state` 쿠키(`code_verifier` + `state` + `deviceId`를 jose로 단명 서명, 만료 10분, `HttpOnly`, `Secure`, `SameSite=Lax`)에 동봉한다.
    - 콜백(`GET /api/auth/google/callback`, `POST /api/auth/apple/callback`)에서 쿠키를 검증해 `state` 일치 + `deviceId` 복원 후 토큰 교환을 수행한다. 검증 실패 → 400 `code = 'oauth_state_invalid'`.
    - 세션 JWT 발급 시 위에서 복원한 `deviceId`를 클레임에 포함, 동시에 `/api/auth/link`가 별도 호출 없이도 같은 흐름 안에서 매핑을 수행할 수 있게 한다(MVP는 명시 `/api/auth/link`를 유지하되 콜백 자체에서 임시 link 의도 토큰을 발급해 클라이언트가 즉시 호출).
  - 매핑 스키마(부모 스펙 결정 2-1 보강):
    - `account:<accountId>` → `{ provider, sub, linkedAt, aquariumId, linkedDeviceIds[] }`.
    - `deviceAccountLink:<deviceId>` → `accountId`.
    - 어항 `owner` 키에 `accountId?` 보강(S-025a 키 스키마 확장).
  - 충돌 흐름(부모 영역 충돌 카드, S-025a 카드 보강):
    - 옵션 3개 활성: `merge` / `overwrite` / `abandon`. 어린이 영역 자동 안전 보존 모드는 그대로 유지.
    - `merge` 알고리즘:
      - fish 단위 union by `fish.id`. 동일 id의 fish는 더 최근 `updatedAt` 본(runtime state 포함)을 통째 채택. 부분 머지는 도입하지 않는다.
      - 어항 메타(name/cleanliness/algaeLevel/lastCleanedAt/bounds) 결합은 부모가 두 본 중 하나를 선택(작은 토글 카드 2장).
      - 총 fish 수가 50개 초과면 더 최근 `createdAt` 50마리만 채택하고 부모에게 단조 톤으로 사실 안내.
      - sprite는 `spriteUrl`이 있는 본을 우선(S-025b). 둘 다 dataURL이면 그대로 유지.
    - **빈/동일 merge 케이스**: 두 본의 fish가 모두 비어 있거나 `local === server`(깊은 비교)인 경우 충돌 카드는 “두 어항이 같습니다”만 표시하고 세 버튼이 모두 비활성으로 렌더된다. 부모가 닫기 ✕로 종료. 카드 자동 사라짐은 없다(부모가 확인했다는 사실 자체가 중요).
    - 모든 결정은 **부모가 시각 미리보기 카드를 본 뒤 2s hold-to-confirm**. 어떤 자동 적용도 일어나지 않는다.
    - **링크 직후 race**: 부모가 카드에서 결정하는 사이 다른 디바이스가 추가 PUT을 일으키면 결정 PUT이 412(`etag_mismatch`)를 받는다. 본 스펙은 자동 재시도 1회(서버 본을 다시 가져와 미리보기 갱신 후 부모에게 “계정 어항이 변경되어 새로 확인해주세요” 단조 톤 안내) → 부모는 다시 hold-to-confirm. 자동 재시도가 또 실패하면 카드를 닫고 부모에게 “나중에 다시 시도” 안내.
  - 콜백 URL/시크릿 정책(부모 스펙 결정 2-1 인용):
    - Google: production + 단일 preview 도메인 + `http://localhost:5173`을 콘솔에 명시 등록.
    - Apple: production-only. preview에는 “Apple로 백업” 버튼 자체를 노출하지 않는다(`VITE_APPLE_ENABLED=false`).
    - Apple `client_secret`은 매 요청 시 `APPLE_TEAM_ID`/`APPLE_KEY_ID`/`APPLE_PRIVATE_KEY`로 단명 JWT를 동적 생성한다. 6개월 키 만료는 운영 알람으로 관리(별도 운영 노트 첨부).
  - 환경변수: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APPLE_CLIENT_ID`(Services ID), `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`(P8 본문), `AUTH_JWT_SECRET`. 모두 서버 전용, `VITE_` 프리픽스 금지.
  - 클라이언트 트리 dead-code:
    - `VITE_OAUTH_ENABLED=false`(또는 활성 provider 0개) 시 `src/features/auth/`가 dynamic import에서 트리에 포함되지 않게 분기. 부모 영역 `parent.account` 슬롯은 “백업 가능 옵션 없음” 안내만.
  - 관측(S-025e 인접):
    - 카운터: `auth_link_success_total`, `auth_link_conflict_total`, `auth_unlink_total`, `auth_account_delete_total`, `auth_callback_error_total{provider}`.
    - 로그에는 `accountId`만, 이메일/이름은 절대 출력 금지.

- 제외:
  - 다른 OAuth provider(GitHub/Facebook/Kakao 등).
  - 매직 링크/SMS/이메일 인증.
  - 어린이 영역 “부모 로그인 권유” 알림.
  - 가족 공유/소셜(부모 스펙 명시 제외).
  - 멀티 어항 per account(`account:<accountId>.aquariumId`는 단일).
  - 계정 단위 sprite 한도(어항 단위 한도 50을 그대로 사용).
  - Apple preview 환경 활성화(별도 Services ID 발급 후 미래 스펙).
  - merge 결과의 어항 메타 자동 추론(부모 토글 강제).

## 사용자 흐름

### 어린이 흐름

1. 어린이는 OAuth UI를 절대 보지 않는다. 부모가 연결을 마쳐도, 어린이 영역은 아무 변화가 없다(어항은 그대로).
2. 다른 기기에서 같은 OAuth 계정으로 로그인해 어항이 변경되어도, sprite 로딩 지연 시 회색 실루엣 + 거품 placeholder가 보였다가 자연스럽게 교체된다(S-025a/S-025b 재사용).

### 부모 흐름 — 처음 연결

1. 부모가 부모 영역에 진입한다(S-026 게이트, 1.5s hold-to-fill).
2. `parent.account`에 활성 provider 버튼이 보인다.
   - Google 시크릿 설정됨 → “Google로 백업”.
   - Apple 시크릿 설정됨 + `VERCEL_ENV === 'production'` → “Apple로 백업”.
   - 활성 provider 0개 → “백업 가능 옵션 없음” 안내만(버튼 미렌더).
3. 부모가 provider 버튼을 누른다 → `/api/auth/<provider>/start`로 리다이렉트.
4. 콜백 성공 시 단명 JWT가 발급되고, 클라이언트가 `POST /api/auth/link`로 디바이스 ID와 결합한다.
5. **계정에 어항 매핑이 없는 경우(첫 연결)**: 이 디바이스의 어항을 계정에 매핑한다(`account.aquariumId = 이 디바이스의 aquariumId`). 부모 영역에 “연결됨: Google · ····3a9f”(sub 마지막 4자리) 표시.
6. **계정에 이미 다른 어항이 매핑되어 있는 경우**: 충돌 카드가 부모 영역에 표시된다(아래 “충돌 흐름” 절).

### 부모 흐름 — 충돌 해결(다른 기기에서 같은 OAuth)

1. 부모 영역 충돌 카드에 두 본의 시각 미리보기 카드 2장이 나란히 보인다(“이 태블릿의 어항” vs “다른 기기의 어항”, 어린이 친화 일러스트 + 물고기 수). timestamp/etag는 노출되지 않는다.
2. 세 옵션 버튼(각 2s hold-to-confirm):
   - **merge**: 두 어항의 fish를 합친다. 부모가 어항 메타(이름/이끼/청결/경계)는 두 본 중 하나를 토글로 선택. 합쳐진 결과 미리보기 카드가 즉시 갱신된다. 확인 시 적용.
   - **overwrite**: 이 태블릿의 어항으로 계정 어항을 덮는다.
   - **abandon**: 계정의 어항으로 이 태블릿의 어항을 덮는다(어린이의 현재 그림이 손실될 수 있으므로 추가 2s hold-to-confirm + 미리보기 강조).
3. 선택 후 적용은 단일 PUT으로 일어나며, 어린이 영역은 sprite-fallback을 거친 자연스러운 교체만 본다.
4. merge 결과가 50 fish를 초과하면 “최근 50마리만 보존” 단조 톤 안내가 함께 표시된다.

### 부모 흐름 — provider 전환(Google ↔ Apple)

1. 본 스펙은 한 디바이스가 동시에 두 provider에 연결되는 것을 허용하지 않는다. 전환을 원하는 부모는 **먼저 언링크 → 새 provider로 다시 백업** 순서를 따른다.
2. 언링크된 이전 provider의 `account:<oldAccountId>`는 `linkedDeviceIds`가 비면 **즉시 GC되지 않는다**(다른 기기에서 다시 로그인할 가능성 보존). 빈 계정은 30일 후 자동 GC되며, 부모는 `parent.account`의 “계정 삭제”로 즉시 정리할 수도 있다.
3. 동일 사용자가 새 provider로 처음 로그인하면 새 계정 매핑이 생성된다. 이때 어항은 이미 디바이스 소유 상태였으므로 충돌 카드가 뜨지 않고 그대로 새 계정에 연결된다.

### 부모 흐름 — 언링크

1. `parent.account`에서 “연결 해제” 버튼을 본다.
2. 2s hold-to-confirm.
3. 서버: `deviceAccountLink:<deviceId>` 삭제, `account.linkedDeviceIds`에서 디바이스 제거. 어항 데이터는 그대로 디바이스 익명 소유로 복귀(`account_id`만 owner에서 제거).
4. 부모 영역 표시는 “연결됨” → “연결 옵션” 상태로 돌아간다. 어린이 영역 무변화.

### 부모 흐름 — 계정 삭제

1. `parent.account`에서 “계정 삭제” 버튼.
2. 2s hold-to-confirm + 추가 시각 미리보기(“이 계정에 연결된 어항/이미지가 모두 삭제됩니다”) + 2s hold-to-confirm 한 번 더(파괴적 동작 이중 게이트, S-026).
3. 서버 동기 삭제: `account:<accountId>`, 모든 `deviceAccountLink:* → accountId`, 매핑된 `aquarium:<aquariumId>` + `owner:<aquariumId>` + `device:*` 역인덱스 + Blob `sprite/<aquariumId>/*` + 활성 복구 코드 + 7일 스냅샷.
4. 클라이언트는 디바이스 ID는 유지하되 어항을 빈 상태로 재시작.
5. 어린이 영역은 sprite-fallback을 거친 “새 어항” 상태가 된다(부모 영역 닫을 때 잠금 직후 자연스럽게 노출).

### 부모 흐름 — 복구 코드와 동시 사용(S-025c 미해결 항목)

1. OAuth로 연결된 어항을 부모가 새 기기에서 복구 코드로 이전한다(S-025c 흐름).
2. redeem 시 owner의 `deviceId`만 갱신되고 `accountId`는 유지된다. `deviceAccountLink:<newDeviceId> = accountId`도 함께 upsert.
3. 부모 영역에 단조 톤 안내가 1회 표시된다: “복구 코드로 옮긴 디바이스도 계정에 연결됩니다”.
4. 어린이 영역 무변화(S-025c 흐름과 동일).

## UI/상태 요구사항

- 어린이 영역:
  - OAuth/계정/언링크/삭제 UI **없음**.
  - 어항 교체 시 sprite-fallback만 노출.
- 부모 영역 `parent.account`:
  - 활성 provider 버튼들(Google/Apple). 활성 0개 시 안내 텍스트만.
  - 연결됨 상태 카드: `provider 이름 · ····<sub 마지막 4자리>`. 이메일/이름/사진 미표시.
  - 언링크 버튼(2s hold-to-confirm). 위험 톤 아님(비파괴적, 데이터 유지).
  - 계정 삭제 버튼(위험 톤, 2s hold-to-confirm + 추가 확인 2s hold-to-confirm).
  - 모든 상태 단조 색 변화, 점멸 없음.
- 부모 영역 `parent.conflict`(S-025a 카드 보강):
  - 두 본 시각 미리보기 카드 2장(어린이 친화 일러스트).
  - 세 버튼: merge / overwrite / abandon. 각 2s hold-to-confirm.
  - merge 모드에서는 어항 메타 토글 카드(이 태블릿 / 다른 기기) + 합쳐진 미리보기 즉시 갱신.
  - timestamp/etag는 사용자에게 노출하지 않는다.
- 필요한 상태(클라이언트 메모리):
  - `appState.auth = { providers: ('google'|'apple')[], session?: { accountId, provider, expiresAt }, lastError?: { code, message } }`.
  - `appState.conflict = { local, server, mergePreview?, metaChoice?: 'local'|'server' } | null`(S-025a 정의 보강).
- localStorage:
  - 추가 없음. 세션 토큰은 쿠키로만 유지하거나 메모리 보관. 디바이스 ID와 무관하게 동작.
- 모션/접근성:
  - hold-to-confirm은 S-026 모듈 그대로 사용(`prefers-reduced-motion` 자동 처리).
  - 충돌 미리보기 카드 갱신은 단조 cross-fade(0.2s).

## 어린이/부모 영역 매핑(S-025 표 보강)

| 기능 | 어린이 영역 | 부모 영역 | 비고 |
| --- | --- | --- | --- |
| “Google/Apple로 백업” 버튼 | 노출 안 함 | `parent.account` 활성 provider만 | 시크릿 부재 시 미렌더 |
| OAuth 시작/콜백/링크 | 노출 안 함 | 부모 게이트 뒤 | Apple은 production-only |
| 연결됨 상태 표시 | 노출 안 함 | `parent.account` 카드(provider + sub 마지막 4자리) | 이메일/이름 미표시 |
| 언링크 | 노출 안 함 | 2s hold-to-confirm | 어항 데이터 유지 |
| 계정 삭제 | 노출 안 함 | 2s + 2s 이중 hold | 동기 삭제, 7일 스냅샷 포함 |
| 충돌 카드 `merge` | 노출 안 함 | 본 스펙에서 활성화 + 2s hold | 자동 머지 없음 |
| `overwrite` | 노출 안 함 | 2s hold | S-025a 정책 유지 |
| `abandon` | 노출 안 함 | 시각 미리보기 강조 + 2s hold | 어린이 그림 손실 보호 |
| 50 fish 초과 안내 | 노출 안 함 | 단조 톤 본문 | 최근 50마리 보존 |
| 어항 교체 직후 sprite 지연 | 회색 실루엣 + 거품 burst | 표시 없음 | S-025a/S-025b fallback 재사용 |

## 구현 메모

- 외부 import 표면 보존:
  - 다른 feature는 OAuth의 존재를 모른다. `services/api.js`에 `Authorization` 헤더가 있으면 자동 동봉되는 분기만 추가.
- 디렉터리 구조(추가/이동):
  - 신규: `src/features/auth/index.js`, `state.js`, `view.js`, `events.js`. 부모 영역 `parent.account` 슬롯 컴포넌트.
  - 신규: `src/features/auth/conflict-merge.js` — 충돌 카드 merge 모드 합성 알고리즘(클라이언트 미리보기 계산).
  - 신규: `src/features/aquarium/storage/conflict-card.js`(S-025a 정의 보강) — merge 옵션 활성, 메타 토글 카드.
  - 신규: `api/auth/config.js`, `api/auth/google/start.js`, `api/auth/google/callback.js`, `api/auth/apple/start.js`, `api/auth/apple/callback.js`, `api/auth/link.js`, `api/auth/unlink.js`, `api/account.js`(DELETE).
  - 신규: `api/_lib/oauth.js`(arctic provider wrap), `api/_lib/session.js`(jose JWT 발급/검증), `api/_lib/appleClientSecret.js`(매 요청 단명 JWT).
  - 신규 테스트: `auth/state.test.js`, `conflict-merge.test.js`, `api/_lib/session.test.js`, `api/_lib/appleClientSecret.test.js`.
  - 변경: `src/features/parent-area/view.js`(`parent.account` 슬롯 호출), `ARCHITECTURE.md`.
- 세션 발급/검증(`api/_lib/session.js`):
  - 알고리즘: HS256, 키 `AUTH_JWT_SECRET`.
  - 클레임: `{ accountId, provider, iat, exp }`. 1시간 만료.
  - 쿠키: `__Host-mf_session=...; Path=/; Secure; HttpOnly; SameSite=Lax`. 클라이언트는 별도 추출 없이 자동 동봉.
- Apple `client_secret` 생성(`appleClientSecret.js`):
  - `iss = APPLE_TEAM_ID`, `iat`, `exp = now + 600s`(짧게), `aud = 'https://appleid.apple.com'`, `sub = APPLE_CLIENT_ID`. ES256 서명, `APPLE_KEY_ID`를 `kid` header에 포함.
  - 매 콜백 단계에서 단명 JWT를 새로 만든다.
- merge 알고리즘(`conflict-merge.js`):
  - 입력: `local.fishes[]`, `server.fishes[]`.
  - by `fish.id`:
    - 두 본에 모두 있으면 `updatedAt`이 더 최근 본 채택.
    - 한 본에만 있으면 그대로 채택.
  - 결과 정렬: `createdAt asc`.
  - 50 초과 시 `createdAt desc` 기준 50마리만 채택.
  - 어항 메타(name/cleanliness/algaeLevel/lastCleanedAt/bounds)는 부모 토글 선택 본 그대로 사용.
  - sprite는 `spriteUrl`을 우선 보존(S-025b). dataURL은 마이그레이션 잔존 시에만 fallback.
- 시크릿 부재 환경:
  - 서버 라우트는 `/api/auth/*`가 모두 `if (!enabled(provider)) return new Response(null, { status: 404 })`로 시작.
  - `/api/auth/config`는 항상 200이며 `{ providers: enabledProviders }`.
  - 클라이언트는 `parent.account` 마운트 직전에 config를 1회 캐시 후 활성 provider 0개면 슬롯에 안내만.
  - Apple은 추가로 `VERCEL_ENV === 'production'` 검사를 통과해야 활성.
- 한도/관측(S-025e 인접):
  - 인증 라우트 IP rate limit 20 req/min(부모 스펙 결정 8).
  - 카운터는 본 스펙 “범위” 절 참조. 어린이 영역과 무관.
- 환경변수 자동 주입은 Vercel Project Settings에서 관리. 본 스펙은 명세만.
- 외부 의존성: `arctic`, `jose`. 도입 사유:
  - `arctic`: Google/Apple OAuth provider 헬퍼만 제공하는 얇은 라이브러리, Vanilla Vercel Functions 적합.
  - `jose`: JWT 표준 라이브러리, HS256/ES256 모두 지원해 자체 세션 + Apple client_secret 양쪽에 재사용.

## 위협 모델

| 경로 | 위협 | 완화 |
| --- | --- | --- |
| OAuth 콜백 CSRF | `state`/`code_verifier` 누락 시 임의 콜백 주입 | arctic 표준 `state`/`code_verifier` 사용, 쿠키 1회용 저장 + `SameSite=Lax`. |
| 콜백 URL 변조 | 콘솔 미등록 URL로 토큰 탈취 | provider 콘솔에 production + 단일 preview + localhost만 등록. 와일드카드 금지. Apple은 production-only. |
| 시크릿 노출 | 클라이언트 번들에 secret 포함 | 모든 OAuth secret은 `VITE_` 미부착. 서버 전용. Apple client_secret은 매 요청 단명 JWT로만 외부 노출. |
| 세션 탈취(XSS) | 토큰을 JS에서 읽힘 | `HttpOnly` 쿠키 + `__Host-` prefix + `Secure`. Authorization Bearer는 SDK 호출에만, 직접 DOM 노출 금지. |
| Replay/만료 우회 | 만료 JWT 재사용 | `exp` 1시간 + 서버 매 요청 검증. 만료 시 익명 fallback(401로 막지 않음). |
| 어린이 자가 OAuth 트리거 | 어린이가 부모 영역 진입 후 Google 로그인 | 부모 영역 게이트(1.5s) + 어린이는 Google 계정 없음. 추가 hold-to-confirm은 불필요(연결 자체는 비파괴적). |
| 자동 머지로 어린이 그림 손실 | 부모가 실수로 merge 결과를 적용 | 모든 결정은 시각 미리보기 + 2s hold-to-confirm. abandon은 추가 hold + 미리보기 강조. |
| 계정 삭제 우발 | 부모 실수로 데이터 영구 삭제 | 2s + 2s 이중 hold + 시각 미리보기 + 7일 스냅샷도 함께 삭제됨을 명시. |
| PII 누출 | 이메일/이름/사진을 우리 시스템에 저장 | provider `sub`만 KV에 저장. **콜백 핸들러에서 토큰 응답을 destructure할 때 `{ sub }`만 추출**, 나머지(`email`, `name`, `picture`, `email_verified`, Apple `email_relay`)는 변수에 묶지 않는다. 로그/관측 출력에 토큰 원문이나 sub 전체 문자열을 절대 포함하지 않는다(`accountId`만). |
| Apple secret 만료 | 6개월 후 client_secret JWT 서명 실패 | 키 만료 D-30 알람(`AUTH_APPLE_KEY_EXPIRY` 환경변수 + 운영 노트 첨부). 만료 시 라우트는 503 + 부모 영역은 “일시 사용 불가” 안내. |
| OAuth 비활성 환경 노출 | 시크릿 미설정인데 버튼 표시되어 404 좌절 | `/api/auth/config` 활성 provider 0개일 때 버튼 자체 미렌더 + 클라이언트 트리에서 `features/auth/` dead-code 제거. |
| 복구 코드와 충돌 | OAuth + 복구 코드 동시 사용 시 ownership 불일치 | redeem 시 `accountId` 유지 + `deviceAccountLink:<newDeviceId>` 자동 upsert. 부모 영역 1회 안내. |

## 검증 기준

- [ ] 시크릿이 모두 비어 있으면 `parent.account` 슬롯에 안내만 표시되고, 어떤 OAuth 라우트도 200을 반환하지 않는다(`/api/auth/<provider>/*` = 404, `/api/auth/config` = `{ providers: [] }`).
- [ ] Google 시크릿만 설정된 환경에서 부모 영역에 “Google로 백업”만 노출되고 Apple 버튼은 미렌더된다.
- [ ] Apple 시크릿 + `VERCEL_ENV !== 'production'`인 preview에서 Apple 버튼은 미렌더된다.
- [ ] `/api/auth/<provider>/start`가 arctic `state`/`code_verifier`를 1회용 쿠키로 발급한다.
- [ ] 콜백 성공 시 응답에 `Cache-Control: no-store`가 포함되고 `__Host-mf_session` 쿠키가 1시간 만료로 설정된다.
- [ ] `POST /api/auth/link`로 디바이스 ID가 계정에 매핑된다. 동일 계정에 다른 어항이 이미 있으면 부모 영역 충돌 카드가 표시된다.
- [ ] 충돌 카드의 `merge`/`overwrite`/`abandon`은 모두 2s hold-to-confirm을 만족해야만 실행된다. `abandon`은 추가 시각 미리보기 강조 + 2s hold가 더해진다.
- [ ] merge 결과가 부모의 메타 토글 선택을 반영하고, fish 50 초과 시 최근 50마리만 채택되며 단조 톤 안내가 노출된다.
- [ ] 어린이 영역에는 OAuth 흐름 어느 단계에서도 modal/blocking UI가 노출되지 않는다.
- [ ] 부모 영역 “연결됨” 표시에 이메일/이름/사진이 포함되지 않고 sub 마지막 4자리만 보인다.
- [ ] 언링크 후 `deviceAccountLink:<deviceId>`가 삭제되고 어항 owner에서 `accountId`가 제거되며, 어항 데이터는 그대로 유지된다.
- [ ] `DELETE /api/account`는 계정/매핑/어항/Blob sprite/활성 복구 코드/7일 스냅샷을 동기 삭제하고, 클라이언트는 빈 어항으로 재시작한다.
- [ ] 복구 코드(S-025c)로 디바이스를 옮겨도 OAuth 연결이 유지되며 부모 영역에 1회 안내가 노출된다.
- [ ] 인증 라우트가 IP 20 req/min을 초과하면 429 + `Retry-After`를 반환한다.
- [ ] Apple `client_secret` 단명 JWT가 매 요청 시 새로 생성되고 만료 10분 이내 클레임을 가진다.
- [ ] 만료/위조 세션 토큰은 401이 아니라 익명 fallback으로 처리되어 핵심 기능이 그대로 동작한다.
- [ ] 세션 1시간 만료 시 `parent.account`는 “세션 만료 — 다시 로그인” 안내로 자동 전환되고 어린이 영역은 무변화이다.
- [ ] OAuth 콜백은 `/start` 시점에 발급한 `__Host-mf_oauth_state` 쿠키로 `state`/`code_verifier`/`deviceId`를 복원한다. 쿠키 누락/위조 시 400(`oauth_state_invalid`)을 반환한다.
- [ ] dev(`VERCEL_ENV !== 'production'`) 환경에서는 쿠키가 `__Host-` prefix 없이 발급되어 localhost http에서도 동작한다.
- [ ] 두 본이 완전히 동일한 충돌 카드 케이스에서 세 버튼이 모두 비활성으로 표시된다.
- [ ] 동일 디바이스가 동시에 두 provider에 연결되지 않는다. provider 전환은 “언링크 → 재로그인”만 허용된다.
- [ ] 콜백 핸들러는 토큰 응답에서 `sub`만 추출하고 `email`/`name`/`picture` 등은 변수에 묶지 않는다(코드 inspection 검증).
- [ ] 어떤 로그 라인에도 이메일/이름/sub 전체 문자열이 출력되지 않는다(`accountId`만 출력).
- [ ] `npm test`(arctic mock + jose 발급/검증 + merge 알고리즘 + state machine 단위 테스트 포함)가 통과한다.
- [ ] `npm run lint`, `npm run build`, `npm run cleanup` 모두 통과한다.
- [ ] 브라우저 콘솔에 새 경고/오류가 발생하지 않는다(`VITE_OAUTH_ENABLED=false` 기준).

## Files To Add or Change

| Path | Action | Purpose |
| --- | --- | --- |
| `src/features/auth/index.js` | add | `parent.account` 슬롯 진입점. |
| `src/features/auth/state.js` | add | `appState.auth` 정규화 + 세션 상태. |
| `src/features/auth/view.js` | add | 활성 provider 버튼/연결됨 카드/언링크/삭제 UI. |
| `src/features/auth/events.js` | add | OAuth 시작/콜백 핸들 + hold-to-confirm wiring. |
| `src/features/auth/conflict-merge.js` | add | fish union + 메타 토글 미리보기 계산. |
| `src/features/auth/state.test.js` | add | 세션 상태/충돌 분기 단위 테스트. |
| `src/features/auth/conflict-merge.test.js` | add | merge 알고리즘 정합/50 cap 검증. |
| `src/features/aquarium/storage/conflict-card.js` | change | merge 모드 활성화 + 메타 토글 카드 + 미리보기 갱신. |
| `src/features/parent-area/view.js` | change | `parent.account` 슬롯 호출. |
| `src/services/api.js` | change | 쿠키 기반 세션 자동 동봉. 401 → 익명 fallback. |
| `api/auth/config.js` | add | 활성 provider 목록. |
| `api/auth/google/start.js` | add | arctic Google `createAuthorizationURL`. |
| `api/auth/google/callback.js` | add | arctic Google 토큰 교환 + session 발급 + link 안내. |
| `api/auth/apple/start.js` | add | arctic Apple. |
| `api/auth/apple/callback.js` | add | arctic Apple(POST form). |
| `api/auth/link.js` | add | 세션 + 디바이스 ID 매핑. |
| `api/auth/unlink.js` | add | 매핑 해제. |
| `api/account.js` | add | DELETE — 계정/매핑/어항/Blob/스냅샷/복구 코드 동기 삭제. |
| `api/_lib/oauth.js` | add | arctic provider wrap + 활성 검사. |
| `api/_lib/session.js` | add | jose 기반 JWT 발급/검증. |
| `api/_lib/appleClientSecret.js` | add | 매 요청 Apple 단명 JWT 생성. |
| `api/_lib/session.test.js` | add | 발급/검증/만료 단위 테스트. |
| `api/_lib/appleClientSecret.test.js` | add | 단명 JWT 클레임 검증. |
| `package.json` | change | `arctic`, `jose` 추가. |
| `ARCHITECTURE.md` | change | `src/features/auth/`, `api/auth/` 항목 추가. |
| `SPEC.md` | change | S-025d row 추가(draft). |
| `docs/spec/S-025d-oauth-google-apple.md` | add | 본 문서. |

## Open Questions

- Apple secret 만료(6개월) 운영 알람을 본 레포에 둘지(Vercel cron) 외부 운영 도구에 둘지. → MVP는 환경변수 `AUTH_APPLE_KEY_EXPIRY`(ISO 날짜) + 부팅 시 D-30 콘솔 warn으로 시작. 알람 자동화는 별도.
- Apple 콘솔에서 “이메일 숨김” 응답 시 자체 안내 메시지를 둘지. → 본 스펙은 이메일을 저장하지 않으므로 사용자 측 영향 없음. 부모 안내도 불필요.
- 세션 발급을 쿠키만 쓸지, Authorization Bearer 옵션도 노출할지. → MVP는 쿠키 단일 경로 권장. Bearer는 API 클라이언트가 필요해질 때 별도.
- merge 결과에서 어항 메타(이끼/청결)도 추가로 fish 단위로 합칠 수 있게 할지. → MVP는 부모 토글로 한쪽 본 통째 선택. 부분 머지는 인지 부담이 큼.
- 같은 계정에 어항이 “있을 수 있는 최대 개수”를 유지할지(현재 1개) 확장할지. → 멀티 어항은 본 스펙 범위 밖. 형제 시나리오는 S-025f 후보.
- 빈 계정(linkedDeviceIds 0) GC 주기 30일이 적절한지. → 보수적 시작 값. 텔레메트리(빈 계정 비율)로 조정.
- 계정 삭제 시 다른 탭/디바이스의 활성 JWT 무효화 여부. → MVP는 1시간 만료에 의존(취약 윈도). 즉시 무효화가 필요하면 `session-revocation:<accountId>` TTL=1h 키 + 매 요청 검사를 후속 스펙으로.

## Next Step

1. 본 스펙을 사람이 검토해 `ready`로 전환한다.
2. `ready` 후 다음 순서로 PR을 쪼개는 것을 권장한다.
   1. `api/_lib/session.js` + `api/_lib/oauth.js` + `api/_lib/appleClientSecret.js` 단위 테스트(라이브러리 결합 검증).
   2. `api/auth/config.js` + `api/auth/google/*` + `api/auth/apple/*` 라우트(시크릿 부재 분기 포함).
   3. `api/auth/link.js` + `api/auth/unlink.js` + 어항 owner 갱신.
   4. `api/account.js`(DELETE) + 7일 스냅샷/Blob/복구 코드 일괄 삭제.
   5. 클라이언트 `src/features/auth/`(부모 영역 슬롯 + 충돌 카드 merge 모드).
   6. 복구 코드(S-025c)와의 통합 wiring + 단조 톤 안내 1회.
3. 본 스펙이 done이 되면 부모 스펙 결정 2-1이 코드로 닫히고, S-025a 충돌 카드의 비활성 `merge` 버튼이 자연스럽게 활성 상태로 전환된다.
