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
- 충돌(412) 발생 시 **어린이 영역은 자동 안전 보존 모드**로 진입하고, **부모 영역에만** 머지/덮어쓰기/포기 결정 카드를 표시한다(부모 스펙 매핑 표 상속).
- `BACKEND_ENABLED` 플래그로 클라이언트가 서버를 호출할지 결정. **기본값 false**(첫 배포 시 localStorage-only 동작 유지).
- **페르소나 합치(부모 스펙 매핑 표 상속)**: 어린이 영역에는 텍스트/blocking 모달/sync indicator/충돌 결정 UI를 절대 노출하지 않고, 부모 영역에만 노출한다. 자동 sync는 S-023 온보딩 종료 + S-021 마법 모먼트 큐가 비어있을 때만 트리거한다.

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
  - 부모 영역 conflict 카드:
    - `src/features/aquarium/storage/conflict-card.js`. **부모 영역에만 마운트**된다. 옵션 2개: `overwrite`(서버를 클라이언트 본으로 덮어쓰기), `abandon`(서버 본을 받아 클라이언트 덮어쓰기). `merge`는 S-025d 활성화 전까지 **렌더링하지 않는다**(비활성 버튼 제거).
    - 카드는 어항 두 본의 시각 미리보기(작은 어항 일러스트 + 물고기 수)와 큰 결정 버튼(최소 48×48 hit, 부모 태블릿 환경 가정)을 갖는다. timestamp/etag는 사용자에게 노출하지 않는다.
    - 어린이 영역은 412 발생 시 **자동 안전 보존 모드**(클라이언트는 로컬 본으로 계속 동작, 서버 본은 그대로 보존)로만 진입한다. 어떤 다이얼로그도 띄우지 않는다.
  - 어린이 영역 sprite fallback:
    - `GET /api/aquarium` 응답의 sprite Blob URL 로딩이 200ms 이상 지연/실패하면 해당 fish 위치에 회색 실루엣 + S-011 거품 placeholder 1회 burst를 표시. 로드 성공 후 자연스럽게 교체.
  - 마이그레이션 + 부모 안내:
    - 부팅 시 `BACKEND_ENABLED && deviceId 존재 && server 빈 상태`면 현재 localStorage 어항을 1회 PUT.
    - **첫 PUT 직후** 부모 영역에 1회 안내 배지("이 태블릿의 어항을 우리 서버로 보냅니다")를 띄운다. `localStorage('my-fishbowl:parentNoticeSeen')` 플래그로 1회만.
    - sprite는 dataURL 그대로 페이로드에 포함되며, 페이로드 > 90KB이면 PUT을 건너뛰고 **부모 영역 sync indicator만** 단조 색 변화로 알린다(어린이 영역에는 어떤 경고도 표시하지 않는다). 어린이가 인지하지 못하는 “조용한 실패”를 피하기 위해 S-025b를 가능한 빨리 후속한다.
  - 자동 sync 게이트:
    - 자동 GET/PUT은 다음 조건을 모두 만족할 때만 트리거된다.
      - `appState.onboarding?.completed === true` (S-023 종료).
      - `appState.magicMoment.queue.length === 0 && phase === 'idle' | 'done'` (S-021 큐 비어있음).
    - 위 조건이 깨지면 동기화 시도를 보류하고, 조건 충족 시 1회 catch-up 시도.
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

> 어린이/부모 영역 두 갈래로 기술한다(부모 스펙 매핑 표 상속).

### 어린이 흐름

1. 어린이가 앱을 처음 연다 → 클라이언트가 `getOrCreateDeviceId()`로 UUID v4를 무음 발급/저장. 화면 변화 없음.
2. `VITE_BACKEND_ENABLED=false`(기본)에서는 어떤 네트워크 호출도 없다. 현재 동작과 동일.
3. `VITE_BACKEND_ENABLED=true`에서:
   - 부팅 → 로컬 어항 즉시 렌더(기존과 동일).
   - **온보딩 미완료 또는 마법 모먼트 진행 중**이면 자동 sync는 보류된다.
   - 조건 충족 후 백그라운드 `GET /api/aquarium`. 응답에 따른 처리는 어린이 영역에 어떤 modal/배지도 띄우지 않고 조용히 처리된다.
4. 어항 편집 → 로컬 즉시 저장 + 60s debounce PUT(어린이는 인지 안 함). PUT 실패/충돌/페이로드 초과 어떤 경우에도 어린이 영역은 무변화이며 어린이는 자기 어항을 계속 만질 수 있다.
5. 다른 기기에서 복원 시 sprite 로딩 지연/실패 → 회색 실루엣 + 거품 placeholder. 로드되면 자연스럽게 교체.

### 부모 흐름

