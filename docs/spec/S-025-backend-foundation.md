# S-025 Backend Foundation (Vercel, 무인증 기본 + 선택적 OAuth)

## 상태

- 상태: draft
- 구현 여부: not-started
- 검증 여부: not-tested

## 목표

- My Fishbowl에 Vercel 기반 백엔드를 도입해 어항 데이터를 서버에 백업/복원할 수 있는 토대를 설계한다.
- **기본 동작은 무인증(익명 디바이스 ID)** 이고, Google/Apple OAuth는 **선택 기능**으로 분리해 메인 흐름이 OAuth 없이 끝까지 동작해야 한다.
- 기존 `features/aquarium/storage.js` 단일 영속화 진입점 원칙을 무너뜨리지 않고 local + remote 어댑터로 자연스럽게 일반화하는 경계를 만든다.
- 본 문서는 **설계 결정 문서**다. 코드를 작성하지 않으며, 후속 구현은 하위 스펙 조각(S-025a~d)으로 쪼갠다.

## 범위

- 포함:
  - 13개 결정 항목 + OAuth(2-1) 각각에 대한 추천안/근거/대안/검증/의존성 정리.
  - `ARCHITECTURE.md`에 추가될 디렉터리 경계 초안.
  - 하위 스펙 조각 분할안(S-025a~d)과 의존 그래프.
  - 위협 모델 요약(무인증 전제에서 위조/남용/데이터 분실).
- 제외:
  - 실제 구현 코드(라우트 핸들러, 어댑터, 마이그레이션 스크립트).
  - 다른 사용자와의 공유(공유 링크, 갤러리, 친구 어항 방문) — 본 백엔드 범위 밖.
  - AI 이미지 변환, 상점, 물고기 성장 시스템.
  - 본 스펙 단독으로의 `ARCHITECTURE.md` 본문 갱신 — 하위 스펙(S-025a)이 `ready`가 되는 시점에 일괄 반영.

## 사용자 흐름(설계 수준)

1. 사용자가 처음 앱을 연다 → 클라이언트가 디바이스 ID(UUID v4)를 발급해 `localStorage`에 저장하고 메모리에 보관한다. 사용자에게는 어떤 가입 화면도 노출되지 않는다.
2. 어항을 만들고 물고기를 등록하면 기존처럼 `localStorage`에 즉시 반영되고, **추가로** 서버에 비동기 push가 시도된다(오프라인 우선, 실패는 silently retry).
3. 사용자가 명시적으로 "백업/복원" UI에 진입한다 → 복구 코드 발급 또는 Google/Apple 연동을 선택할 수 있다.
4. 다른 기기에서 같은 OAuth 계정으로 로그인하면 클라이언트가 충돌을 감지하고 **병합/덮어쓰기/포기** 중 사용자가 선택한다.
5. 사용자가 백업을 끄거나 계정을 삭제하면 서버 데이터가 즉시 삭제되고, 클라이언트는 다시 `localStorage`-only 모드로 동작한다.

## UI/상태 요구사항(설계 수준)

- 필요한 화면 요소:
  - 백업 진입점(action cluster 또는 별도 패널)에 "Google/Apple로 백업" 버튼. **OAuth 시크릿이 비어 있으면 버튼 자체가 노출되지 않는다.**
  - 충돌 해결 다이얼로그(merge / overwrite / abandon 3선택).
  - 복구 코드 발급/입력 패널(MVP에서는 선택, S-025c로 분리).
- 필요한 상태:
  - 클라이언트 메모리: `deviceId`, `sessionToken?`, `accountLink?`, `syncStatus`(idle/syncing/error), `lastServerUpdatedAt`.
  - localStorage: 기존 `my-fishbowl:aquarium` 외에 `my-fishbowl:deviceId`, `my-fishbowl:backupOptIn`.
- 오류 또는 빈 상태:
  - 서버 응답 5xx/네트워크 실패: UI는 sync indicator만 노란색으로 바뀌고 사용자 흐름은 끊기지 않는다. localStorage write는 그대로 성공한다.
  - 동기화 충돌(`If-Match` 실패, 412): 자동 머지하지 않고 사용자 다이얼로그로 위임한다.
  - 디바이스 한도 초과(예: 어항 1개 상한 위반): 4xx + 명시 오류 메시지.

## 권장 아키텍처 요약

- **저장소**: Vercel KV(어항 메타) + Vercel Blob(sprite). Postgres는 대안.
- **API**: REST + zod 검증. 모든 요청에 `X-Device-Id` 헤더 필수. OAuth 연결 사용자는 추가로 `Authorization` Bearer JWT(짧은 수명).
- **동기화**: 오프라인 우선 + last-write-wins + ETag/`updatedAt` 기반 낙관적 동시성. 충돌은 사용자에게 위임.
- **이미지**: 클라이언트가 `/api/upload-url`로 서명된 Blob URL을 받아 직접 업로드. 서버는 메타만 저장.
- **OAuth**: Auth.js (`@auth/core`) 기반 Google/Apple. **link-after** 모델. 시크릿 없는 환경에서는 라우트 자체가 비활성화.
- **God Mode**: `VERCEL_ENV !== 'production'`에서만 라우트 마운트, `/api/dev/*` 프리픽스로 격리.

## 결정 항목

각 항목은 `추천 / 근거 / 대안 / 검증 / 의존성` 5단으로 정리한다.

### 1. 백엔드 범위(scope) 정의

