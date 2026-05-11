# 백엔드 시스템 설계 프롬프트 (My Fishbowl, Vercel 배포, 무인증 기본 + 선택적 OAuth)

## 역할

당신은 시니어 백엔드 아키텍트다. 다음 제약 안에서 **My Fishbowl** 프로젝트에 백엔드 시스템을 도입하는 설계 문서(`docs/spec/S-XXX-backend-foundation.md`와 `ARCHITECTURE.md` 추가 섹션)를 작성한다. 구현 코드는 작성하지 않는다.

## 프로젝트 컨텍스트

- **앱**: 브라우저 기반 개인 2D 어항 시뮬레이터(My Fishbowl).
- **현재 스택**: Vite + Vanilla JavaScript(ES Modules), `src/features/<feature>/` 단위 모듈, `src/styles/` 역할별 CSS.
- **현재 영속화**: `src/features/aquarium/storage.js`만 `localStorage`(`STORAGE_KEY = 'my-fishbowl:aquarium'`)로 I/O를 수행. 다른 모듈은 storage를 직접 호출하지 않는다.
- **현재 데이터 모델** (`features/aquarium/model.js`):
  - `aquarium`: `id`, `name`, `fishes[]`, `cleanliness`, `algaeLevel`, `lastCleanedAt`, `bounds`, `createdAt`, `updatedAt`.
  - `fish`: 사용자 업로드/직접 그리기 이미지를 dataURL로 보관 → sprite로 사용.
- **시간 의존성**: 이끼는 `lastCleanedAt`을 기준으로 30분 단위로 0~96 레벨이 산출됨(서버/클라이언트 시간 정합성 중요).
- **개발 환경 전용**: God Mode(이끼 레벨 직접 지정, `lastCleanedAt` 역산) — 프로덕션에서는 노출되면 안 됨.
- **명시적 제외 사항(현재 스펙)**: 로그인, 친구 어항 방문, AI 이미지 변환, 상점, 서버 저장.
  - 백엔드 도입은 이 중 "서버 저장"을 의도적으로 해제하는 작업이다. 다른 제외 항목과의 경계가 흐려지지 않도록 명확히 선을 그어야 한다.

## 배포/런타임 제약

- **호스팅**: Vercel(프론트엔드 정적 + 서버리스/Edge Functions).
- **함수 런타임 한계**: Hobby 플랜 기준 cold start, 함수 실행 시간(기본 10초, Edge는 더 짧음), 응답 페이로드 4.5MB, 메모리/리전 제한을 전제로 설계.
- **상태 저장소 후보**: Vercel KV(Upstash Redis), Vercel Postgres(Neon), Vercel Blob, 외부(Supabase, PlanetScale, Cloudflare R2 등). 각 후보의 적합성/비용/벤더 락인을 비교할 것.
- **이미지 처리**: 물고기 sprite는 현재 dataURL로 저장됨 → 백엔드 도입 시 Blob/오브젝트 스토리지로 옮기되 URL 수명/캐시 정책을 설계.
- **시크릿**: API 키/DB URL은 Vercel 환경변수, 클라이언트 노출 금지.

## 인증 전제: 무인증 기본 + 선택적 Google/Apple 연동

이 설계의 **기본 동작은 로그인 없음(익명 디바이스 ID)**이고, **Google/Apple 계정 연동은 선택 기능**이다. 다음을 반드시 다룬다.

### 기본: 익명 디바이스 ID

- **디바이스 식별자**: 클라이언트가 로컬에서 생성한 익명 ID(예: UUID v4)를 `localStorage`에 보관하고 모든 요청에 헤더(`X-Device-Id`)로 동봉한다. 서버는 이 ID를 어항 소유권의 1차 키로 사용한다.
- **소유권 모델**: 어항 리소스의 owner는 디바이스 ID 1개. 디바이스 ID가 바뀌면(브라우저 데이터 삭제, 다른 기기) 동일 어항에 접근할 수 없다는 점을 UX 제약으로 명시.
- **복구 코드(선택)**: 데이터 분실 위험을 낮추기 위해 서버가 인간이 읽을 수 있는 복구 코드(예: `frog-glass-42`)를 발급해 사용자가 직접 보관하도록 한다. 코드 입력 시 디바이스 ID 재매핑이 가능하도록 한다. MVP 포함 여부는 추천안에서 결정.
- **악용 방지**: 디바이스 ID는 위조 가능하다는 전제로:
  - 리소스 enumeration 방어(어항 ID는 UUID/ULID로 추측 불가능하게 발급).
  - 디바이스 ID 단위 + IP 단위 레이트 리밋.
  - 이미지 업로드 크기/형식/빈도 한도.
  - 비용 폭주를 막기 위한 디바이스당 어항/물고기 개수 상한.