1. 부모는 부모 영역(별도 게이트 뒤)에 진입한다.
2. 첫 PUT(마이그레이션) 직후 한 번 안내 배지가 보인다(“이 태블릿의 어항을 우리 서버로 보냅니다”).
3. sync indicator(4상태)는 부모 영역에서만 보인다. 색은 단조 변화, 깜빡임 없음.
4. 충돌(412)이 발생하면 부모 영역에 충돌 카드가 표시된다. 카드는 어항 두 본의 시각 미리보기 + `overwrite` / `abandon` 두 버튼(`merge`는 S-025d 활성화 전까지 렌더링되지 않음).
   - `overwrite`: 서버를 내 본으로 덮어쓰기(서버 본의 etag로 `If-Match` 갱신 후 재PUT).
   - `abandon`: 서버 본을 받아 로컬 덮어쓰기.
5. 90KB 초과로 PUT이 스킵되면 부모 영역 sync indicator만 단조 색 변화로 표시된다. 어린이 영역은 무변화.

## UI/상태 요구사항

- 어린이 영역:
  - 백업/충돌/오류/sync indicator/계정 관련 UI를 **노출하지 않는다**.
  - sprite GET 실패/지연 시 회색 실루엣 + S-011 거품 placeholder 1회 burst만 표시.
  - 부모 영역 진입 버튼은 본 스펙 범위 밖(별도 스펙). 본 스펙은 “부모 영역이 존재한다”만 전제.
- 부모 영역:
  - sync indicator(작은 점 1개): 색 `disabled / synced / pending / error|conflict`. **단조 색 변화만**, 점멸 금지. 위치는 부모 영역 내부, action cluster 등 어린이 자주 누르는 영역에 두지 않는다.
  - 충돌 카드: 시각 미리보기 카드 2장(이 태블릿/다른 기기) + 큰 버튼 2개(`overwrite`, `abandon`). 버튼 최소 48×48 hit. `merge`는 미렌더.
  - 첫 PUT 안내 배지 1회.
  - 90KB 초과/계정 한도 초과 등 상태 메시지(텍스트 허용, 부모 가독성 기준).
- 필요한 상태(클라이언트 메모리):
  - `appState.sync = { status: 'disabled'|'idle'|'syncing'|'pending'|'error'|'conflict', lastSyncedAt?: ISO8601, lastError?: { code, message } }`.
  - `appState.conflict = { serverAquarium, localAquarium, sourceEtag } | null` — **부모 영역 카드만 참조**.
  - `appState.deviceId: string`.
  - `appState.parentNoticeSeen: boolean` (localStorage 캐시).
- 모션/접근성:
  - 어린이 영역에 노출되는 모든 fallback(거품 placeholder 등)은 `prefers-reduced-motion` 시 단순 정적 실루엣으로 대체.
  - 부모 영역 색 변화는 단조 transition만 사용, 3Hz 이상 변화 금지.
- 오류/빈 상태:
  - 네트워크 실패: 부모 영역 sync indicator만 `error`. 자동 60s backoff. 어린이 영역 무변화.
  - 디바이스 ID UUID 형식 오류(수동 조작): 새 ID 발급 + 경고 로그. UI 변화 없음.
  - 412 반복: 5회 연속 시 자동 재시도 중단 + 부모 영역 충돌 카드 노출. 어린이 영역 무변화.

## 구현 메모

- 외부 import 표면 보존:
  - 다른 feature(예: `fish-actions.js`, `cleaning/index.js`)는 여전히 `import { loadAquarium, saveAquarium } from '../aquarium/storage'`만 사용한다. 디렉터리 진입점 `storage/index.js`가 같은 export를 제공하므로 호출부 변경 없음.
  - `loadAquarium`은 `sync` 모듈의 `loadAquariumThroughSync()`로 위임. `saveAquarium`은 `saveAquariumThroughSync()`로 위임. 두 함수는 `BACKEND_ENABLED=false`이면 `local.js`만 호출한다.
- 디렉터리 구조(추가/이동):
  - 신규: `src/lib/deviceId.js`, `src/services/api.js`.
  - 신규 디렉터리: `src/features/aquarium/storage/`(`index.js`, `local.js`, `remote.js`, `sync.js`, `conflict-card.js`, `sprite-fallback.js`).
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
- 어린이 영역 어른 UI 침입: 충돌/오류/계정 다이얼로그가 어린이 영역에 노출되면 워크플로 중단/정서 손상. **완화**: 본 스펙 UI 요구사항이 어린이 영역 노출을 명시적으로 금지하고, 자동 안전 보존 모드로만 동작.
- 자동 sync와 온보딩/마법 모먼트 충돌: 첫 PUT 시점이 잘못되면 마법 모먼트 정서 곡선이 깨질 수 있음. **완화**: 자동 sync 게이트(온보딩 완료 + 큐 비어있음).
- sprite 분리(S-025b) 전 “조용한 백업 실패”: 90KB 임계 초과 시 어린이는 인지 못 함. **완화**: 부모 영역 sync indicator + 첫 PUT 안내 배지 + S-025b 후속 우선순위.

## 검증 기준

