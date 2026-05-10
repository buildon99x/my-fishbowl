# LRN-20260510 DESIGN.md Was Brand Reference, Not Product Persona

## Symptom

- UX 리뷰 시작 시 `DESIGN.md`를 페르소나/디자인 가이드로 가정하고 읽었으나 실제 내용은 Clay.com의 외부 디자인 레퍼런스였음.
- 만약 그대로 적용했다면 4–8세 어린이용 제품에 어른 SaaS 톤(크림 캔버스, 미니멀 타이포)을 권고할 뻔함.

## Root Cause

- Direct cause: 파일명 `DESIGN.md`가 "이 프로젝트의 디자인 가이드"로 보이게 함. 실제 페르소나 정보는 `docs/spec/S-024-touch-target-upgrade.md`, `S-023-onboarding.md`, `S-021-magic-moment.md`에 흩어져 있음.
- Structural cause: 페르소나/타깃 사용자 정의가 단일 source of truth에 모여 있지 않고 스펙 문서마다 부분적으로 언급됨. 외부 레퍼런스와 내부 가이드가 같은 파일명 컨벤션을 공유.

## Fix or Recovery

- UX/디자인 작업 전에 `DESIGN.md`만 보지 말고 최소 다음을 함께 확인: `Claude.md`, `SPEC.md`, 그리고 터치 정책/온보딩/magic-moment 스펙. 외부 레퍼런스 파일에는 첫 줄에 "external reference / not project persona" 명시 권장.
- 후속: 페르소나 한 줄을 `Claude.md` 상단에 못박는 PR 검토(별도 작업).

## Prevention Rule

- "디자인/UX 작업을 시작할 때 페르소나 출처는 `DESIGN.md`가 아니라 스펙 문서에서 확인한다. `DESIGN.md`가 외부 브랜드 레퍼런스인 경우 페르소나 근거로 쓰지 않는다."

## Harness Target

- `Claude.md`에 한 줄 페르소나 stub 추가, 또는 `/ux_review` 스킬 입력 체크리스트에 "persona source verified (not external brand ref)" 항목 추가.

## Repetition Signal

- first occurrence

## Related Sources

- Files: `DESIGN.md`, `Claude.md`, `SPEC.md`
- Spec: `docs/spec/S-024-touch-target-upgrade.md`, `docs/spec/S-023-onboarding.md`, `docs/spec/S-021-magic-moment.md`, `docs/spec/S-021b-default-objects-gallery.md`
- Commit: `2464cd5 docs(spec): apply UX review findings to S-021b default objects gallery`
