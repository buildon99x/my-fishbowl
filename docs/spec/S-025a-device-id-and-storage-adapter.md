# S-025a 디바이스 ID + 서버 저장소 어댑터 (MVP)

## 상태

- 상태: draft
- 구현 여부: not-started
- 검증 여부: not-tested

## 부모 스펙

- `docs/spec/S-025-backend-foundation.md` (ready)

본 스펙은 S-025의 첫 구현 조각이다. S-025의 결정 항목 1, 2, 3, 4, 5, 11, 12, 13 중 **MVP 최소 단위**만 실제 코드로 옮기고, OAuth(S-025d) / 이미지 파이프라인(S-025b) / 복구 코드(S-025c) / 관측 강화(S-025e)는 제외한다.

## 목표

- 클라이언트가 익명 디바이스 ID를 발급/보관하고, 모든 서버 호출에 `X-Device-Id` 헤더로 동봉한다.
- `features/aquarium/storage.js`를 `storage/` 디렉터리로 일반화해 **외부 모듈의 import 표면을 바꾸지 않은 채** local + remote + sync 어댑터를 도입한다.
- Vercel Functions(`api/aquarium.js`)와 Vercel KV로 `GET /api/aquarium` / `PUT /api/aquarium`을 구현한다.
- ownership 모델은 처음부터 `aquarium:<aquariumId>` + `owner:<aquariumId>` + `device:<deviceId>` 분리 방식으로 도입(부모 스펙 결정 3 반영).
- 충돌 발생(412) 시 **머지/덮어쓰기/포기** 3선택 다이얼로그 1차 버전을 제공한다.
- `BACKEND_ENABLED` 플래그로 클라이언트가 서버를 호출할지 결정. **기본값 false**(첫 배포 시 localStorage-only 동작 유지).

## 범위

- 포함:
  - `src/lib/deviceId.js`: `getOrCreateDeviceId()`, `rotateDeviceId(newId)`, `clearDeviceId()`. localStorage 키 `my-fishbowl:deviceId`.
  - `src/services/api.js`: `apiFetch(path, init)` 단일 진입점. `X-Device-Id` 자동 동봉, JSON 직렬화/역직렬화, 표준 에러 변환(`ApiError { status, code, message, body? }`).
  - `src/features/aquarium/storage/` 디렉터리화:
    - `index.js`: public API. 기존 `loadAquarium`, `saveAquarium` export 시그니처 유지.
    - `local.js`: 현재 `storage.js` 내용 이전. localStorage I/O만.
    - `remote.js`: `fetchAquarium()`, `putAquarium(aquarium, etag)`. HTTP는 `services/api.js`만 통해 호출.
    - `sync.js`: `loadAquarium`/`saveAquarium`의 실제 구현. write-through(`local` 즉시 + `remote` debounce) + 부팅 시 reconcile.
    - `storage.js`는 제거(또는 한 줄 re-export로 1리리스 유지 후 다음 PR에서 제거 — 본 스펙에서는 **즉시 제거** 권장).
  - `api/aquarium.js` (Vercel Function):
    - `GET /api/aquarium` → owner 검증 후 어항 JSON + `ETag: "<updatedAt>"`. owner 없는 신규 디바이스 → 204 또는 빈 객체.
    - `PUT /api/aquarium` → `If-Match` 필수, 불일치 시 412 + 서버 본문 반환. 성공 시 새 `ETag` 반환.
  - `api/_lib/`:
    - `kv.js`: `@vercel/kv` 또는 `@upstash/redis` wrapper.
    - `context.js`: `getRequestContext(req)` — `X-Device-Id` 추출/검증(UUID v4 정규식).
    - `schema.js`: zod로 `aquarium` 본문 검증(부모 스펙 4번 참조). 최상위 필드와 `fishes` 배열 크기만 1차 검증.
    - `envGuard.js`: production 가드(향후 `/api/dev/*`에서 재사용, 본 스펙은 dev 라우트 없음).
  - 환경변수: `KV_REST_API_URL`, `KV_REST_API_TOKEN`(Vercel KV 자동 주입), 클라이언트용 `VITE_BACKEND_ENABLED=false`(기본).
  - 클라이언트 conflict 다이얼로그:
    - `src/features/aquarium/storage/conflict-dialog.js` (또는 패널 안의 모달). 옵션 3개: `merge`(미지원 → S-025d로 미루고 이번엔 disabled), `overwrite`(서버를 클라이언트 본으로 덮어쓰기), `abandon`(서버 본을 받아 클라이언트 덮어쓰기).
  - 마이그레이션:
    - 부팅 시 `BACKEND_ENABLED && deviceId 존재 && server 빈 상태`면 현재 localStorage 어항을 1회 PUT.
    - sprite는 dataURL 그대로 페이로드에 포함되며, 페이로드 > 90KB이면 PUT을 건너뛰고 `sync indicator`에 "이미지 분리 필요(S-025b)" 경고 표시.
  - 테스트:
    - `src/lib/deviceId.test.js`: 발급/유지/회전.
    - `src/features/aquarium/storage/local.test.js`: 기존 storage 테스트 이전.
    - `src/features/aquarium/storage/sync.test.js`: reconcile 분기 4종(local-only, server-newer, conflict 412, network-failure)을 mocked `remote.js`로 검증.
    - `api/aquarium.test.js`: Vercel 환경 모킹으로 GET/PUT 4xx/412/200 케이스. `vercel dev` 또는 in-memory KV fake.