- [ ] `VITE_BACKEND_ENABLED=false`(기본) 상태에서 어떤 네트워크 호출도 일어나지 않고 모든 기존 기능이 회귀 없이 동작한다.
- [ ] `VITE_BACKEND_ENABLED=true` + KV 환경변수 설정 상태에서 부팅 시 한 번 `GET /api/aquarium`이 호출되고, 빈 서버 상태이면 자동 1회 PUT으로 마이그레이션된다(90KB 미만 페이로드 기준).
- [ ] 자동 GET/PUT은 **S-023 온보딩 완료 + S-021 마법 모먼트 큐가 비어있을 때만** 트리거된다. 온보딩/마법 모먼트 진행 중에는 보류된다.
- [ ] 같은 디바이스 ID로 다른 브라우저에서 부팅하면 서버 본이 복원된다.
- [ ] 두 기기에서 같은 디바이스 ID로 동시 PUT을 시도하면 두 번째 PUT이 412를 받고 **어린이 영역은 무변화**, **부모 영역 충돌 카드**가 표시된다. 클라이언트는 자동 안전 보존 모드로 진입한다.
- [ ] 부모 영역 충돌 카드에서 `overwrite`/`abandon` 선택이 의도대로 동작한다. `merge` 버튼은 **렌더링되지 않는다**.
- [ ] 충돌 카드의 두 본 비교는 시각 미리보기(어항 일러스트 + 물고기 수)로 표시되고, timestamp/etag는 사용자에게 노출되지 않는다.
- [ ] 부모 영역 결정 버튼은 최소 48×48 hit를 만족한다.
- [ ] 페이로드가 90KB를 초과하면 PUT이 스킵되고 **부모 영역 sync indicator만** 단조 색 변화로 알리며, **어린이 영역에는 어떤 경고도 표시되지 않는다**.
- [ ] sprite GET 실패/200ms 이상 지연 시 어린이 영역에 회색 실루엣 + S-011 거품 placeholder가 1회 burst로 표시되고, 로드 성공 시 자연스럽게 교체된다.
- [ ] 첫 PUT 성공 직후 부모 영역에 1회 안내 배지가 노출되며 `parentNoticeSeen` 플래그가 저장된다. 이후 부팅에는 재표시되지 않는다.
- [ ] 어린이 영역에는 본 스펙으로 인해 추가되는 텍스트/sync indicator/충돌·오류 modal이 **하나도 노출되지 않는다**.
- [ ] 모든 시각 색 변화는 단조이고, `prefers-reduced-motion` 활성 시 거품 fallback은 정적 실루엣으로 대체된다.
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
| `src/features/aquarium/storage/conflict-card.js` | add | 부모 영역 충돌 카드(시각 미리보기 + overwrite/abandon, merge 미렌더). |
| `src/features/aquarium/storage/sprite-fallback.js` | add | sprite GET 지연/실패 시 회색 실루엣 + 거품 placeholder. |
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
- 마이그레이션 PUT을 자동(부팅 시)으로 둘지, 부모 클릭 트리거로 둘지. → 본 스펙은 **자동 1회 PUT** + 부모 영역 1회 안내 배지를 권장. OAuth 연결(S-025d)부터는 명시 동의로 전환.
- 90KB 임계를 그대로 둘지, S-025a에서 sprite 일부만 빼고 메타만 push하는 mode를 둘지. → S-025b가 곧바로 sprite 분리를 끝낸다는 전제 하에 단순 스킵 + 부모 영역 indicator만. S-025b 일정이 미뤄지면 “80×80 미리보기 1장만 push해 회색 실루엣 대신 흐릿한 어항을 보여주는 fallback mode”를 검토.
- 부모 영역 진입 게이트(긴 탭 / PIN 등)는 본 스펙에서 결정하지 않는다. 별도 스펙(예: `S-026-parent-area`)으로 분리하고, 본 스펙은 “부모 영역이 존재한다”만 전제.
- 같은 태블릿/브라우저에서 형제 두 명이 별도 어항을 갖는 시나리오는 본 스펙 범위 밖이다. “디바이스 내 어항 프로필” 분리는 미래 스펙(예: `S-025f`).

## Next Step

1. 본 스펙을 사람이 검토해 `ready`로 전환한다.
2. `ready` 후 구현은 다음 순서로 PR을 쪼개는 것을 권장한다(검증 단계 분리).
   1. `src/lib/deviceId.js` + tests, `src/services/api.js`(서버 미배포 상태에서도 추가 가능).
   2. `storage/` 디렉터리화 + 기존 동작 보존(local-only). `BACKEND_ENABLED=false` 기본.
   3. `api/aquarium.js` + KV wiring + zod. Vercel preview에서 직접 호출 검증.
   4. `sync.js` reconcile + conflict 다이얼로그.
   5. 마이그레이션 자동 PUT + sync indicator UI.
3. 본 스펙 done 시점에 `ARCHITECTURE.md`에 디렉터리/책임 절을 통합하고, 부모 S-025의 완료 기록에 한 줄 추가.
