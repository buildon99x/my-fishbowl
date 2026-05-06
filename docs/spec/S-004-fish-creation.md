# S-004 물고기 생성

## 상태

- 상태: ready
- 구현 여부: not-started
- 검증 여부: not-tested

## 목표

- 업로드되거나 직접 그린 이미지를 어항 속 물고기 오브젝트로 등록한다.
- 생성된 물고기는 어항 데이터에 저장되고 화면에 렌더링된다.

## 범위

- 포함할 것:
  - 물고기 고유 ID 생성
  - 이름, 이미지, 위치, 방향, 속도, 배고픔 등 기본 속성 저장
  - 어항 내부 초기 위치 배치
  - 로컬 저장소에 물고기 데이터 저장
- 제외할 것:
  - 물고기 성장 시스템
  - 상점 또는 꾸미기 아이템
  - 물고기끼리 겹침 방지

## 사용자 흐름

1. S-003(물고기 이미지 입력)에서 이미지/이름 드래프트가 준비된 상태에서 시작한다.
2. 사용자가 등록 버튼을 누른다.
3. 앱은 물고기 오브젝트를 생성해 현재 어항에 추가한다.
4. 생성된 물고기가 어항 화면에 표시된다.
5. 등록 직후 해당 물고기의 편집 모드가 자동으로 열린다(이름·크기·회전·반전 등).

## UI/상태 요구사항

- 필요한 화면 요소:
  - 물고기 등록 버튼
  - 생성된 물고기 렌더링 영역
  - 물고기 목록 또는 물고기 수 표시
- 입력(드래프트) 상태(`fish-input/state.js` 기준):
  - `idle`: 초기 상태
  - `uploading`: 이미지 처리/변환 중
  - `preview`: 등록 가능한 드래프트 보유
  - `error`: 처리 실패
- 오류 또는 빈 상태:
  - 이미지가 없으면 물고기를 생성하지 않는다.
  - 이름이 비어 있으면 기본 이름(`Unnamed fish`)을 사용한다.

## 데이터 요구사항

| 항목 | 설명 |
| --- | --- |
| id | 물고기 고유 ID |
| name | 물고기 이름 |
| imageUrl | 이미지 경로(또는 data URL) |
| x, y | 현재 위치(어항 내부 비율 좌표 %) |
| vx, vy | 이동 벡터 |
| speed | 이동 속도 |
| size | 렌더링 크기(px) |
| rotation | 회전 각도(deg) |
| scaleX, scaleY | 가로/세로 스케일 |
| flipped, flippedY | 좌우/상하 반전 여부 |
| hidden | 숨김 여부 |
| hunger | 배고픔 수치 |
| createdAt | 생성일 |
| lastFedAt | 마지막 먹이 시간 |

```ts
type Fish = {
  id: string;
  name: string;
  imageUrl: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  size: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  flipped: boolean;
  flippedY: boolean;
  hidden: boolean;
  hunger: number;
  lastFedAt?: string;
  createdAt: string;
};
```

## 구현 메모

- 관련 파일:
  - `src/main.js`
  - `src/features/fish-input/index.js`
  - `src/features/fish-input/state.js`
  - `src/features/fish-input/view.js`
  - `src/styles/components.css`
- 물고기 상태 관리가 커지면 `src/features/fish/`로 분리한다.
- 물고기끼리 겹침은 MVP에서 허용 가능하다.

## 검증 기준

- [ ] 이미지와 이름으로 물고기를 등록할 수 있다.
- [ ] 생성된 물고기에 고유 ID가 부여된다.
- [ ] 생성된 물고기가 어항 안에 표시된다.
- [ ] 물고기 위치가 어항 경계 안에 설정된다.
- [ ] 물고기 데이터가 로컬 저장소에 저장된다.
- [ ] 재접속 시 등록된 물고기가 복원된다.
- [ ] 이름 없이 등록하면 기본 이름(`Unnamed fish`)이 적용된다.
- [ ] 등록 직후 해당 물고기의 편집 모드가 자동으로 열린다.
- [ ] 물고기 숨김(`hidden`) 상태가 저장·복원된다.
- [ ] 브라우저 콘솔 오류가 없다.
- [ ] `npm run build`가 통과한다.