### 선택: Google / Apple OAuth 연동

- **목적**: 디바이스 분실/브라우저 초기화 시 어항을 복구하고, 한 사용자가 여러 기기에서 같은 어항을 이어 쓸 수 있게 한다. **회원가입을 강요하지 않으며**, 메인 흐름은 무인증으로 끝까지 진행 가능해야 한다.
- **지원 제공자**: Google과 Apple 두 가지만. 다른 제공자는 추가하지 않는다(Apple은 iOS 사용자 친화/필수 정책 대응 목적도 포함).
- **연결 모델**: 익명 디바이스 ID에 OAuth `account_id`를 **사후 연결(link-after)**한다. 즉,
  - 1) 사용자는 처음에 항상 익명으로 시작.
  - 2) 본인이 원할 때 "Google/Apple로 백업" 같은 진입점을 통해 OAuth 흐름을 거쳐 `account_id`를 디바이스에 결합.
  - 3) 이후 다른 기기에서 같은 OAuth 계정으로 로그인하면 `account_id` → 어항 매핑으로 데이터를 가져온다.
- **충돌 처리**: 다른 디바이스에 이미 데이터가 있는 OAuth 계정으로 로그인한 경우의 병합/덮어쓰기/포기 선택지를 명시. 자동 머지를 시도하지 말고 사용자에게 결정을 위임.
- **세션 형식**: OAuth 연결 후에도 모든 요청은 디바이스 ID를 계속 보낸다. 추가로 짧은 수명의 세션 토큰(JWT 또는 서명된 쿠키)을 발급해 `account_id` 컨텍스트를 함께 전달.
- **OAuth 라이브러리**: Vercel 환경에서 표준적인 선택지를 1순위/2순위로 추천(예: 1순위 Auth.js / NextAuth 호환 어댑터 또는 직접 구현, 2순위 Clerk/Supabase Auth). 무인증 흐름과 충돌하지 않는 통합 패턴을 명시.
- **PII 정책**:
  - 무인증 사용자: 이메일/이름 등 개인정보를 수집하지 않는다.
  - OAuth 연결 사용자: 제공자에서 받은 최소 식별자(`sub`/`account_id`)만 저장하고 이메일/프로필 이미지는 저장하지 않는다(또는 저장 시 사유와 보존 기간 명시).
  - 둘 다 GDPR/개인정보보호법 영향이 최소가 되도록 데이터 삭제(account-delete) API를 함께 설계.
- **OAuth가 꺼졌을 때**: 환경변수로 OAuth 제공자 키가 비어 있으면 UI에서 "백업" 버튼 자체가 노출되지 않아야 한다. 로컬 dev/Preview에서도 OAuth 없이 모든 핵심 기능이 동작해야 한다.

## 설계해야 할 결정 항목 (각각 추천안 + 트레이드오프 + 대안 1개씩 제시)

1. **백엔드 범위(scope) 정의**
   - 최소(MVP): 디바이스 ID 기반 어항 데이터 백업/복원.
   - 중간: 같은 디바이스 ID로 멀티 탭/브라우저 간 동기화, 복구 코드를 통한 디바이스 이전.
   - 확장: 같은 사용자의 OAuth 계정을 통한 멀티 디바이스 동기화.
   - 어느 단계부터 시작할지 추천하고 마이그레이션 경로 제시.
   - **명시적 제외**: 다른 사람과의 공유(공유 링크, 갤러리, 친구 어항 방문)는 본 스펙 범위에 포함하지 않는다.

2. **디바이스 ID 발급/저장**
   - 클라이언트 생성 vs 서버 발급.
   - `localStorage` 외 백업 위치(IndexedDB, 쿠키) 필요 여부.
   - 디바이스 ID 분실 시 사용자 흐름(복구 코드 / OAuth 백업 중 우선순위).

