# Dev Server Port Confusion

## What Happened

`물고기 목록` 접기/펼치기 기능을 구현한 뒤 사용자가 in-app browser에서 `http://127.0.0.1:5173/`을 보고 있었지만, 해당 포트는 현재 worktree(`dcaf`)의 Vite 서버가 아니었다.

현재 worktree의 최신 코드에는 `data-toggle-fish-list`가 포함되어 있었고 `http://127.0.0.1:5174/`에서 서빙 중이었다. 그러나 처음에는 `5173`이 현재 작업 결과를 보여준다고 가정해 사용자가 버튼을 보지 못하는 상황을 만들었다.

## Why It Happened

- 여러 Vite dev server가 동시에 실행 중이었다.
- `npm run dev` 실행 후 Vite가 포트 충돌 때문에 자동으로 다음 포트(`5174`)를 선택했을 가능성을 충분히 확인하지 않았다.
- 브라우저가 열어둔 URL과 현재 worktree가 실제로 서빙 중인 URL을 매칭하지 않은 채 UI 구현만 확인했다.
- 헤더 전체를 버튼으로 만들었지만 초기 스타일이 너무 투명해서, 실제로 올바른 포트를 보더라도 버튼 affordance가 약했다.

## Prevention

- dev server 실행 후에는 반드시 현재 worktree의 `/src/main.js` 또는 고유 문자열을 각 응답 포트에서 확인해 실제 포트를 식별한다.
- 사용자가 보고 있는 in-app browser URL이 현재 worktree 서버인지 확인하기 전에는 “화면에 반영됐다”고 말하지 않는다.
- 같은 포트 범위에 여러 Vite 서버가 떠 있으면, 응답 여부만 보지 말고 코드 fingerprint를 비교한다.
- 클릭 가능한 패널 헤더는 시각적으로 버튼임이 드러나도록 테두리, 배경, hover/focus 상태, 명확한 `접기`/`펼치기` 표시를 제공한다.