- 제외(다른 하위 스펙으로 분리):
  - 이미지 → Blob 분리(S-025b). 본 스펙은 dataURL을 그대로 KV 페이로드에 포함하지만, 90KB 임계로 graceful degradation.
  - 복구 코드(S-025c).
  - OAuth / 계정 / `merge` 옵션 실제 동작 / `account-delete`(S-025d).
  - rate-limit, Sentry, 비용 알람(S-025e).
  - God Mode 서버 측 라우트(별도). 클라이언트 측 God Mode는 그대로 유지.

## 사용자 흐름

1. 사용자가 앱을 처음 연다 → 클라이언트가 `getOrCreateDeviceId()`로 UUID v4를 발급해 `localStorage`에 저장. 화면 변화 없음.
2. `VITE_BACKEND_ENABLED=false` 상태(기본)에서는 어떤 네트워크 호출도 일어나지 않는다. 현재 동작과 정확히 동일.
3. `VITE_BACKEND_ENABLED=true` 환경에서:
   - 부팅 → 로컬 어항 즉시 렌더(기존과 동일) → 백그라운드 `GET /api/aquarium`.
   - 서버 응답 없음(204) → 로컬 본을 1회 PUT(마이그레이션). 페이로드 > 90KB이면 sync indicator에 경고만 띄우고 PUT 보류.
   - 서버 응답 있음 + `updatedAt` 동일 → 무동작.
   - 서버 응답 있음 + `updatedAt` 다름 → conflict 다이얼로그 표시.
4. 사용자가 어항을 편집 → 로컬 즉시 저장 + 60s debounce PUT. PUT이 412를 반환하면 conflict 다이얼로그 표시.
5. conflict 다이얼로그:
   - `overwrite`: 서버를 내 본으로 덮어쓰기(`If-Match`를 서버 본의 etag로 갱신해 재PUT).
   - `abandon`: 서버 본을 받아 로컬 덮어쓰기.
   - `merge`: 비활성(S-025d에서 활성). 툴팁: "추후 OAuth 연결 시 사용 가능".

## UI/상태 요구사항

- 필요한 화면 요소:
  - sync indicator(아주 작음): action cluster 또는 상태 패널 한쪽에 점 1개. 색: 회색(disabled) / 녹색(synced) / 노랑(pending/retrying) / 빨강(error/conflict).
  - conflict 다이얼로그(미니멀): 제목 + 3 버튼(`overwrite`, `abandon`, `merge[disabled]`) + 두 본의 `updatedAt`/`fishes.length` 미리보기.