2-1. **OAuth(Google/Apple) 연동 — 선택 기능**
   - 라이브러리 선택(예: Auth.js, Lucia, 직접 구현 중 추천 1개와 대안 1개).
   - 콜백 URL/리다이렉트 처리: Vercel 환경별(`production`/`preview`/`development`) URL 분기 전략.
   - 시크릿 보관: `GOOGLE_CLIENT_ID/SECRET`, `APPLE_*` 환경변수 명세.
   - 디바이스 ID ↔ `account_id` 매핑 테이블 스키마.
   - 익명 → OAuth 연결 흐름의 화면/엔드포인트 단계.
   - 다른 기기에서 같은 OAuth로 로그인 시 데이터 병합/덮어쓰기/포기 UX 분기.
   - OAuth 연결 해제(unlink) 시 어항을 익명 상태로 되돌릴지/계정에 남길지.
   - 계정 삭제(account-delete) API와 데이터 보존/삭제 정책.
   - OAuth 미설정 환경(시크릿 없음)에서 UI/API가 어떻게 graceful하게 비활성화되는지.

3. **데이터 저장소 선택**
   - 어항/물고기 메타데이터: KV vs Postgres.
   - 이미지(sprite): Blob/오브젝트 스토리지 + CDN.
   - 청결도/이끼 등 빈번하게 변하는 상태의 쓰기 빈도와 비용 추정.

4. **API 표면**
   - REST vs RPC. 엔드포인트 목록(예: `GET /api/aquarium`, `PUT /api/aquarium`, `POST /api/fish`, `DELETE /api/fish/:id`, `POST /api/recovery-code`, `POST /api/auth/google`, `POST /api/auth/apple`, `POST /api/auth/link`, `POST /api/auth/unlink`, `DELETE /api/account`).
   - 요청/응답 스키마(JSON, zod 등으로 검증).
   - 멱등성(Idempotency-Key)과 낙관적 동시성(`updatedAt`/ETag) 처리.
   - 모든 엔드포인트에서 디바이스 ID 헤더 + (선택) 세션 토큰을 어떻게 검증/추출할지. 익명/연결-사용자 두 컨텍스트가 같은 라우트에서 어떻게 분기되는지.

5. **클라이언트 ↔ 서버 동기화 모델**
   - 단순 pull/push, last-write-wins, CRDT 중 선택.
   - 오프라인 우선 유지(`localStorage`를 캐시로 둠) → 온라인 복귀 시 reconcile 전략.
   - 현재 `features/aquarium/storage.js`의 단일 책임 경계를 유지하면서 백엔드 어댑터를 어떻게 끼워 넣을지(예: `storage.local.js` + `storage.remote.js` + `storage/index.js` 라우터).

6. **시간 모델 정합성**
   - 이끼 레벨은 `lastCleanedAt` 기반. 서버 시간을 신뢰원으로 둘지, 클라이언트 시간을 유지할지.
   - 시계 왜곡(clock skew) 보정 정책.

7. **이미지 업로드 파이프라인**
   - 클라이언트 → Vercel Blob 직접 업로드(서명 URL) vs 함수 경유.
   - 크기/형식 제한(현재 240×160 리사이즈 관행과의 정합), MIME 검증, 악성 파일 차단.
   - 비공개 vs 공개 URL, 캐시 정책.
   - 무인증 환경에서 서명 URL 발급을 어떻게 제한할지(디바이스 ID 단위 토큰화).

8. **레이트 리밋/남용 방지**
   - 디바이스 ID + IP 조합 기준 한도.
   - 디바이스당 어항 1개, 물고기 N개 상한.
   - 이미지 업로드 사이즈/빈도 한도와 419/429 응답 정책.

9. **관측(Observability)**
   - 로깅(Vercel Logs/Axiom), 에러 추적(Sentry), 핵심 지표(저장 실패율, 동기화 충돌율, 익명 디바이스당 활동량 분포).

10. **God Mode와 환경 분리**
    - dev 전용 엔드포인트가 프로덕션에 노출되지 않도록 하는 방법(환경변수 게이트, route exclusion, `process.env.VERCEL_ENV === 'production'`에서 404 반환 등).

11. **마이그레이션 계획**
    - 기존 사용자 `localStorage` 데이터를 첫 온라인 접근 시 서버로 옮기는 1회성 마이그레이션.
    - 마이그레이션 시 신규 디바이스 ID 발급 + 어항 ID 매핑.
    - 롤백 가능성(서버 장애 시 `localStorage`-only로 복귀).

12. **테스트 전략**
    - 함수 단위(vitest)에서 서버 어댑터를 모킹할 수 있는 인터페이스 모양.
    - 통합 테스트의 위치와 실행 방법(별도 환경 필요 여부).
    - 디바이스 ID 위조/충돌 시나리오 테스트.

