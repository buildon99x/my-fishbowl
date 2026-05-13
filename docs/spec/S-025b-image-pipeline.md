# S-025b 이미지 업로드 파이프라인 (Blob 분리)

## 상태

- 상태: ready
- 구현 여부: not-started
- 검증 여부: not-tested

## 부모 / 의존 스펙

- 부모: `docs/spec/S-025-backend-foundation.md` (ready) — 결정 항목 7(이미지 업로드 파이프라인), 결정 항목 3(저장소: Blob).
- 의존: `docs/spec/S-025a-device-id-and-storage-adapter.md` (draft). 본 스펙은 S-025a의 `storage/sync.js` + `services/api.js` 어댑터 위에 얹는다.
- 호스트: `docs/spec/S-026-parent-area-gate.md` (draft). 부모 영역 슬롯 `parent.sync` 안에 “이미지 저장 상태”를 표시한다.
- 정서 곡선: `docs/spec/S-021-magic-moment.md`, `docs/spec/S-011-aquarium-bubble-effects.md` — sprite GET 지연/실패 fallback이 이들 정서와 충돌하지 않아야 한다.

본 스펙은 S-025의 매핑 표를 상속한다. 어린이 영역에는 어떤 업로드/실패/한도 텍스트도 노출되지 않으며, 부모 영역에만 상태가 보인다.

## 목표

- sprite를 `aquarium` 페이로드의 dataURL에서 **Vercel Blob**으로 분리해 S-025a의 KV 페이로드 임계(90KB)를 영구적으로 해소한다.
- 클라이언트가 `/api/upload-url`로 받은 **서명된 단명 URL**로 Blob에 직접 PUT하고, 서버는 `/api/upload-commit`에서 **magic byte 재검증** 후 어항 문서에 URL을 반영한다.
- 마법 모먼트(S-021) 정서 곡선이 깨지지 않도록 업로드 실패/지연 시 **어린이 영역에는 회색 실루엣 + 거품 placeholder**(S-025a `sprite-fallback`) fallback만 노출한다.
- 기존 dataURL 어항은 1회 백그라운드 마이그레이션으로 Blob URL 어항으로 전환한다.

## 범위

- 포함:
  - 클라이언트 sprite 업로드 파이프라인:
    - `createImageBitmap` 디코딩 1차 검증 → `POST /api/upload-url` → 직접 Blob `PUT` → `POST /api/upload-commit`.
    - 어항 문서의 `fish.spriteUrl`(신규 필드) 보강. 기존 `fish.sprite`(dataURL)는 마이그레이션이 끝날 때까지 함께 보관.
    - 업로드 성공 후 `saveAquariumThroughSync` 한 번 실행으로 PUT 반영.
  - 서버 함수:
    - `api/upload-url.js` — 디바이스 owner 검사 + MIME/크기 사전 검사 + Blob에 서명 URL 발급 + `uploadId`(UUID) 기반 `Idempotency-Key`.
    - `api/upload-commit.js` — `uploadId`로 Blob 메타 조회 후 **첫 16바이트 magic byte 재검증** + 어항 문서 갱신. 불일치 시 Blob 즉시 삭제 + 400.
  - 어항 PUT의 sprite GC:
    - 어항 PUT 시 본문에 누락된 `spriteUrl`은 백그라운드 큐에 넣고 일정 시간 후 Blob에서 삭제(즉시 삭제 시 동시성 위험).
  - 마이그레이션:
    - 부팅 시 어항에 `sprite`(dataURL)는 있고 `spriteUrl`이 없는 fish가 있으면 백그라운드로 1마리씩 업로드해 `spriteUrl`을 채운다. 모두 끝나면 다음 PUT에서 `sprite` 필드 제거.
    - 마이그레이션은 자동 sync 게이트(S-025a: 온보딩 완료 + 마법 모먼트 큐 비어있음)를 동일하게 따른다.
  - 어린이 영역 fallback(S-025a `sprite-fallback` 재사용):
    - sprite GET 200ms 이상 지연/실패 시 회색 실루엣 + S-011 거품 placeholder 1회 burst. 로드 성공 시 자연스럽게 교체.
  - 부모 영역 상태 표시(슬롯 `parent.sync`):
    - “이미지 저장 중 N/M”, “저장 실패 N”, “저장 한도(50/50)” 같은 부모 가독성 메시지.
    - 한도 초과/저장 실패는 단조 색 변화로만 표시(점멸 없음).
  - 정책/한도(부모 스펙 결정 7/8 반영):
    - MIME 화이트리스트: `image/png`, `image/jpeg`, `image/webp` 만. **SVG 제외**.
    - 최대 크기 1MB. 디바이스당 10 uploads/min, 어항당 sprite 50개 상한.
    - Blob URL은 **public immutable** + `Cache-Control: public, max-age=31536000, immutable`.
  - 테스트:
    - 클라이언트: 업로드 파이프라인 분기(성공 / 디코딩 실패 / 크기 초과 / 빈도 초과 / commit 실패 / Blob 직접 PUT 실패).
    - 서버: `upload-url` zod 검증 / `upload-commit` magic byte 검증 / 한도 초과 응답.
    - 마이그레이션: dataURL → Blob 전환 후 어항 문서 정합.