- 필요한 상태(클라이언트 메모리):
  - `appState.sync = { status: 'idle'|'syncing'|'conflict'|'error'|'disabled', lastSyncedAt?: ISO8601, lastError?: { code, message } }`.
  - `appState.conflict = { serverAquarium, localAquarium } | null`.
  - `appState.deviceId: string` (메모리 캐시, 진실은 localStorage).
- 오류/빈 상태:
  - 네트워크 실패: sync 상태만 `error`로, UX는 중단되지 않는다. 60s 후 자동 재시도.
  - 디바이스 ID UUID 형식 오류(수동 조작): 새 ID 발급 + warning 로그.
  - 412 반복: 5회 연속 시 자동 재시도 중단, 사용자에게 conflict 다이얼로그.

## 구현 메모

- 외부 import 표면 보존:
  - 다른 feature(예: `fish-actions.js`, `cleaning/index.js`)는 여전히 `import { loadAquarium, saveAquarium } from '../aquarium/storage'`만 사용한다. 디렉터리 진입점 `storage/index.js`가 같은 export를 제공하므로 호출부 변경 없음.
  - `loadAquarium`은 `sync` 모듈의 `loadAquariumThroughSync()`로 위임. `saveAquarium`은 `saveAquariumThroughSync()`로 위임. 두 함수는 `BACKEND_ENABLED=false`이면 `local.js`만 호출한다.
- 디렉터리 구조(추가/이동):
  - 신규: `src/lib/deviceId.js`, `src/services/api.js`.
  - 신규 디렉터리: `src/features/aquarium/storage/`(`index.js`, `local.js`, `remote.js`, `sync.js`, `conflict-dialog.js`).
  - 신규: `api/aquarium.js`, `api/_lib/{kv,context,schema,envGuard}.js`.
  - 삭제: `src/features/aquarium/storage.js`(내용은 `storage/local.js`로 이전).
- 키/페이로드:
  - KV: `aquarium:<aquariumId>` → `{ aquarium, updatedAt }`. `owner:<aquariumId>` → `{ deviceId }`. `device:<deviceId>` → `{ aquariumId, createdAt, lastSeenAt }`.
  - 부팅 시 디바이스에 매핑된 `aquariumId`가 서버에 없으면 PUT 시 owner와 device 키를 함께 생성.
  - 충돌 정책: `aquariumId`는 클라이언트의 `aquarium.id`(이미 `createAquarium`에서 UUID로 발급). 첫 PUT에서 owner를 등록. 같은 디바이스의 후속 GET/PUT은 `device:<deviceId>.aquariumId`로 라우팅.
- ETag: `aquarium.updatedAt`(ISO8601 문자열)을 그대로 ETag로 사용. 클라이언트는 마지막 본의 `updatedAt`을 `If-Match`로 보낸다.
- 시계: 본 스펙은 서버 stamp만 도입(부모 스펙 6번 일부). `PUT` 응답이 새 `updatedAt`을 stamp해 반환하고, 클라이언트는 그 값을 자기 본에 즉시 반영. clock-skew 경고 UI는 S-025e로 미룬다.
- 환경변수:
  - 서버: Vercel KV 통합 시 자동 주입되는 `KV_REST_API_URL`, `KV_REST_API_TOKEN`. 미설정 시 라우트가 503을 반환하고 에러 로그.
  - 클라이언트: `VITE_BACKEND_ENABLED`(`'true'`만 활성으로 인정). `VITE_API_BASE_URL`(선택, 기본 `''` = same-origin).
- 기본 PUT 정책:
  - debounce 60s, 변경 없을 때(=`aquarium`이 직전 push 본과 깊은 비교 시 동일)는 스킵.
  - 페이로드 > 90KB → 스킵 + sync indicator 경고. (KV cap 100KB의 안전 마진 10KB.)