- **추천**: MVP는 "디바이스 ID 기반 어항 1개 전체 백업/복원"부터 시작한다. 즉, `GET /api/aquarium`과 `PUT /api/aquarium`만 우선 제공.
- **근거**: 현재 데이터 모델이 어항 단일 문서(`aquarium` 객체) 구조라 부분 업데이트가 필요한 사용 사례가 없다. 단일 문서 pull/push가 가장 단순하면서 localStorage 단일 진입점 원칙과 자연스럽게 매핑된다. 후속(복구 코드, OAuth)은 같은 데이터 모델 위에 얹는다.
- **대안**: 처음부터 fish 단위 CRUD(`POST/PUT/DELETE /api/fish/:id`)를 노출. → 트래픽이 N배 늘고, 충돌 처리 복잡도가 fish 단위로 분산돼 MVP 가치 대비 비용이 크다.
- **검증**: 한 기기에서 어항을 변경한 뒤 동일 디바이스 ID로 다른 브라우저 세션에서 `GET`하면 변경이 그대로 복원된다. 서버에 데이터가 있는 상태로 `localStorage`만 비운 뒤 새로고침해도 어항이 복원된다.
- **명시적 제외**: 다른 사람과의 공유(공유 링크, 갤러리, 친구 어항 방문)는 본 스펙 범위에 포함하지 않는다. 데이터 모델/엔드포인트에 그 가능성을 미리 반영하지 않는다.
- **의존성**: 2(디바이스 ID), 3(저장소), 4(API).

### 2. 디바이스 ID 발급/저장

- **추천**: 클라이언트가 `crypto.randomUUID()`로 UUID v4를 발급해 `localStorage('my-fishbowl:deviceId')`에 저장한다. 첫 서버 요청에서 서버는 ID를 그대로 신뢰하고 새 owner 레코드를 upsert한다.
- **근거**: 서버 왕복 없이 즉시 발급 가능 → 오프라인 첫 사용에서도 동작. UUID v4는 충돌 확률이 무시 가능하다. 서버 발급으로 가져가면 첫 사용이 네트워크에 강제로 묶인다.
- **대안**: 서버가 `POST /api/device`로 ID를 발급. → 보안 이득이 거의 없고(어차피 클라이언트가 헤더로 전송), 오프라인 시작이 막힌다.
- **검증**: localStorage를 비우면 새 디바이스 ID가 생성되고 서버는 그것을 새 owner로 처리한다. ID가 같은 두 요청은 서버에서 같은 owner로 매핑된다.
- **백업 위치**: `localStorage` 외 IndexedDB 백업은 MVP에서 도입하지 않는다(과보호). 분실 위험은 **복구 코드(S-025c)** 와 **OAuth(S-025d)** 로 해결.
- **분실 흐름 우선순위**: 복구 코드 입력 → OAuth 로그인 → 새 디바이스 ID(데이터 분실 수용) 순으로 사용자에게 안내.
- **의존성**: 4(API), 8(레이트 리밋), S-025c(복구 코드).

### 2-1. OAuth(Google/Apple) 연동 — 선택 기능

- **추천 라이브러리**: `arctic`(Lucia 제작자의 OAuth-only 라이브러리, 프레임워크 비종속) + 자체 발급 단명 JWT(`jose`). Google Provider + Apple Provider 두 개만 등록한다.
- **근거**: 현재 스택은 Vanilla Vercel Functions로, Next.js/SvelteKit 같은 프레임워크 어댑터가 없다. `@auth/core`(Auth.js v5)는 어댑터 위에서 가장 잘 동작하고, 어댑터 없이 wiring하려면 내부 핸들러를 직접 호출해야 해 결합 비용이 늘어난다. `arctic`은 OAuth provider별 헬퍼만 제공해 세션/콜백 로직을 우리가 짧게 작성할 수 있고, 세션은 `jose`로 발급한 1시간 만료 JWT 하나로 충분하다.
- **대안 1**: `@auth/core`를 어댑터 없이 직접 호출. → 문서/예제가 프레임워크 어댑터 위주라 학습 비용이 크고, 우리가 쓰지 않는 추상화(account/user/session 테이블 어댑터 등)가 끌려온다.
- **대안 2**: Clerk/Supabase Auth(완전 매니지드). → 학습/통합 비용 작지만 벤더 락인이 크고, "OAuth는 선택 기능" 정책에 비해 인프라가 무겁다.
- **콜백 URL 전략**:
  - Google: 콘솔에서 production 도메인 + 단일 preview 도메인 + `http://localhost:5173`을 명시 등록. 와일드카드는 불가하지만 여러 URL 등록은 허용된다.
  - **Apple**: 콘솔이 와일드카드 불가 + URL 변경 시 즉시 반영되지 않을 수 있음. **preview 환경에 Apple 로그인을 노출하지 않는다**(`VITE_APPLE_ENABLED=false`로 production에서만 활성). preview에서는 Google만 동작하면 OAuth 충돌 흐름 검증에 충분.
  - `process.env.PUBLIC_BASE_URL`을 env별로 주입해 콜백 URL을 동적으로 구성. Apple은 production URL만 등록.
  - Apple은 client secret이 영구 토큰이 아니라 **JWT를 6개월마다 재생성**해야 하므로, `apple-secret-rotate.md` 운영 노트를 후속 스펙(S-025d)에 포함한다.