- 제외:
  - OAuth 사용자 sprite의 별도 ownership(`account_id` 단위) — S-025d.
  - sprite의 클라이언트 측 리사이즈/압축 정책 — 현재 240×160 리사이즈 관행 그대로 사용. 추가 압축은 별도 스펙.
  - dataURL → Blob 마이그레이션 후 KV 페이로드 추가 슬림화(예: gzip) — 별도 스펙.
  - 결제 기반 한도 상향(50개 초과).
  - 어린이 영역 “업로드 진행 중” 시각 — 마법 모먼트가 정서적 진행 표현을 이미 담당하므로 별도 표시는 의도적으로 추가하지 않는다.

## 사용자 흐름

### 어린이 흐름

1. 어린이가 그림을 등록한다 → 마법 모먼트(S-021)가 즉시 재생된다(현재와 동일).
2. 마법 모먼트가 끝나는 시점에 클라이언트는 dataURL을 임시로 보관한 채 어항에 fish를 등록한다(렌더는 dataURL로 즉시 가능).
3. 자동 sync 게이트가 통과되는 순간 클라이언트가 백그라운드로 Blob에 업로드한다. 어린이는 어떤 진행/실패도 보지 않는다.
4. 업로드가 끝나면 어항 문서가 `spriteUrl`로 갱신되어 다음 PUT에 반영된다.
5. 다른 기기에서 어항을 받을 때 sprite GET이 200ms 이상 지연되면 회색 실루엣 + 거품 placeholder가 보이고, 로드되면 자연스럽게 교체된다(현재 사용 기기에서는 dataURL 캐시가 있어 거의 발생하지 않음).

### 부모 흐름

1. 부모는 부모 영역(S-026 게이트)에 진입한다.
2. `parent.sync` 슬롯에서 “이미지 저장 N/M”, “저장 실패 N”, “저장 한도 N/50” 같은 부모 가독성 상태가 보인다.
3. 한도(50/50)에 도달하면 본 슬롯에 안내가 노출되며, 어린이 영역의 추가 등록은 **여전히 허용**되지만 새 sprite는 Blob에 업로드되지 않고 dataURL인 채로 남는다(어린이 정서 우선).
   - 위 경우 부모가 어린이의 기존 sprite를 정리하면 새 등록부터 다시 업로드된다.
4. 부모는 본 스펙 범위에서는 직접적인 “삭제” 동작을 다루지 않는다(어항/물고기 삭제는 기존 어린이 영역 흐름 유지).

## UI/상태 요구사항

- 어린이 영역:
  - 업로드 진행/성공/실패 UI **없음**.
  - sprite GET 실패/지연 시 `sprite-fallback`(회색 실루엣 + 거품 burst). `prefers-reduced-motion` 시 거품 burst는 정적 실루엣으로 대체.
- 부모 영역 `parent.sync`:
  - “이미지 저장” 카드: 진행/성공/실패/한도 카운트.
  - 점멸 없음, 단조 색 변화만.
  - 한도 초과 안내는 단조 톤 + 짧은 본문 텍스트(부모 가독성).