- 인증/컨텍스트:
  - 본 스펙은 `accountId`를 다루지 않는다. `getRequestContext`는 `{ deviceId }`만 반환.
- 의존성(외부 패키지):
  - 서버: `@vercel/kv`(또는 `@upstash/redis`), `zod`. 둘 다 신규 도입 사유는 "Vercel KV 표준 클라이언트와 입력 검증 표준 라이브러리".
  - 클라이언트: 신규 패키지 없음.
- `ARCHITECTURE.md` 갱신:
  - 본 스펙 done 시점에 부모 스펙의 "ARCHITECTURE.md 추가 섹션 초안"을 본문 트리에 통합.
  - "영속화는 `features/aquarium/storage.js` 한 곳에서만 일어난다" → "영속화 외부 I/O는 `features/aquarium/storage/`에서만 일어난다"로 일반화.
  - `src/lib/deviceId.js`, `src/services/api.js`, `api/` 디렉터리 항목 추가.

## 위협 모델

- 디바이스 ID 위조: 헤더로 임의 UUID를 보내면 서버는 그것을 owner로 신뢰한다. **악용 표면**: 다른 디바이스가 발급한 UUID를 추측해 데이터 접근. **완화**: UUID v4 추측 확률 무시 가능 + `owner:<aquariumId>` 별도 검증 + S-025e에서 IP+device 레이트 리밋.
- 페이로드 폭주: 90KB 가드 + KV cap 100KB. 서버 측에서 페이로드 크기 사전 검사 후 413 반환.
- 동기화 폭주: debounce 60s + dirty flag. 4xx/5xx 응답에 backoff 적용.
- localStorage 손상: JSON.parse 실패 시 `createAquarium()` 폴백(기존과 동일).
- KV 미설정 환경(시크릿 없음): 라우트가 503 반환 + 클라이언트는 disabled 상태로 fallback.

## 검증 기준

- [ ] `VITE_BACKEND_ENABLED=false`(기본) 상태에서 어떤 네트워크 호출도 일어나지 않고 모든 기존 기능이 회귀 없이 동작한다.
- [ ] `VITE_BACKEND_ENABLED=true` + KV 환경변수 설정 상태에서 부팅 시 한 번 `GET /api/aquarium`이 호출되고, 빈 서버 상태이면 자동 1회 PUT으로 마이그레이션된다(90KB 미만 페이로드 기준).
- [ ] 같은 디바이스 ID로 다른 브라우저에서 부팅하면 서버 본이 복원된다.
- [ ] 두 기기에서 같은 디바이스 ID로 동시 PUT을 시도하면 두 번째 PUT이 412를 받고 conflict 다이얼로그가 표시된다.
- [ ] conflict 다이얼로그에서 `overwrite`/`abandon` 선택이 의도대로 동작한다(`merge`는 disabled).
- [ ] 페이로드가 90KB를 초과하면 PUT이 스킵되고 sync indicator가 경고로 바뀌며 콘솔에 명시 로그가 남는다.
- [ ] 외부 모듈의 import 경로(`features/aquarium/storage`)가 변경 없이 그대로 동작한다.
- [ ] `npm test` 신규 + 기존 모두 통과, `npm run lint`(ESLint + knip) 통과, `npm run build` 통과, `npm run cleanup`(depcheck 포함) 통과.
- [ ] 브라우저 콘솔에 새 경고/오류가 발생하지 않는다(`VITE_BACKEND_ENABLED=false` 기준).

## Files To Add or Change