13. **비용 모델**
    - 가정: MAU 1,000, 디바이스당 어항 1개, 평균 sprite 10개(개당 50KB), 분당 1회 저장 동기화.
    - Vercel Functions/Blob/KV 또는 Postgres 월 비용 추정.
    - 비용 폭주를 막을 hard cap(디바이스당 스토리지/요청 한도).

## 산출물 형식

다음 두 문서를 작성한다. 마크다운, 한국어, 기존 `docs/spec/_template.md`와 `ARCHITECTURE.md`의 톤/구조를 따른다.

1. **`docs/spec/S-XXX-backend-foundation.md`** — 위 결정 항목 각각에 대해:
   - 추천안(한 줄 결론)
   - 근거 2~4문장
   - 대안 1개와 트레이드오프
   - 검증 기준(어떻게 동작하면 "완료"인지)
   - 의존하는 다른 결정 항목과 외부 의존성

2. **`ARCHITECTURE.md`에 추가될 섹션 초안**:
   - `src/services/`(API 클라이언트), `api/`(Vercel 함수 디렉터리), `src/features/aquarium/storage/`(local + remote 어댑터), `src/features/auth/`(선택 OAuth UI/상태) 등 디렉터리 경계 제안.
   - 기존 "영속화는 `features/aquarium/storage.js` 한 곳에서만 일어난다" 원칙을 어떻게 보존/일반화할지.
   - 디바이스 ID 라이프사이클을 어느 모듈이 책임질지(예: `src/lib/deviceId.js`).
   - OAuth가 비활성화된 환경에서 `features/auth/`가 트리에서 자연스럽게 빠지거나 no-op이 되는 방식.

## 제약과 원칙

- 모든 결정은 **MVP에 필요한 최소**를 우선으로 하고, 불필요한 추상화/미래 가정을 도입하지 않는다.
- 백엔드는 **개인 사용자의 데이터 백업/멀티 디바이스 동기화** 용도로만 설계한다. 다른 사용자와의 공유/공개 갤러리/친구 어항 방문 같은 소셜 기능은 본 설계 범위 밖이며, 데이터 모델/엔드포인트에 그 가능성을 미리 반영하지 않는다.
- 현재 코드에 없는 라이브러리를 추가할 때는 도입 이유를 1문장으로 명시한다.
- 벤더 락인이 발생하는 선택(예: Vercel KV)은 락인 정도와 탈출 비용을 명시한다.
- 보안에 민감한 경로(이미지 업로드, 디바이스 ID 처리, 시크릿)는 위협 모델을 1~2줄로 함께 적는다.
- 인증이 없다는 점은 단순함의 이득이 아니라 **데이터 분실/위조 위험**의 원인이라는 사실을 설계에 반영한다.
- OAuth는 **선택 기능**이다. 무인증 흐름이 OAuth에 의존하지 않아야 하며, OAuth 미설정 환경에서도 모든 핵심 기능이 동작해야 한다.
- 구현 단위가 너무 크면 `S-XXX-backend-foundation`을 다시 작은 스펙 조각으로 쪼개는 방안을 제시한다(예: S-XXXa 디바이스 ID + 저장소, S-XXXb 이미지 파이프라인, S-XXXc 복구 코드, S-XXXd Google/Apple OAuth 연동).
- 코드는 작성하지 않는다. 디렉터리 경계와 인터페이스(함수 시그니처 수준)만 제안한다.

## 출력 전 자가 점검

답변 직전 다음을 점검하고, 미흡한 항목이 있으면 다시 작성한다.

- [ ] 13개 결정 항목 + OAuth(2-1) 모두 추천/근거/대안/검증을 갖추었는가
- [ ] 무인증 전제에서 위조/남용/데이터 분실 시나리오를 각각 다뤘는가
- [ ] OAuth가 비활성화된 환경에서도 모든 핵심 기능이 동작하도록 분리됐는가
- [ ] 익명 → OAuth 연결 시 데이터 충돌(병합/덮어쓰기/포기) UX 분기를 명시했는가
- [ ] 기존 `localStorage` 단일 진입점 원칙을 무너뜨리지 않는 어댑터 경로를 제시했는가
- [ ] Vercel의 함수 제약(실행 시간, 페이로드, cold start)을 명시적으로 고려했는가
- [ ] God Mode가 프로덕션에 노출되지 않을 방법이 명확한가
- [ ] 비용 추정에 구체 시나리오(MAU 1k, sprite 10개/어항 등)와 hard cap이 포함됐는가