- 필요한 상태:
  - 어항 문서 모델 보강:
    - `fish.spriteUrl?: string` — Blob 공개 immutable URL. 신규 우선 필드.
    - `fish.sprite?: string` — dataURL. 마이그레이션 중에만 함께 존재. 둘 다 있으면 `spriteUrl` 우선.
  - 클라이언트 메모리:
    - `appState.imagePipeline = { pending: number, failing: number, atCap: boolean, lastError?: { code, message } }`.
  - localStorage 추가 없음.
- 모션/접근성:
  - 어린이 영역 fallback의 거품 burst는 S-011 가드(채도 60% 이하, 3Hz 미만)를 따른다.

## 어린이/부모 영역 매핑(S-025 표 보강)

| 기능 | 어린이 영역 | 부모 영역 | 비고 |
| --- | --- | --- | --- |
| sprite 업로드 진행 | 노출 안 함 | `parent.sync` 카운트 | 마법 모먼트가 정서 표현 담당 |
| 업로드 실패 안내 | 노출 안 함 | `parent.sync` 카드 | 단조 색 변화 |
| 한도(50/50) 도달 안내 | 노출 안 함 | `parent.sync` 카드 | 어린이 등록은 계속 허용, sprite는 dataURL 유지 |
| sprite GET 지연/실패 fallback | 회색 실루엣 + 거품 burst | 표시 없음 | S-025a `sprite-fallback` 재사용 |
| MIME 거절/디코딩 실패 | 노출 안 함 | 표시 없음(실패 카운터에만 반영) | 어린이 등록 흐름은 dataURL로 정상 진행 |

## 구현 메모

- 외부 import 표면 보존:
  - `features/aquarium/storage` public API는 변경하지 않는다. 본 스펙의 업로드 파이프라인은 `storage/sync.js`의 후속 단계(post-save hook)에 끼워 넣는다.
- 디렉터리 구조(추가/이동):
  - 신규: `src/features/aquarium/storage/upload.js` — 업로드 파이프라인(클라이언트 분기 + 진행 카운트).
  - 신규: `src/features/aquarium/storage/migration-blob.js` — dataURL → Blob 1회 마이그레이션.
  - 신규: `api/upload-url.js`, `api/upload-commit.js`.
  - 신규: `api/_lib/blob.js`(Blob 클라이언트 wrapper), `api/_lib/magicBytes.js`(PNG/JPEG/WebP 시그니처).
  - 변경: `src/features/aquarium/model.js`(`fish.spriteUrl?` 필드 + 보정), `src/features/aquarium/storage/sync.js`(업로드 hook 호출), `src/features/aquarium/storage/sprite-fallback.js`(S-025a 정의 활용).
  - 변경: `ARCHITECTURE.md`(`features/aquarium/storage/` 트리 보강).
- 키/페이로드:
  - Blob 키: `sprite/<aquariumId>/<fishId>.<ext>` — 어항 단위 격리. 어항 PUT 시 누락된 키는 GC 큐에 등록.
  - `uploadId`(클라이언트 발급 UUID)는 `Idempotency-Key`로 사용해 동일 업로드 재시도 시 같은 URL 반환.
- 검증 다층(부모 스펙 결정 7 반영):
  - 클라이언트: `createImageBitmap` 디코딩 성공 + MIME/크기.
  - 서명 URL 발급 단계: 선언된 MIME/크기 + owner 검사.
  - 업로드 후 서버: Blob에서 **첫 16바이트 magic byte 재검증**. 불일치 시 즉시 삭제 + 400.
  - `image/svg+xml`은 화이트리스트에 포함하지 않는다(스크립트 임베드 표면).
- 마이그레이션 정책:
  - 어항 부팅 시 `fish.sprite && !fish.spriteUrl`인 항목을 백그라운드 큐에 적재(최대 동시 2건). 자동 sync 게이트를 통과한 후에만 시작.
  - 한 항목 업로드 성공 → 어항 문서의 해당 fish에서 `sprite` 제거 + `spriteUrl` 세팅 → 다음 debounce PUT에 반영.
  - 실패 시 다음 부팅에서 재시도. dataURL은 그대로 두어 어린이는 영향 없음.
- 자동 sync 게이트:
  - 본 스펙도 S-025a 게이트(`onboarding.completed === true` + 마법 모먼트 큐 비어있음)를 그대로 상속. 업로드/마이그레이션 모두 같은 조건.
