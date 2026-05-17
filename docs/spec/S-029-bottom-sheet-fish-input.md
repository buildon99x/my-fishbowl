# S-029 Bottom Sheet 등록 UI + 키보드 인셋 처리

## 상태

- 상태: ready
- 구현 여부: not-started
- 검증 여부: not-tested

## 목표

- 현재 `fixed; bottom:18` 으로 고정된 `fish-input-widget`을 iOS 스타일 bottom-sheet로 전환한다.
- 이름 입력 시 iOS 소프트 키보드가 시트를 가리지 않도록 `visualViewport` 기반 인셋 처리를 도입한다.
- 그리기 캔버스를 Pencil 사용 가능한 크기로 키우고 터치 스크롤과의 충돌을 제거한다.

## 범위

- 포함할 것:
  - `fish-input-widget`을 `.bottom-sheet` 컴포넌트로 마크업/스타일 전환(그래버 핸들, 2단 펼침: peek/full).
  - `visualViewport.resize` 리스너로 `--keyboard-inset` CSS 변수 갱신.
  - 그리기 캔버스에 `touch-action: none`, 크기 `min(720px, calc(100vw - 32px)) × aspect-ratio 3/2`.
  - swipe down(또는 그래버 탭)으로 닫기.
  - "등록" 버튼을 시트 footer로 이동(sticky, disabled 상태도 표시).
- 제외할 것:
  - 🎁 카탈로그 + ➕ 직접 만들기 통합 → **S-031**.
  - 시트 외부 색상/타이포 토큰 정리 → **S-032**.

## 사용자 흐름

1. 사용자가 dock의 ➕를 탭한다.
2. 화면 하단에서 시트가 peek 상태(약 40vh)로 슬라이드 업한다 — 이미지 선택, 이름 입력, 종류 토글 표시.
3. 사용자가 이름 input을 탭하면 키보드가 올라오고 시트의 입력 영역이 키보드 위에 그대로 보인다(가려지지 않음).
4. 사용자가 그래버를 위로 끌면 full 상태(약 92vh)로 확장되어 그리기 캔버스/미리보기가 노출된다.
5. footer의 sticky "등록" 버튼은 비활성/활성 상태를 항상 노출한다.
6. 그래버 아래로 스와이프 또는 backdrop 탭으로 시트가 닫힌다.

## UI/상태 요구사항

- 필요한 화면 요소:
  - 시트 컨테이너 `.bottom-sheet`(grabber, body, footer).
  - 6×4px 둥근 그래버 핸들.
  - sticky footer(등록/지우기).
  - backdrop(`rgba(0,0,0,0.32)`, peek 단계에선 0.18).
- 필요한 상태:
  - `fishInputState.sheetStage: 'closed' | 'peek' | 'full'`.
  - `--keyboard-inset` CSS 변수 (visualViewport 갱신).
- 오류 또는 빈 상태:
  - 잘못된 파일/미리보기 없음 상태는 기존 status 메시지 재사용.

## 구현 메모

- 관련 파일:
  - `src/features/fish-input/view.js` — 시트 마크업.
  - `src/features/fish-input/state.js` — `sheetStage` 추가, `isExpanded` 폐기 또는 통합.
  - `src/features/fish-input/index.js` — pointer/touch 기반 swipe 핸들러, `visualViewport` 바인딩.
  - `src/styles/components.css` 또는 신규 `src/styles/components/bottom-sheet.css` — 시트 스타일.
  - S-028 도입 변수 사용(`--keyboard-inset`, `--z-modal`).
- 새 파일: `src/styles/components/bottom-sheet.css`(재사용 가능 시).

## 검증 기준

- [ ] iPad Safari에서 이름 input 포커스 시 시트의 입력 영역이 키보드 위에 보인다.
- [ ] 그래버 위/아래 스와이프로 peek↔full↔closed 전환된다.
- [ ] Pencil/손가락으로 캔버스 그리기 중 시트가 스크롤되지 않는다.
- [ ] sticky footer의 "등록" 버튼이 시트 어느 상태에서도 보인다.
- [ ] 폭 320px(Split View)에서 시트가 100vw로 동작한다.
- [ ] 콘솔 오류 없음, `npm run build`/`npm test` 통과.
