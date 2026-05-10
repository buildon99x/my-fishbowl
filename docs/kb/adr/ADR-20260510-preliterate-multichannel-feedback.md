# ADR-20260510 Pre-literate Multi-channel Feedback Over Text Toasts

## Status

- accepted

## Context

- S-021b 기본 오브젝트 갤러리 UX 리뷰 중, 등록/오류/디바운스 이벤트에 대한 사용자 피드백 방식 결정 필요.
- 타깃 사용자: 4–8세 어린이(비문해/저문해), 태블릿 터치. 부모 보조는 보조적.
- 기존 안은 텍스트 토스트("등록되었습니다", "잠시 후 다시")에 의존했으나 비문해 사용자에게는 정보 전달이 안 되고 글 읽는 순간 마법 같은 흐름이 끊김.
- S-022 사운드 시스템과 S-021 magic-moment, S-024 터치 정책이 이미 다채널 피드백 자산을 제공.

## Decision

- 모든 사용자 피드백은 시각(이모지/색/형태/움직임) + 음향(SE) + 구조(레이아웃 변화) 중 둘 이상을 동시에 사용하고, 텍스트 토스트는 기본 경로에서 제거.
- 등록 성공: 카드 200ms 펄스 + 모달 0.6–0.8s peek + 짧은 magic-moment(거품+ring) + S-022 입수 SE + fish-list 1.2s 강조 + <100ms 즉시 시각 피드백.
- 디바운스 무시 탭: "잠깐" 펄스 1회로 시각 응답 보장.
- 오류: 카드 회색톤 + ❓ + ↘ 흔들림으로 대체.
- `prefers-reduced-motion`에서는 펄스/peek/magic-moment를 정적 변화로 다운그레이드하되 사운드는 유지(다채널 보장).

## Alternatives Considered

- Option A: 텍스트 토스트 유지 + ARIA live region — 비문해 사용자에게 정보 0, 거부.
- Option B: 음향만 사용 — 무음 환경/청각 장애에 취약, 단일 채널이라 거부.
- Option C: 아이콘 토스트(텍스트 없는) — 위치/타이밍이 본 흐름과 분리되어 magic-moment 연속성 깨짐, 거부.

## Consequences

- Positive: 비문해 어린이도 등록/오류/무시 상태를 즉시 인지. magic-moment 정서 곡선이 갤러리 진입까지 확장됨.
- Tradeoff: 구현 시 4개 모듈(카드 펄스, 모달 peek, magic-moment 단축본, fish-list 강조)을 한 등록 트랜잭션 안에서 조율해야 함. reduced-motion 분기 코드 증가.
- Follow-up: S-021c 후속에서 다른 모달(설정/도움말)에도 토스트 제거 정책 확장 검토.

## Scope

- Applies to: S-021b 기본 오브젝트 갤러리, 향후 어린이 직접 조작 모달의 피드백 설계.
- Does not apply to: 부모/개발자 향 화면(설정 디버그, devtool 패널) — 이들은 텍스트 허용.

## Related Sources

- `docs/spec/S-021b-default-objects-gallery.md`
- `docs/spec/S-021-magic-moment.md`
- `docs/spec/S-022-sound-system.md`
- `docs/spec/S-023-onboarding.md`
- `docs/spec/S-024-touch-target-upgrade.md`
