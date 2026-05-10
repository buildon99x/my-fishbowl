# Spec

이 문서는 My Fishbowl 프로젝트의 스펙 인덱스다. 상세 요구사항은 `docs/spec/` 하위 문서에서 관리한다.

## 전체 목표

- 사용자가 브라우저에서 개인 2D 어항을 만들고 관리할 수 있는 Fishbowl MVP를 제공한다.
- 사용자가 업로드하거나 직접 그린 이미지를 2D 물고기 객체로 등록하고, 어항 안에서 자연스럽게 움직이게 한다.
- 먹이 주기와 청소처럼 직접 조작 가능한 관리 인터랙션을 제공한다.
- 작은 기능 단위로 빠르게 구현하고 검증할 수 있는 스펙 중심 개발 흐름을 유지한다.

## 전체 범위

- 포함:
  - 기본 어항 생성
  - 이미지 업로드 또는 직접 그리기를 통한 물고기 등록
  - 2D 어항 안의 물고기 자동 이동
  - 먹이 주기와 물고기 반응
  - 시간 기반 이끼 생성과 문질러 청소하기
  - 로컬 저장소 기반 데이터 저장
  - 개발 환경 전용 God Mode
- 제외:
  - 로그인
  - 친구 어항 방문
  - AI 이미지 변환
  - 물고기 성장 시스템
  - 상점
  - 서버 저장

## 스펙 조각 목록

| ID | 제목 | 상태 | 구현 여부 | 검증 여부 | 상세 문서 |
| --- | --- | --- | --- | --- | --- |
| S-001 | Fishbowl MVP 초기 화면 및 기본 상호작용 | done | done | tested | `docs/spec/S-001-initial-spec.md` |
| S-002 | 어항 생성 | done | done | tested | `docs/spec/S-002-aquarium-creation.md` |
| S-003 | 이미지 업로드 및 직접 그리기 | done | done | tested | `docs/spec/S-003-fish-image-input.md` |
| S-004 | 물고기 생성 | done | done | tested | `docs/spec/S-004-fish-creation.md` |
| S-005 | 물고기 움직임 | done | done | tested | `docs/spec/S-005-fish-movement.md` |
| S-006 | 먹이 주기 | done | done | tested | `docs/spec/S-006-feeding.md` |
| S-007 | 어항 오염 및 이끼 시스템 | ready | done | tested | `docs/spec/S-007-algae-system.md` |
| S-008 | 어항 청소 | done | done | tested | `docs/spec/S-008-aquarium-cleaning.md` |
| S-009 | 물고기 생동감 | done | done | tested | `docs/spec/S-009-fish-liveliness.md` |
| S-010 | 먹이 종류 | ready | not-started | not-tested | `docs/spec/S-010-food-types.md` |
| S-011 | 어항 거품 효과 | done | done | tested | `docs/spec/S-011-aquarium-bubble-effects.md` |
| S-011 | 물고기 목록 스크롤 위치 보존 | done | done | tested | `docs/spec/S-011-fish-list-scroll-preservation.md` |
| S-013 | 속성 패널(prop-panel) 분리 및 신설 | done | done | tested | `docs/spec/S-013-prop-panel.md` |
| S-016 | Dev harness improve | draft | not-started | not-tested | `docs/spec/S-016-dev-harness_improve.md` |
| S-017 | Main and components structure | draft | not-started | not-tested | `docs/spec/S-017-main-components-structure.md` |
| S-018 | ARCHITECTURE.md / SPEC.md 동기화 | draft | not-started | not-tested | `docs/spec/S-018-docs-sync.md` |
| S-020 | ADR/LRN KB Harness | draft | not-started | not-tested | `docs/spec/S-020-adr-lrn-kb-harness.md` |
| S-021a | Prop 타입 인프라 실구현 | draft | not-started | not-tested | `docs/spec/S-021a-prop-type-infra.md` |
| S-021b | Default Objects 프리셋 갤러리 | draft | not-started | not-tested | `docs/spec/S-021b-default-objects-gallery.md` |
| S-021 | 어항 경계(타원) 충돌로 물고기 이탈 방지 | done | done | tested | `docs/spec/S-021-fish-bowl-boundary.md` |
| S-021 | Draw-to-Life Magic Moment | draft | done | not-tested | `docs/spec/S-021-magic-moment.md` |
| S-022 | Sound system | draft | done | not-tested | `docs/spec/S-022-sound-system.md` |

## 상태 값

- `draft`: 설계 중
- `ready`: 요구사항이 정리되어 구현 가능
- `done`: 구현과 검증 완료
- `blocked`: 결정이나 외부 조건 필요

## 현재 작업

- 현재 작업 ID: S-007, S-008, S-011
- 상세 문서:
  - `docs/spec/S-007-algae-system.md`
  - `docs/spec/S-008-aquarium-cleaning.md`
  - `docs/spec/S-011-fish-list-scroll-preservation.md`

## 스펙 상세 문서 규칙

- 파일 위치: `docs/spec/`
- 파일명 형식: `<ID>-<short-title>.md`
- 새 상세 문서는 `docs/spec/_template.md` 구조를 따른다.
- 구현이 아키텍처 경계를 바꾸면 `ARCHITECTURE.md`도 함께 갱신한다.

## 완료 기록

| ID | 완료 내용 | 검증 결과 |
| --- | --- | --- |
| S-002 | 기본 어항 생성, 경계 정보 저장/복원 구조 구현 | `npm run build` 통과 |
| S-003 | 이미지 업로드, 직접 그리기 Canvas, 미리보기, 물고기 이름 입력, 스프라이트 초안 저장 구현 | `npm run build` 통과 |
| S-006 | 먹이 생성, 낙하, 물고기 반응, 먹이 섭취 상태 구현 | `npm test`, `npm run build` 통과 |
| S-007 | 30분 단위 0~96 이끼 레벨, 청결도 연동, 이끼 Canvas 렌더링, God Mode 직접 레벨 설정 구현 | `npm test`, `npm run build` 통과 |
| S-008 | 보이는 이끼 픽셀 기준 청소 진행률, 완료 처리, Canvas 즉시 비우기 구현 | `npm test`, `npm run build` 통과 |
| S-009 | 물고기 이동 상태와 방향 전환 보정 구현 | `npm test`, `npm run build` 통과 |
| S-011 | 물고기 목록 리렌더링 시 스크롤 위치 보존 구현 | `npm test`, `npm run build` 통과 |
| S-016 | 스펙 명령 패턴/체크리스트/코드 수정 위치 맵을 `docs/spec-command-patterns.md`로 분리, `Claude.md` 라우터화, `docs/learn/_template.md` 추가 | `npm run build` 통과 |