- 환경변수:
  - Vercel Blob 통합 시 자동 주입되는 `BLOB_READ_WRITE_TOKEN`. 미설정 시 라우트가 503 + 클라이언트는 업로드 파이프라인 disabled로 fallback(dataURL 유지).
- 의존성(외부 패키지):
  - 서버: `@vercel/blob`. 도입 사유: Vercel Blob 표준 클라이언트.
  - 클라이언트: 신규 패키지 없음.

## 위협 모델

| 경로 | 위협 | 완화 |
| --- | --- | --- |
| 서명 URL 위조 | 다른 디바이스의 URL을 추측해 임의 PUT | 발급 시 owner 검사 + URL은 짧은 만료(예: 60s) + Blob 키에 `aquariumId/fishId` 포함. |
| MIME 우회 | 클라이언트 MIME만 보고 실행 가능 파일 업로드 | 서버 commit 단계 magic byte 재검증. SVG 화이트리스트 제외. |
| XSS via Blob URL | 외부 노출 URL이 HTML/JS로 해석 | `Content-Disposition: attachment` 비사용은 유지하되 MIME을 image/*만 허용. SVG 제외. |
| 한도 우회 비용 폭주 | 업로드 빈도 반복 | 디바이스당 10 uploads/min + 어항당 50 sprite + Blob 디바이스당 5MB cap. 초과 시 422/429. |
| 마이그레이션 중 dataURL/Blob 둘 다 존재 | 메모리/페이로드 폭증 | 마이그레이션은 1마리씩 순차. 성공 즉시 dataURL 제거. PUT 페이로드 90KB 임계는 dataURL 잔존 fish 수가 줄어들 때 자연스럽게 풀린다. |
| 어린이 영역 정서 곡선 침입 | 업로드 실패 시 어린이 알림 노출 | 본 스펙 매핑 표가 어린이 영역 노출 금지. sprite-fallback만 사용. |
| 자동 sync 게이트 회피 | 마법 모먼트 도중 업로드가 PUT을 일으켜 정서 충돌 | 게이트 조건이 깨지면 업로드/PUT 모두 보류. |
| 다른 사용자의 sprite enumeration | 키가 추측 가능하면 임의 sprite 노출 | `aquariumId`/`fishId`가 UUID라 추측 불가능. URL은 immutable + 공개. |

## 검증 기준

- [ ] 첫 등록 후 클라이언트가 dataURL을 잠시 보유한 채로 어항이 렌더되고, 자동 sync 게이트 통과 직후 Blob 업로드가 시작된다.
- [ ] 업로드 성공 시 어항 문서가 `fish.spriteUrl`로 갱신되고 다음 PUT 페이로드에서 해당 fish의 `sprite`(dataURL)가 제거되어 페이로드 크기가 줄어든다.
- [ ] `image/png`, `image/jpeg`, `image/webp` 외 MIME 업로드 시도는 클라이언트 단계에서 차단되고, 서명 URL 단계도 거절한다.
- [ ] `image/svg+xml`는 어떤 단계에서도 허용되지 않는다.
- [ ] 서버 `upload-commit`이 첫 16바이트 magic byte 검증을 수행하고, 불일치 시 Blob을 삭제하고 400을 반환한다.
- [ ] 디바이스당 10 uploads/min 초과 시 429 + `Retry-After`. 어항당 51번째 sprite 업로드 요청은 422.
- [ ] 어린이 영역에는 업로드 진행/성공/실패/한도 안내가 **하나도 노출되지 않는다**.
- [ ] 부모 영역 `parent.sync` 슬롯에는 “이미지 저장 N/M”, “저장 실패 N”, “저장 한도 N/50”이 단조 색으로 표시된다.
- [ ] sprite GET이 200ms 이상 지연되면 회색 실루엣 + 거품 burst placeholder가 어린이 영역에 표시되고, 로드 성공 시 자연스럽게 교체된다.
- [ ] `prefers-reduced-motion` 활성 시 거품 burst가 정적 실루엣으로 대체된다.
- [ ] 마이그레이션이 자동 sync 게이트(S-025a)와 동일 조건에서만 동작한다(온보딩 진행/마법 모먼트 큐 비점유 중에는 일어나지 않는다).
- [ ] 마이그레이션이 끝나면 어항 문서 페이로드가 90KB 임계 아래로 안정적으로 떨어진다.
- [ ] Blob 토큰 미설정 환경에서 라우트는 503을 반환하고 클라이언트는 업로드 파이프라인을 자동으로 비활성화한다(dataURL은 그대로 유지).
- [ ] `npm test`(업로드 분기/마이그레이션/magic byte 단위 테스트 포함)가 통과한다.
- [ ] `npm run lint`, `npm run build`, `npm run cleanup` 모두 통과한다.
- [ ] 브라우저 콘솔에 새 경고/오류가 발생하지 않는다(`VITE_BACKEND_ENABLED=false` 기준).

## Files To Add or Change

| Path | Action | Purpose |
| --- | --- | --- |
| `src/features/aquarium/model.js` | change | `fish.spriteUrl?` 필드 + 보정. 둘 다 있으면 `spriteUrl` 우선. |
| `src/features/aquarium/storage/upload.js` | add | 클라이언트 업로드 파이프라인 + 진행/실패 카운터. |
| `src/features/aquarium/storage/migration-blob.js` | add | dataURL → Blob 1회 마이그레이션 큐. |
| `src/features/aquarium/storage/sync.js` | change | post-save hook에서 업로드/마이그레이션 호출. 자동 sync 게이트 공유. |
| `src/features/aquarium/storage/sprite-fallback.js` | change | 200ms 지연/실패 임계 적용(S-025a에서 정의된 모듈 보강). |
| `api/upload-url.js` | add | 서명 URL 발급 + owner/MIME/크기 검증. |
| `api/upload-commit.js` | add | magic byte 재검증 + 어항 반영 + 불일치 시 Blob 삭제. |
| `api/_lib/blob.js` | add | `@vercel/blob` wrapper. |
| `api/_lib/magicBytes.js` | add | PNG/JPEG/WebP 시그니처 검증 helper. |
| `package.json` | change | `@vercel/blob` 추가. |
| `ARCHITECTURE.md` | change | `features/aquarium/storage/` 트리 + 본 스펙 done 시점에 반영. |
| `SPEC.md` | change | S-025b row 추가(draft). |
| `docs/spec/S-025b-image-pipeline.md` | add | 본 문서. |

## Open Questions

- 어항당 50 sprite cap이 첫 사용 시나리오에서 충분한지. → 4–6세 일일 평균 등록 수 데이터 부재. 첫 베타 텔레메트리(부모 영역 “저장 한도 도달” 빈도)로 조정.
- 마이그레이션 동시성(현재 2)을 늘리면 첫 부팅 트래픽이 한 번에 몰릴 수 있음. → 2를 유지, 필요 시 추후 4로.
- Blob URL을 영구 immutable로 둘지, sprite 삭제 시 URL revocation까지 보장할지. → 현재는 immutable + GC. URL revocation은 별도 보안 스펙.
- sprite 한도 도달 후 “기존 sprite 정리” 부모 영역 도구를 본 스펙에 포함할지. → 어린이 영역 삭제 흐름이 이미 존재하므로 본 스펙은 안내만 제공. 부모 전용 일괄 정리 도구는 별도 스펙.
- 클라이언트 캔버스 압축/추가 리사이즈(예: WebP 변환)를 도입할지. → 현재 240×160 리사이즈와 1MB cap이 양립. 별도 스펙.

## Next Step

1. 본 스펙을 사람이 검토해 `ready`로 전환한다.
2. `ready` 후 다음 순서로 PR을 쪼개는 것을 권장한다.
   1. `model.js` 필드 추가 + 보정 단위 테스트.
   2. `api/upload-url.js` + `api/upload-commit.js` + magic byte 검증 + zod.
   3. `storage/upload.js`(클라이언트 파이프라인) + 성공 분기 단위 테스트.
   4. `storage/migration-blob.js` + 자동 sync 게이트 공유.
   5. 부모 영역 `parent.sync` 카드 보강(이미지 저장 N/M).
3. 본 스펙이 done이 되면 S-025a의 “90KB 조용한 실패” 위협이 해소되고, 부모 스펙의 결정 7이 실제 코드로 반영된다.
