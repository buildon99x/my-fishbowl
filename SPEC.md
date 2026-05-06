# Spec

이 문서는 My Fishbowl 프로젝트의 스펙 인덱스다.
상세 요구사항은 `docs/spec/` 하위 문서에서 관리한다.

## 전체 목표

- 사용자가 브라우저에서 개인 2D 어항을 만들고 관리할 수 있는 Fishbowl MVP를 제공한다.
- 사용자가 업로드하거나 직접 그린 이미지를 2D 물고기 오브젝트로 등록하고, 어항 안에서 자연스럽게 움직이게 한다.
- 먹이 주기와 청소처럼 직접 조작 가능한 관리 인터랙션을 제공한다.
- 작은 기능 단위를 빠르게 구현/검증할 수 있는 스펙-중심 개발 흐름을 유지한다.

## 전체 범위

- 포함할 것:
  - 기본 어항 생성
  - 이미지 업로드 또는 직접 그리기를 통한 물고기 등록
  - 2D 어항 안에서의 물고기 자동 이동
  - 먹이 뿌리기와 물고기 반응
  - 시간 기반 이끼 생성과 문질러 청소하기
  - 로컬 저장소 기반 데이터 저장
- 제외할 것:
  - 로그인
  - 친구 어항 방문
  - AI 이미지 변환
  - 물고기 성장 시스템
  - 상점
  - 꾸미기 아이템
  - 서버 저장

## 스펙 조각 목록

| ID | 제목 | 상태 | 구현 여부 | 검증 여부 | 상세 문서 |
| --- | --- | --- | --- | --- | --- |
| S-001 | Fishbowl MVP 초기 화면 및 기본 상호작용 | ready | not-started | not-tested | `docs/spec/S-001-initial-spec.md` |
| S-002 | 어항 생성 | done | done | tested | `docs/spec/S-002-aquarium-creation.md` |
| S-003 | 이미지 업로드 및 직접 그리기 | done | done | tested | `docs/spec/S-003-fish-image-input.md` |
| S-004 | 물고기 생성 | ready | not-started | not-tested | `docs/spec/S-004-fish-creation.md` |
| S-005 | 물고기 움직임 | ready | not-started | not-tested | `docs/spec/S-005-fish-movement.md` |
| S-006 | 먹이 주기 | done | done | tested | `docs/spec/S-006-feeding.md` |
| S-007 | 어항 오염 및 이끼 시스템 | ready | not-started | not-tested | `docs/spec/S-007-algae-system.md` |
| S-008 | 어항 청소 | ready | not-started | not-tested | `docs/spec/S-008-aquarium-cleaning.md` |
| S-013 | 속성 패널(prop-panel) 분리 및 신설 | draft | not-started | not-tested | `docs/spec/S-013-prop-panel.md` |

상태 값:
- `draft`: 설계 중
- `ready`: 사람이 확인했고 구현 가능
- `done`: 구현과 검증 완료
- `blocked`: 결정이나 외부 조건이 필요함

## 현재 작업

- 현재 작업 ID: S-003
- 상세 문서: `docs/spec/S-003-fish-image-input.md`

## 스펙 상세 문서 규칙

- 파일 위치: `docs/spec/`
- 파일명 형식: `<ID>-<short-title>.md`
- 새 상세 문서는 `docs/spec/_template.md` 구조를 따른다.

## 완료 기록

| ID | 완료 내용 | 검증 결과 |
| --- | --- | --- |
| S-002 | 기본 어항 생성, 둥근 수조 렌더링, 로컬 저장소 저장/복원 구조 구현 | `npm run build` 통과 |
| S-003 | 이미지 업로드, 직접 그리기 캔버스, 미리보기, 물고기 이름 입력, 스프라이트 초안 저장 구현 | `npm run build` 통과 |