- **시크릿 명세**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APPLE_CLIENT_ID`(Services ID), `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`(P8 키 본문), `AUTH_JWT_SECRET`(자체 세션 JWT HMAC 키). 모두 Vercel Environment Variables, server-only(클라이언트 번들 노출 금지). Apple `client_secret`은 빌드/요청 시 위 4개 키로 JWT를 생성한다.
- **매핑 스키마**:
  ```
  account: { id: string (provider+sub), provider: 'google'|'apple', sub: string, linkedAt: ISO8601 }
  deviceAccountLink: { deviceId: string, accountId: string, linkedAt: ISO8601 }
  ```
- **익명 → OAuth 연결 흐름**:
  1. 사용자 백업 패널에서 "Google/Apple로 백업" → `/api/auth/<provider>/start`로 redirect.
  2. 콜백 `/api/auth/<provider>/callback`에서 provider sub를 받아 `account` upsert.
  3. 응답에서 짧은 수명 JWT(예: 1시간)를 발급하고, 클라이언트가 `POST /api/auth/link`로 현재 디바이스 ID와 결합 요청 → `deviceAccountLink` upsert.
  4. 이후 모든 요청에 `Authorization: Bearer <jwt>`가 동봉되면 서버는 `account_id` 컨텍스트도 함께 확인한다.
- **다른 기기에서 같은 OAuth 로그인 시(충돌)**: 서버는 `account_id`에 이미 매핑된 어항이 있고 새 디바이스에도 로컬 어항이 있으면 **양쪽 메타데이터를 응답에 같이 실어** 클라이언트가 사용자 선택(merge/overwrite/abandon)을 받게 한다. 자동 머지는 시도하지 않는다.
- **언링크(unlink)**: `POST /api/auth/unlink` → `deviceAccountLink` 삭제. 어항 데이터는 디바이스 ID에 그대로 남는다(default = 익명 상태 복귀). 어항을 계정에 남기는 옵션은 MVP 제외.
- **계정 삭제**: `DELETE /api/account` → 해당 `account_id`의 모든 링크 + 링크된 디바이스의 어항 데이터 + Blob 자산을 삭제. 작업 큐 없이 동기 삭제(MVP 데이터량 기준 충분).
- **PII 정책**: 무인증 사용자는 아무 PII도 저장하지 않는다. OAuth 사용자도 `provider`와 `sub`만 저장하고 이메일/이름/프로필 이미지는 저장하지 않는다.
- **OAuth 비활성 환경**:
  - 서버: 시크릿 환경변수가 비어 있으면 `/api/auth/*` 라우트가 404를 반환한다(라우트 자체를 export하지 않거나 가드 함수로 통일).
  - 클라이언트: 빌드 타임 또는 첫 부트 시 `/api/auth/config`로 활성 provider 목록을 받아 캐시. 활성 provider가 없으면 백업 버튼을 노출하지 않는다.
- **검증**:
  - OAuth 시크릿을 비운 상태로 dev/preview를 실행해도 모든 핵심 기능(어항 생성, 물고기 등록, 청소)이 동작한다.
  - 동일 OAuth 계정으로 두 번째 기기에서 로그인하면 충돌 다이얼로그가 뜨고, 사용자 선택에 따라 결과가 결정된다.
  - 계정 삭제 후 동일 OAuth 계정으로 재로그인하면 빈 어항 상태가 된다.
- **의존성**: 4(API), 9(관측), 10(환경 분리), S-025d.

### 3. 데이터 저장소 선택

- **추천**: 어항 메타데이터는 **Vercel KV(Upstash Redis 마켓플레이스 통합)**, 이미지(sprite)는 **Vercel Blob**.
  - KV 키 설계(MVP, 디바이스당 어항 1개 가정):
    - `aquarium:<aquariumId>` → JSON 직렬화된 `aquarium` 문서. 어항 ID는 UUID로 추측 불가.
    - `owner:<aquariumId>` → `{ deviceId, accountId? }`. 모든 GET/PUT에서 ownership 검증의 단일 진실원.
    - `device:<deviceId>` → `{ aquariumId, createdAt, lastSeenAt }`. 디바이스 → 어항 역인덱스.
    - `account:<accountId>` → `{ aquariumId, linkedDeviceIds[] }` (S-025d).
    - `recovery:<hash>` → `{ aquariumId, expiresAt }` (S-025c). **코드 평문 대신 SHA-256 해시를 키로 사용**한다.
  - 직접 `aquarium:<deviceId>` 키잉 대신 어항 ID와 ownership을 분리한 이유: OAuth 연결/복구 코드 사용 시 owner를 교체하는 작업이 ownership 키 1개만 다시 쓰면 끝나기 때문이다. 어항 데이터를 재키잉할 필요가 없다.
- **근거**: 현재 데이터 모델이 디바이스당 어항 1개의 단일 문서이고 부분 업데이트가 없다. Redis의 단일 GET/SET이 가장 단순하고 Vercel과 통합되어 cold start에 강하다. Blob은 sprite를 dataURL에서 분리해 KV 페이로드를 작게 유지한다.
- **대안**: Vercel Postgres(Neon). → 스키마가 명확하고 관계 질의가 가능하지만, 현재 데이터 모델에는 과한 도구다. 마이그레이션이 필요할 때 KV→Postgres 이전 비용은 한 번이고, 그 비용은 사용량이 커진 시점에 정당화된다.
- **벤더 락인**: Vercel KV는 사실상 Upstash Redis의 마켓플레이스 통합이라 동일 Upstash 계정/타 Redis로 이전 가능. Blob은 Vercel 전용이지만 인터페이스가 단순(`@vercel/blob`의 `put`/`del`/URL)해 S3 호환 스토리지로 교체 시 어댑터 1개만 바꾸면 된다.
- **쓰기 빈도 추정(MVP 가정)**: 활성 사용자 100명 동시, debounce 60s push → 분당 100 writes 상한. 비활성 시간은 push 없음. KV 무료 한도 안에서 충분(상세 추정은 13).
- **검증**: `GET/PUT /api/aquarium`이 KV에 기록되고, sprite 업로드 후 Blob URL이 어항 문서에 저장된다. 정전 시나리오(KV 일시 장애)에서 클라이언트는 localStorage-only로 계속 동작한다. ownership 교체(OAuth link, 복구 코드)는 어항 데이터 재기록 없이 1회 KV write로 완료된다.
- **의존성**: 1(범위), 4(API), 7(이미지 파이프라인), 13(비용).

### 4. API 표면

- **추천 스타일**: REST + JSON. zod로 요청/응답 검증. 모든 라우트는 `api/` Vercel Functions 디렉터리에 둔다.
- **엔드포인트 목록(MVP + 선택)**:
  - `GET  /api/aquarium` — 현재 디바이스의 어항 문서. 304/200 + ETag.
  - `PUT  /api/aquarium` — 전체 어항 문서 upsert. `If-Match: <etag>` 필수, 불일치 시 412 + 서버 최신본 반환.
  - `POST /api/upload-url` — sprite 업로드용 서명 URL 발급. `{ contentType, size }` 검증, 디바이스당 빈도 제한.
  - `POST /api/upload-commit` — 클라이언트 업로드 완료 통지. 서버가 Blob에서 magic byte 검증 후 어항에 URL을 반영. 검증 실패 시 즉시 Blob 삭제 + 400.
  - `POST /api/recovery-code` (S-025c) — 디바이스에 1회용 복구 코드 발급.
  - `POST /api/recovery-redeem` (S-025c) — 복구 코드 + 새 디바이스 ID 조합으로 owner 재매핑.
  - `GET  /api/auth/config` (S-025d) — 활성 OAuth provider 목록.
  - `GET  /api/auth/<provider>/start`, `GET /api/auth/<provider>/callback` (S-025d).
  - `POST /api/auth/link`, `POST /api/auth/unlink` (S-025d).
  - `DELETE /api/account` (S-025d).
  - `POST /api/dev/*` (S-DEV) — God Mode 전용, 프로덕션에서 404.
- **공통 인증/컨텍스트 추출**:
  - 모든 라우트는 `X-Device-Id` 헤더가 필수. 미존재/형식 오류 시 400.
  - 라우트 핸들러는 `getRequestContext(req)` helper로 `{ deviceId, accountId? }`를 받는다. 익명 흐름은 `accountId === undefined`로 분기.
  - `Authorization: Bearer <jwt>`가 있으면 검증 후 `accountId`를 채운다. 검증 실패 시 익명으로 fallback(JWT 만료는 흔하므로 401로 막지 않음).
- **멱등성/동시성**:
  - 어항 PUT은 `updatedAt`을 ETag로 사용. `If-Match` 불일치 시 412 + 서버 본문 반환.
  - 이미지 업로드는 클라이언트가 생성한 `uploadId`(UUID)를 `Idempotency-Key`로 사용해 동일 업로드 재시도 시 같은 URL을 반환.
- **응답 표준**: `200/201/204/304/400/401/403/404/409/412/429/500`. 오류는 `{ error: { code, message } }` 일관 구조.
- **검증**: 각 라우트가 zod 스키마와 1:1로 매핑되고, 모든 4xx에는 `error.code`가 채워진다. 익명/OAuth 두 컨텍스트가 같은 라우트에서 모두 동작한다.
- **의존성**: 2, 2-1, 5, 7, 8.

### 5. 클라이언트 ↔ 서버 동기화 모델

- **추천**: **오프라인 우선 + last-write-wins + 낙관적 동시성(ETag)**. localStorage가 1차 캐시이고 서버는 백업/복원/멀티 디바이스 동기화의 신뢰원이다.
- **근거**: 어항 데이터는 단일 사용자가 단일 어항을 편집하는 시나리오라 CRDT의 비용을 정당화하지 못한다. 충돌은 거의 멀티 디바이스 OAuth 케이스에서만 발생하며, 그때는 자동 머지보다 사용자 선택이 안전하다.
- **대안**: CRDT(Yjs/Automerge). → 라이브러리 사이즈와 학습 비용이 크고, sprite dataURL 같은 큰 binary는 CRDT에 부적합.
- **어댑터 구조**(`features/aquarium/storage.js`의 단일 진입점 원칙 보존/일반화):
  ```
  src/features/aquarium/storage/
    index.js      // public API: loadAquarium, saveAquarium, syncStatus$
    local.js      // 현재 storage.js를 그대로 이전. localStorage I/O 전담.
    remote.js     // fetch 기반 API 클라이언트. 모든 외부 HTTP는 여기만.
    sync.js       // 두 어댑터 결합. write-through + background reconcile.
  ```
  - 외부 모듈은 여전히 `import { loadAquarium, saveAquarium } from 'features/aquarium/storage'`만 사용한다.
  - `remote.js`가 비활성화(환경변수 미설정)면 `sync.js`는 자동으로 `local.js`만 호출한다.
- **reconcile 전략**:
  - 앱 부팅 시 `local`이 있으면 즉시 렌더, 백그라운드로 `GET /api/aquarium` 호출.
  - 서버 응답 `updatedAt > local.updatedAt`이면 사용자에게 머지/덮어쓰기/포기 다이얼로그를 띄운다(자동 적용 금지).
  - 사용자 변경 발생 시 local에 즉시 저장 + debounced PUT. PUT 412(`If-Match` 실패) → reconcile 다이얼로그.
- **검증**: 오프라인에서 어항을 편집한 뒤 온라인으로 돌아오면 한 번의 PUT으로 동기화된다. 두 기기에서 같은 어항을 편집하면 두 번째 PUT이 412를 받고 사용자에게 선택이 위임된다.
- **의존성**: 1, 4, 6.

### 6. 시간 모델 정합성

- **추천**: **서버 시간이 신뢰원**이다. `updatedAt`, `lastCleanedAt`은 모두 서버가 PUT 응답에 stamp한다. 클라이언트는 응답에서 받은 baseline에 자신의 monotonic clock(`performance.now()` 델타)을 더해 세션 중에만 보간한다.
- **근거**: 이끼 레벨은 `lastCleanedAt` 기준 30분 단위. 사용자가 시스템 시계를 바꾸거나 시차가 있는 두 기기를 쓰면 레벨이 흔들린다. 서버 시간을 기준으로 두면 멀티 디바이스에서도 일관된 레벨이 산출된다.
- **대안**: 클라이언트 시간 유지 + 서버는 단순 보관. → 단순하지만 멀티 디바이스 일관성을 잃는다.
- **clock skew 보정**: 서버 응답 헤더 `Date`와 클라이언트 `Date.now()` 차이를 sync 시 기록(`serverTimeOffset`). 클라이언트가 새 mutation을 보낼 때 자신의 `Date.now() + serverTimeOffset`을 사용. 차이가 ±5분 초과면 사용자에게 시계 점검 경고(데이터는 거절하지 않음, 디그레이드된 UX만).
- **God Mode와의 관계**: God Mode가 `lastCleanedAt`을 역산해 강제로 쓸 때도 서버 stamp가 우선. dev 환경에서만 `/api/dev/algae-level`이 서버 시간을 받아 역산값을 그대로 저장.
- **검증**: 사용자 기기의 시스템 시계를 1시간 뒤로 돌려도 이끼 레벨이 점프하지 않는다. 두 기기에서 같은 어항을 보면 ±1분 안에 같은 이끼 레벨이 보인다.
- **의존성**: 1, 4, 10(God Mode 분리).

### 7. 이미지 업로드 파이프라인

- **추천**: 클라이언트가 `POST /api/upload-url`로 서명된 Blob URL을 받고 **직접 Blob에 PUT**한다. 서버는 메타데이터만 KV 어항 문서에 반영(URL 저장).
- **근거**: Vercel Function 페이로드 4.5MB 한계와 실행 시간 비용을 회피한다. 동시에 sprite를 dataURL에서 분리해 KV 페이로드를 크게 줄인다.
- **대안**: 함수 경유 업로드(클라이언트 → Function → Blob). → 함수가 trans-proxy가 되어 비용과 latency가 늘고, 페이로드 한계로 큰 이미지에서 실패한다.
- **검증/제한**:
  - Content-Type: `image/png`, `image/jpeg`, `image/webp`만 허용.
  - 최대 크기: 1MB(현재 240×160 리사이즈 관행과 충분히 양립). 서명 URL 발급 시 명시.
  - 디바이스당 빈도: 10 uploads/min, 50 sprites total(어항당). 초과 시 429.
  - 악성 파일 다층 검증:
    1. **클라이언트**: `createImageBitmap` 성공 후에만 업로드 요청(잘못된 이미지 사전 차단).
    2. **서명 URL 발급 단계**: MIME, 선언된 크기, 디바이스 owner 검사.
    3. **업로드 완료 후 서버 검증**: 클라이언트가 `POST /api/upload-commit`을 호출하면 서버가 Blob에서 **첫 16바이트를 읽어 magic byte로 실제 MIME 재검증**(PNG `89 50 4E 47`, JPEG `FF D8 FF`, WebP `52 49 46 46 ... 57 45 42 50`). 불일치 시 Blob에서 즉시 삭제하고 어항 문서에 URL 기록하지 않는다.
  - 클라이언트 검증만으로는 우회 가능(서명 URL을 받아 임의 PUT)하므로 서버 magic byte 검증이 신뢰원이다.
- **URL 정책**: Blob URL은 공개 immutable URL을 사용한다(어항 ID/sprite ID가 충분히 추측 불가). 캐시는 1년(`Cache-Control: public, max-age=31536000, immutable`). 삭제는 어항 PUT에서 누락된 sprite를 background로 GC.
- **위협 모델(보안 민감 경로)**: 디바이스 ID 위조 → 타인 어항 sprite URL 발급은 어항 소유권 검사로 차단. 무한 업로드로 비용 폭주 → 빈도/사이즈 한도 + Blob 전체 사용량 모니터링. 악성 파일 업로드 → 외부 노출 URL이라 XSS 표면이 됨, MIME/매직 바이트/`Content-Disposition: attachment` 비사용 정책으로 완화. SVG는 스크립트 임베드 가능성이 있어 **MIME 화이트리스트에서 제외**한다.
- **의존성**: 3, 4, 8.

### 8. 레이트 리밋/남용 방지

- **추천**: `@upstash/ratelimit`를 Vercel KV 위에서 사용한다. 키는 `<route>:<deviceId>` 기본, 보조로 `<route>:ip:<ip>`도 함께 카운트.
- **근거**: 디바이스 ID는 위조 가능하므로 IP와 조합해 폭주를 막는다. KV와 같은 인프라를 재사용해 외부 의존을 늘리지 않는다.
- **대안**: Cloudflare Rate Limiting 등 엣지 단 솔루션. → Vercel 전용 라우트와의 통합 비용 증가.
- **한도(MVP)**:
  - `PUT /api/aquarium`: 60 req/min/device.
  - `POST /api/upload-url`: 10 req/min/device.
  - `POST /api/auth/*`: 20 req/min/ip.
  - 어항 페이로드 크기: 100KB(sprite는 Blob URL이므로 메타만 들어옴).
  - 어항 수: 디바이스당 1개. 물고기 수: 어항당 50개. 위반 시 422 + 명시 오류 메시지.
- **응답 코드**: 429 + `Retry-After` 헤더 + `error.code = 'rate_limited'`.
- **위협 모델**: 디바이스 ID rotation을 통한 우회 → IP 한도와 신규 디바이스 ID 발급률 모니터링으로 보완. 비용 폭주 → 어항/물고기 hard cap.
- **검증**: 한도를 넘는 요청은 429를 반환하고 클라이언트는 `Retry-After`만큼 backoff한다. 디바이스당 어항 2개 생성을 시도하면 422.
- **의존성**: 3, 4, 13.

### 9. 관측(Observability)

- **추천**: Vercel Logs는 기본 출력 채널로 쓰고, 구조화된 JSON 로그(`{ ts, level, route, deviceId, accountId?, durationMs, status, errorCode? }`)를 console.log로 emit. 에러 추적은 `@sentry/serverless`(또는 동등 라이브러리) 1순위, 미사용 시 Vercel Logs로 충분.
- **근거**: Vercel은 console.log를 자동 수집하므로 추가 인프라 없이 로그가 적재된다. 구조화된 필드만 갖춰지면 나중에 Axiom/Datadog/Sentry 어떤 백엔드로도 라우팅이 쉽다.
- **대안**: Axiom 직접 연동. → 좋은 옵션이지만 MVP 단계에서는 과한 의존성.
- **핵심 지표**:
  - `aquarium_put_success_total`, `aquarium_put_conflict_total`(412), `aquarium_put_error_total`.
  - `upload_url_issued_total`, `upload_url_rejected_total`.
  - `auth_link_success_total`, `auth_conflict_dialog_total`.
  - `device_active_distribution`(디바이스당 24h 요청 수 히스토그램, 비용 폭주 조기 경보).
- **PII**: 로그에 절대 sprite dataURL이나 어항 이름 같은 사용자 콘텐츠를 남기지 않는다. `deviceId`/`accountId`만 식별자로 사용.
- **검증**: 412 시나리오와 429 시나리오가 각각 별도 카운터로 잡힌다. 한 디바이스가 한도를 100% 채우는 동안 알람 임계가 트리거된다(임계 정의는 운영 후 튜닝).
- **의존성**: 4, 8.

### 10. God Mode와 환경 분리

- **추천**: God Mode 라우트는 `/api/dev/*` 프리픽스로 격리하고, 핸들러 첫 줄에서 `if (process.env.VERCEL_ENV === 'production') return new Response(null, { status: 404 })` 가드. 클라이언트 UI는 `import.meta.env.PROD`로 트리에서 제거(Vite의 dead-code elimination).
- **근거**: 단일 가드 헬퍼(`assertNotProduction()`)로 일관성을 보장하고, 빌드 산출물에서 dev 코드가 빠지면 노출 표면 자체가 사라진다.
- **대안**: 별도 Vercel 프로젝트(prod / dev)로 완전 분리. → 환경 동시 운용 비용이 큰 데 비해 가드 helper만큼의 안전성을 더 주지 않는다.
- **검증**:
  - production 배포의 `/api/dev/*`는 모두 404.
  - production 빌드 산출물에 `godmode-props.dev.js`가 포함되지 않는다(현재 파일명 규약 활용).
- **의존성**: 4, 9.

### 11. 마이그레이션 계획

- **추천**: **1회성 client-initiated 마이그레이션**. 사용자가 처음 백업을 켜는 시점에 `local.js`의 현재 어항 문서를 그대로 `PUT /api/aquarium`으로 올린다. 기존 디바이스 ID가 없으면 그 시점에 발급.
- **근거**: 서버는 처음부터 비어 있고, 기존 사용자 데이터는 모두 클라이언트 localStorage에 있다. 클라이언트가 본인 데이터만 한 번 올리면 충분하다.
- **대안**: 자동 백그라운드 마이그레이션(앱 부팅 시 묻지 않고 push). → 백엔드 도입 시점에 모든 기존 사용자가 갑자기 네트워크 트래픽을 일으키고 PII가 아닌데도 사용자 선택을 우회하므로 권장 안 함.
- **롤백**: 환경변수 `BACKEND_ENABLED=false`로 클라이언트가 `remote.js`를 비활성화하고 `local.js`만 사용한다. 서버 장애 시에도 자동 fallback과 동일 동작.
- **sprite 분리 마이그레이션**: 기존 어항 문서의 dataURL은 첫 PUT 시 자동으로 Blob에 분리 업로드된다(클라이언트 helper). 실패 시 dataURL 채로 남겨두고 sync indicator 경고.
- **검증**:
  - 기존 사용자 시나리오: localStorage에만 데이터가 있는 상태에서 백업 ON → 한 번의 PUT으로 서버 상태가 일치한다.
  - 롤백: `BACKEND_ENABLED=false`로 재배포하면 클라이언트는 어떤 네트워크 호출도 하지 않고 localStorage로만 동작한다.
- **의존성**: 3, 4, 5, 7.

### 12. 테스트 전략

- **추천**: 어댑터 인터페이스를 다음과 같이 정의하고 `remote.js`를 vitest에서 모킹한다.
  ```
  // features/aquarium/storage/remote.js (인터페이스 수준)
  fetchAquarium(deviceId, opts) => Promise<{ aquarium, etag } | null>
  putAquarium(deviceId, aquarium, etag) => Promise<{ etag }>  // 412 throw
  issueUploadUrl(deviceId, meta)      => Promise<{ url, fields }>
  ```
- **근거**: 외부 HTTP 의존을 한 모듈에 모으면 vitest는 그 모듈만 모킹하면 된다. 다른 feature는 기존처럼 storage public API만 알면 충분.
- **단위 테스트**: `sync.js`의 reconcile 분기(local-only, server-newer, conflict, network-failure)를 모킹된 `remote.js` 위에서 모두 커버.
- **통합 테스트**: `vercel dev` 또는 `npx vercel build && start`로 로컬 함수 실행. KV/Blob은 Vercel 미러 또는 in-memory fake(`src/test/fakes/`)를 우선 사용. 별도 통합 환경은 stage Vercel 프로젝트에서 manual smoke test로 한정.
- **위조/충돌 시나리오 테스트**:
  - 두 개의 디바이스 ID로 같은 OAuth 계정에 link → 두 번째 GET 시 충돌 메타가 응답에 실린다.
  - 잘못된 ETag로 PUT → 412.
  - 디바이스 ID 누락 → 400.
  - 음수/거대 페이로드 → 400/413.
- **검증**: 기존 `npm test`(148 tests)가 모두 통과하고, 새 어댑터 테스트가 reconcile 분기 4종을 모두 커버한다.
- **의존성**: 5, 4.

### 13. 비용 모델

- **가정**: MAU 1,000, DAU 100(10%), 활성 사용자 1인당 세션 30분/일, 편집 발생 시 debounce 60s push, 디바이스당 어항 1개, 평균 sprite 10개(개당 50KB).
- **쓰기 빈도 추정**: 100 DAU × 30분 × 1 push/min(상한, 실제로는 편집 idle 동안 더 적음) = **~3,000 PUT/일 ≈ 90k PUT/월**. Vercel Hobby Functions 무료 100k invocations/월에 근접. 여기에 `GET /api/aquarium`(부팅당 1회) ~3k/일이 더해져 **총 ~180k invocations/월**.
- **추정**:
  - **Blob**: 1k × 10 × 50KB = 500MB 저장 + sprite GET은 CDN에서 처리되어 함수 호출 0. Vercel Blob Hobby 무료 1GB 저장 / 10GB 전송 안에 들어옴. 초과 시 약 $0.15/GB-mo 저장 + 전송 비용.
  - **KV**: 1k devices × ~20KB(어항 평균 페이로드, sprite는 URL만) = 20MB. Upstash Free 256MB에 여유. 명령 수는 PUT 시 GET+SET 2회 + ownership 검사 1 GET = ~3 ops/PUT → ~270k ops/월. Upstash 무료 한도(10k/일) 초과 가능성 → 마켓플레이스 통합의 Hobby 한도 재확인 필요.
  - **Functions**: 위 추정상 Hobby 100k invocations/월 한도를 초과한다(약 1.8배). 대응: ① debounce 간격을 120s로 늘리거나, ② 변경 없을 때 PUT을 보내지 않는 dirty flag를 엄격히 구현하면 절반 이하로 감소 가능. 그래도 Pro 플랜이 필요한 시점은 DAU 200~300 정도.
  - **이미지 GET**: Blob URL은 immutable + 1년 캐시 → CDN edge에서 처리, 함수 호출 없음.
- **결론**: MVP는 Hobby 한도 임계. **debounce 60s + dirty flag**가 가장 효과적이며, KV ops 한도가 함수 한도보다 먼저 깨질 수 있으므로 출시 후 ops/일 모니터링 임계를 우선 설정한다.
- **Hard cap**:
  - 디바이스당 Blob 저장: 5MB.
  - 디바이스당 KV 페이로드: 100KB.
  - 디바이스당 일일 PUT: 1,000회.
  - 어항/물고기 수: 1/50.
- **검증**: 30일 누적 사용 시뮬레이션에서 위 cap 안에서 비용이 추정 범위 안에 머문다. 비용 폭주 가능 사용자(상위 1%)가 cap에 막혀 422를 받는다.
- **의존성**: 3, 7, 8.

## ARCHITECTURE.md 추가 섹션 초안

본 스펙이 `ready`가 되고 하위 스펙(S-025a)이 구현될 때 `ARCHITECTURE.md`에 반영할 초안. 본 문서 단독으로는 아직 반영하지 않는다.

### 디렉터리 경계 제안

```text
.
├── api/                                # Vercel Functions 디렉터리
│   ├── _lib/
│   │   ├── context.js                  # getRequestContext (deviceId/accountId 추출)
│   │   ├── kv.js                       # KV 클라이언트 어댑터
│   │   ├── blob.js                     # Blob 클라이언트 어댑터
│   │   ├── ratelimit.js                # @upstash/ratelimit wrapper
│   │   ├── schema.js                   # zod 스키마 모음
│   │   └── envGuard.js                 # assertNotProduction 등
│   ├── aquarium.js                     # GET/PUT /api/aquarium
│   ├── upload-url.js                   # POST /api/upload-url
│   ├── upload-commit.js                # POST /api/upload-commit (magic byte 재검증)
│   ├── recovery-code.js                # S-025c
│   ├── recovery-redeem.js              # S-025c
│   ├── auth/                           # S-025d
│   │   ├── config.js
│   │   ├── [provider]/start.js
│   │   ├── [provider]/callback.js
│   │   ├── link.js
│   │   └── unlink.js
│   ├── account.js                      # DELETE /api/account (S-025d)
│   └── dev/                            # production 404 가드
│       └── algae-level.js
└── src/
    ├── lib/
    │   └── deviceId.js                 # 발급/조회/회전 단일 책임
    ├── services/
    │   └── api.js                      # 클라이언트 fetch 래퍼(공통 헤더, 에러 변환)
    └── features/
        ├── aquarium/
        │   ├── storage/                # 기존 storage.js를 디렉터리로 일반화
        │   │   ├── index.js            # public API (loadAquarium, saveAquarium 등)
        │   │   ├── local.js            # 현재 storage.js의 localStorage I/O
        │   │   ├── remote.js           # services/api.js 사용. 외부 HTTP은 여기만.
        │   │   └── sync.js             # 두 어댑터 결합 + reconcile
        │   └── ... (기존 파일들)
        └── auth/                       # S-025d, OAuth UI/상태. 시크릿 없으면 트리에서 제거 가능.
            ├── index.js
            ├── state.js
            └── view.js
```

### 영속화 단일 진입점 원칙의 일반화

- 현재 원칙: "영속화는 `features/aquarium/storage.js` 한 곳에서만 일어난다."
- 일반화 후: **"어항 영속화의 모든 외부 I/O는 `features/aquarium/storage/`에서만 일어난다. 다른 feature는 `import { ... } from 'features/aquarium/storage'`만 사용한다."**
- 새 어댑터(remote)도 같은 디렉터리 안에 있으므로 외부 모듈은 어댑터 존재를 알 필요가 없다.
- 클라이언트의 일반 HTTP 호출은 `src/services/api.js` 한 곳에서만 일어난다. feature 모듈이 `fetch`를 직접 호출하지 않는다.

### 디바이스 ID 라이프사이클

- `src/lib/deviceId.js`가 단일 책임:
  - `getOrCreateDeviceId()` → localStorage 조회, 없으면 `crypto.randomUUID()` 발급 후 저장.
  - `rotateDeviceId(newId)` → 복구 코드/OAuth 흐름에서 명시적 재매핑할 때만 사용.
  - 다른 모듈은 직접 localStorage의 deviceId 키를 만지지 않는다.

### OAuth 비활성 환경에서의 트리 분리

- `src/features/auth/`는 빌드 타임 환경변수 `VITE_OAUTH_ENABLED`가 false면 import되지 않게 `main.js`에서 dynamic import + `import.meta.env`로 가드. Vite는 false 분기를 dead-code 제거한다.
- 서버 측에서는 `api/auth/*` 라우트가 시크릿 부재 시 404를 반환하므로 라우트 자체가 의도된 비활성 상태로 노출된다.

## 하위 스펙 조각 분할안

본 문서가 `ready`가 되면 다음 순서로 쪼개 구현한다. 각 하위 스펙은 별도 `docs/spec/S-025x-*.md`로 작성한다.

| ID | 제목 | 핵심 산출물 | 의존 |
| --- | --- | --- | --- |
| S-025a | 디바이스 ID + 서버 저장소 어댑터(MVP) | `src/lib/deviceId.js`, `src/services/api.js`, `features/aquarium/storage/` 디렉터리화, `api/aquarium.js`, KV 연결, `BACKEND_ENABLED` 플래그, reconcile 다이얼로그 1차. | 없음 |
| S-025b | 이미지 업로드 파이프라인 | `api/upload-url.js`, Blob 연결, 클라이언트 sprite→Blob 분리, sprite GC. | S-025a |
| S-025c | 복구 코드 발급/사용 | `api/recovery-code.js`, `api/recovery-redeem.js`, 백업 패널 UI 1차. | S-025a |
| S-025d | Google/Apple OAuth 연동 | `src/features/auth/`, `@auth/core` 통합, `api/auth/*`, link/unlink/account-delete, 충돌 다이얼로그 확장. | S-025a |
| S-025e (선택) | 관측/Rate limit 강화 | Sentry 옵션, `@upstash/ratelimit` 미세 조정, 비용 알람. | S-025a |

각 하위 스펙은 단독으로 검증 가능해야 하고, 상위 스펙이 done이 되면 ARCHITECTURE.md의 본문 트리/책임 절에 통합한다.

## 위협 모델 요약

| 경로 | 위협 | 완화 |
| --- | --- | --- |
| 디바이스 ID 헤더 | 위조 → 타인 어항 enumeration | 어항 ID는 UUID. 모든 조회/쓰기는 `aquarium:<deviceId>` 키로 owner를 1차 식별. 디바이스 ID 발급률 모니터링. |
| `PUT /api/aquarium` | 페이로드 폭주, 한도 미달 사용자에 비용 부담 | 페이로드 100KB 한도, 60 req/min/device, 4xx 명시 응답. |
| `/api/upload-url` | 악성 파일/큰 파일 업로드, XSS 표면 | Content-Type/크기 한도, Canvas 디코딩 검증, immutable 공개 URL, 디바이스당 빈도 cap. |
| OAuth 콜백 | CSRF, redirect URL 조작 | `@auth/core` state/nonce 검증, 콜백 도메인 환경별 화이트리스트. |
| 시크릿 노출 | 클라이언트 번들에 시크릿 포함 | 시크릿은 `VITE_` 프리픽스 없는 환경변수만 사용. OAuth client secret은 서버 전용. |
| God Mode | 프로덕션 노출 | 라우트 가드 + Vite dead-code 제거 + 파일명 `.dev.js` 규약. |
| 데이터 분실 | 디바이스 ID 분실 = 어항 분실 | 복구 코드(S-025c) 발급 권유, OAuth(S-025d) 백업 권유. |
| 비용 폭주 | 한 디바이스/계정의 과도한 요청 | 어항/물고기 cap, KV 페이로드 cap, 일일 PUT cap, Blob 저장 cap. |

## 검증 기준

- [ ] 13개 결정 항목 + OAuth(2-1) 모두 추천/근거/대안/검증/의존성이 채워져 있다.
- [ ] 무인증 전제에서 위조/남용/데이터 분실 세 시나리오가 위협 모델에 모두 포함되어 있다.
- [ ] OAuth 시크릿이 없는 상태에서 모든 핵심 기능이 동작할 수 있는 분리 방식이 명시되어 있다(서버 라우트 404 + 클라이언트 트리 dead-code 제거).
- [ ] 익명 → OAuth 연결 충돌 시 merge/overwrite/abandon UX 분기가 명시되어 있다.
- [ ] 기존 `features/aquarium/storage.js` 단일 진입점 원칙을 보존하면서 일반화하는 디렉터리 구조가 제시되어 있다.
- [ ] Vercel Functions 제약(실행 시간, 페이로드, cold start)을 결정 항목에서 명시적으로 고려했다(특히 7, 13).
- [ ] God Mode가 프로덕션에 노출되지 않을 방법이 명시되어 있다(10).
- [ ] 비용 추정에 구체 시나리오(MAU 1k, sprite 10개/어항 등)와 hard cap이 포함되어 있다(13).
- [ ] 하위 스펙 분할(S-025a~e)이 의존 그래프와 함께 정리되어 있다.
- [ ] 본 스펙 단독으로는 코드를 추가하지 않으며, `npm test`/`npm run build`가 기존대로 통과한다(문서 변경만 검증).

## Files To Add or Change

본 스펙 자체로 변경하는 파일은 문서 2개뿐이다. 코드/디렉터리 변경은 하위 스펙에서 일어난다.

| Path | Action | Purpose |
| --- | --- | --- |
| `docs/spec/S-025-backend-foundation.md` | add | 본 설계 문서. |
| `SPEC.md` | change | S-025 row를 draft로 추가. |
| `ARCHITECTURE.md` | future change | S-025a `ready` 시점에 위 "ARCHITECTURE.md 추가 섹션 초안"을 본문에 통합. |

## Open Questions

- 복구 코드(S-025c)를 MVP에 포함할지, OAuth(S-025d) 이후로 미룰지. → 권장: OAuth 의존성 없이 분실 위험을 낮추는 가장 작은 옵션이므로 S-025a 직후가 합리적.
- OAuth 라이브러리로 `arctic`을 갈지 `@auth/core`를 직접 호출할지. → 본 스펙은 Vanilla Vercel Functions 적합성을 근거로 `arctic`을 1순위로 추천. 후속 S-025d에서 콜백 핸들러 골격을 짠 뒤 최종 확정.
- Apple 로그인을 preview/staging 환경에 노출하지 않기로 한 정책을 어디까지 적용할지(로컬 dev 포함?). → MVP는 production-only 권장. preview에서 Apple 흐름이 필요한 시점에 별도 Apple Services ID를 발급해 분리.
- KV ops 한도(Upstash 무료/Hobby)와 Functions 한도 중 어느 쪽이 먼저 깨질지 출시 후 실측이 필요. → S-025e(관측)에서 ops/일 알람을 함수 호출수 알람과 동시에 둔다.
- `BACKEND_ENABLED=false`를 첫 배포 기본값으로 둘지(점진 출시), true로 둘지. → 첫 배포에서는 기능 플래그를 false로 두고 일부 사용자에게만 켜는 방식 권장.
- 어항 ID/ownership 분리 모델을 MVP부터 도입할지, 단순 `aquarium:<deviceId>` 키로 시작했다가 OAuth 단계에서 마이그레이션할지. → 본 스펙은 처음부터 분리 모델을 권장(마이그레이션 비용 회피). 분리 모델의 추가 KV ops 1회/요청이 비용 추정에 이미 반영됨.

## Next Step

1. 사용자가 본 스펙을 검토해 결정 항목별 추천안을 수용/수정한다.
2. 수용된 결정으로 본 스펙을 `ready`로 바꾼다.
3. S-025a(디바이스 ID + 서버 저장소 어댑터 MVP)부터 `docs/spec/S-025a-*.md`로 분할 작성하고, `ready` 후 구현에 들어간다.
4. S-025a 구현이 done이 되는 시점에 `ARCHITECTURE.md` 본문 트리/책임 절에 디렉터리 경계 초안을 통합한다.
