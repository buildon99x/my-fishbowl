# 2026-05-07 ESLint와 cleanup(knip) 검사를 갈라놓은 실수

## Symptom

- PR #34 CI에서 두 차례 린트/클린업 실패가 났다.
  1. `no-useless-concat`: `src/features/prop-panel/view.js:11`의 `'god' + 'mode'`.
  2. knip `Unused exports (13)` + `Unlisted binaries (1)`: `algae`, `aquarium/storage`, `cleaning`, `feeding`, `fish-input`, `fish-movement`, `prop-panel`에 걸쳐 사용하지 않는 export가 다수 잡혔다.
- 로컬에서는 `npm run lint`(ESLint만)와 `npm test`만 돌렸기에 사전에 인지하지 못했다.

## Root Cause

- 로컬 검증 명령(`npm run lint`)이 ESLint만 실행했고 knip/depcheck는 별도 `npm run cleanup`으로 분리돼 있었다. "린트 = ESLint"로 좁게 받아들여 `cleanup`을 매번 돌리지 않았다.
- `knip.json`에 테스트 파일이 entry로 등록돼 있지 않아 테스트에서만 쓰이는 export가 모두 미사용으로 잡혔다.
- `cleanup` 스크립트가 `knip`/`depcheck`를 `npx`로 부르는데, 이 두 바이너리는 devDependencies에 없어 knip이 "Unlisted binaries"로 신호를 보냈다.
- 사용하지 않는 export를 만들고도 (배럴 재export, 내부 전용 상수의 `export` 키워드 잔존) 정리하지 못한 채 커밋했다.

## Fix

- `package.json`의 `lint`를 `eslint src --max-warnings=0 && knip --reporter compact`로 묶어 ESLint와 knip을 함께 실행하도록 변경.
- `prepare` 스크립트로 `git config core.hooksPath .githooks` 설정. `.githooks/pre-push`에서 `npm run cleanup && npm test`를 강제 실행해 푸시 전에 차단.
- `.claude/hooks/session-start.sh`도 `npm run lint`(이제 knip 포함)로 일원화.
- `knip.json`에 `src/**/*.test.js`를 entry로 추가하고 `ignoreBinaries`에 `knip`/`depcheck` 등록.
- 사용처가 없는 export는 `export` 키워드를 제거하거나 (모듈 내부 사용 시) 심볼 자체를 삭제 (`setEditingTarget`).
- `Claude.md` 실행 명령어 섹션에 `npm run cleanup`/`pre-push` 훅을 명시.

## Prevention Rule

- 푸시 전 반드시 `npm run cleanup`을 통과시킨다. (`pre-push` 훅이 자동 실행하지만 수동 확인도 권장.)
- 새 `export`를 추가할 때는 외부 사용처(import)를 확인한다. 사용처가 같은 모듈 내부뿐이면 `export`를 붙이지 않는다.
- 배럴(`index.js`)에서 재export를 추가할 때는 실제 외부 import가 있는지 확인한다.
- `docs/spec-command-patterns.md`의 "스펙 구현" 절차에 `npm run cleanup` 실행 단계가 포함된다.

## Related Files

- `package.json` (`lint`, `cleanup`, `prepare` 스크립트)
- `.githooks/pre-push`
- `.claude/hooks/session-start.sh`
- `knip.json`
- `Claude.md` 실행 명령어 섹션
- 사용하지 않는 export를 정리한 모듈들: `src/features/algae/{index,state}.js`, `src/features/aquarium/storage.js`, `src/features/cleaning/index.js`, `src/features/feeding/{foodEffects,state}.js`, `src/features/fish-input/state.js`, `src/features/fish-movement/{fishBehavior,fishPhysics,index,state}.js`, `src/features/prop-panel/{index,state}.js`, `src/features/prop-panel/view.js`