| Path | Action | Purpose |
| --- | --- | --- |
| `src/lib/deviceId.js` | add | 디바이스 ID 발급/조회/회전 단일 책임. |
| `src/lib/deviceId.test.js` | add | 발급/유지/회전 단위 테스트. |
| `src/services/api.js` | add | `apiFetch` + `ApiError`. 클라이언트 측 HTTP 단일 진입점. |
| `src/features/aquarium/storage.js` | delete | 내용을 `storage/local.js`로 이전. |
| `src/features/aquarium/storage/index.js` | add | public API(`loadAquarium`, `saveAquarium`). 외부 import 표면 유지. |
| `src/features/aquarium/storage/local.js` | add | 현재 `storage.js`의 localStorage I/O 이전. |
| `src/features/aquarium/storage/remote.js` | add | `fetchAquarium`/`putAquarium`. `services/api.js`만 사용. |
| `src/features/aquarium/storage/sync.js` | add | write-through + reconcile. backend disabled 시 local-only fallback. |
| `src/features/aquarium/storage/conflict-dialog.js` | add | 충돌 다이얼로그 1차(merge disabled). |
| `src/features/aquarium/storage/sync.test.js` | add | reconcile 분기 4종. |
| `api/aquarium.js` | add | GET/PUT 라우트. |
| `api/_lib/kv.js` | add | KV 클라이언트 wrapper. |
| `api/_lib/context.js` | add | `getRequestContext` (deviceId 추출/검증). |
| `api/_lib/schema.js` | add | zod 스키마. |
| `api/_lib/envGuard.js` | add | production 가드 helper(향후 dev 라우트 재사용). |
| `api/aquarium.test.js` | add | GET/PUT 핵심 케이스. |
| `package.json` | change | `@vercel/kv`(or `@upstash/redis`), `zod` 추가. |
| `vercel.json` | add | Functions 기본 런타임/리전 설정(필요 시). |
| `ARCHITECTURE.md` | change | 본 스펙 done 시점에 디렉터리 트리와 책임 절 갱신. |
| `SPEC.md` | change | S-025a row 추가(draft) + done 시 완료 기록. |
| `docs/spec/S-025a-device-id-and-storage-adapter.md` | add | 본 문서. |

## Open Questions

- `@vercel/kv`(공식)와 `@upstash/redis`(직접) 중 어느 쪽을 1순위로 도입할지. → `@vercel/kv`가 Vercel KV 통합과 가장 매끄럽지만 추상화가 얇은 편이라 둘 다 후보. 구현 첫 PR에서 1차 결정.
- 마이그레이션 PUT을 자동(부팅 시)으로 둘지, 사용자 클릭 트리거로 둘지. → 본 스펙은 **자동 1회 PUT**(`BACKEND_ENABLED=true` + 디바이스에 서버 본 없음 + 페이로드 < 90KB)을 권장. 사용자 동의가 필요한 시점은 OAuth 연결(S-025d).
- 90KB 임계를 그대로 둘지, S-025a에서 sprite 일부만 빼고 메타만 push하는 mode를 둘지. → S-025b가 곧바로 sprite 분리를 끝내므로 본 스펙은 단순 스킵 + 경고만으로 충분.
- conflict 다이얼로그에서 `merge` 비활성을 어떻게 사용자에게 설명할지. → 짧은 툴팁 + 도움말 링크 없이 출시. S-025d에서 활성화 시 문구만 교체.

## Next Step

1. 본 스펙을 사람이 검토해 `ready`로 전환한다.
2. `ready` 후 구현은 다음 순서로 PR을 쪼개는 것을 권장한다(검증 단계 분리).
   1. `src/lib/deviceId.js` + tests, `src/services/api.js`(서버 미배포 상태에서도 추가 가능).
   2. `storage/` 디렉터리화 + 기존 동작 보존(local-only). `BACKEND_ENABLED=false` 기본.
   3. `api/aquarium.js` + KV wiring + zod. Vercel preview에서 직접 호출 검증.
   4. `sync.js` reconcile + conflict 다이얼로그.
   5. 마이그레이션 자동 PUT + sync indicator UI.
3. 본 스펙 done 시점에 `ARCHITECTURE.md`에 디렉터리/책임 절을 통합하고, 부모 S-025의 완료 기록에 한 줄 추가.
