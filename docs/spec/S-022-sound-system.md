# S-022 사운드 시스템

## 상태

- 상태: draft
- 구현 여부: not-started
- 검증 여부: not-tested

## 의존성

- 없음 (다른 스펙이 본 시스템의 트리거를 호출)
- 연동 대상: S-004 등록, S-006 먹이, S-008 청소, S-013 prop-panel, S-021 마법 모먼트, S-023 온보딩

## 목표

- 어린이 사용자(4–8세)에게 인터랙션마다 즉각적이고 따뜻한 청각 피드백을 제공한다.
- ambient / ui / interaction / magic 4개 카테고리를 독립 관리하여, 카테고리별 on/off와 볼륨을 조절할 수 있게 한다.
- WHO 어린이 청각 보호 권고를 만족하는 안전 기본값을 가진다.
- 브라우저 자동 재생 정책을 우회하지 않고 명확한 첫 user gesture로 활성화한다.

## 범위

- 포함할 것:
  - Web Audio API 기반 사운드 그래프 (카테고리별 GainNode)
  - 사운드 자산 lazy 로딩과 디코딩
  - 첫 진입 사운드 모달 (켜기 / 건너뛰기)
  - 음소거 토글 + localStorage 저장
  - 카테고리별 on/off, 볼륨 슬라이더 (부모 영역)
  - 햅틱 연동 (`navigator.vibrate`)
  - 자동 재생 정책 처리 (suspended → resume)
  - 페이지 visibility 처리
  - 동시 재생 수 상한, rate limit
- 제외할 것:
  - 사운드 자산 제작 자체 (별도 자산 작업)
  - 음성 인식 / TTS

## 사용자 흐름

1. 첫 진입 시 어항 위에 큰 "🔊 소리 켜기" 모달 표시 (스피커 이모지 + 미리듣기 버튼).
2. "켜기" 클릭 → 모든 카테고리 활성, 상태 저장.
3. "건너뛰기" 클릭 → 모든 카테고리 비활성, 모달 다시 안 뜸.
4. 우측 상단 🔇/🔊 토글로 언제든지 전체 음소거 가능.
5. 부모 영역에서 카테고리별 볼륨/on-off 조정.

## 사운드 카테고리와 정서 매핑

| 카테고리 | 정서 의도 | 트리거 예시 | 길이 | 기본 볼륨 |
|---|---|---|---|---|
| ambient | 평온, 몰입 | 진입 후 자동 루프 | 30s seamless | 0.25 |
| ui | 명확, 즉각 | 버튼 클릭, 패널 열림 | 80–200ms | 0.35 |
| interaction | 만족, 보상 | 먹이, 청소 성공 | 200–600ms | 0.45 |
| magic | 경이, 환영 | S-021 3 phase | 0.8/0.4/1.2s | 0.55 |

각 효과음은 따뜻한 톤(불협 회피, 200–4000Hz 위주)으로 디자인.

## 사운드 자산 목록

```
public/sounds/
  ambient/
    water-loop.ogg
  ui/
    tap.ogg
    panel-open.ogg
    panel-close.ogg
    toggle-on.ogg
    toggle-off.ogg
  interaction/
    food-drop.ogg
    food-eat.ogg
    clean-stroke.ogg
    clean-complete.ogg
    fish-delete.ogg
  magic/
    magic-anticipate.ogg
    magic-splash.ogg
    magic-welcome.ogg
```

- OGG Vorbis 권장 (MP3 fallback 옵션).
- 각 파일 ≤ 60KB, 총 합 ≤ 600KB.

## 안전 기본값

- 마스터 볼륨 상한 **0.7** (어린이 청각 보호).
- 동시 재생 수 상한 6개 (초과 시 가장 오래된 효과음 fade-out).
- ambient는 fade-in 1.5s, fade-out 1.0s.
- 동일 효과음 100ms 이내 연속 트리거 시 두 번째는 무시.

## 자동 재생 정책 처리

- 첫 user gesture 전까지 AudioContext는 `suspended`.
- "소리 켜기" 클릭이 첫 user gesture가 되어 `audioContext.resume()` 호출.
- 페이지 visibility hidden 시 ambient만 일시정지 (효과음은 그대로).
- 페이지 복귀 시 자동 재개.

## UI/상태 요구사항

- 필요한 화면 요소:
  - 첫 진입 모달 ("🔊 소리 켜기" / "건너뛰기")
  - 우측 상단 음소거 토글 (48×48px 이상)
  - (부모 영역) 카테고리별 슬라이더
- 필요한 상태 (localStorage 저장):
  ```ts
  type SoundSettings = {
    masterEnabled: boolean;
    masterVolume: number;          // 0.0–0.7
    categories: {
      ambient: { enabled: boolean; volume: number };
      ui:      { enabled: boolean; volume: number };
      interaction: { enabled: boolean; volume: number };
      magic:   { enabled: boolean; volume: number };
    };
    onboardingShown: boolean;
    hapticEnabled: boolean;
  };
  ```
  - localStorage key: `fishbowl.sound.v1`

## 햅틱 연동

| 트리거 | 패턴 |
|---|---|
| ui tap | 10ms |
| interaction (food, clean stroke) | 30ms |
| magic Phase B | 30ms |

햅틱은 사운드와 독립적으로 on/off 가능.

## 공개 API

```js
playSound('ui.tap');
playSound('interaction.food-drop', { volume: 0.5 });
setCategoryEnabled('ambient', false);
setMasterMuted(true);
playHaptic('light');
```

## 검증 기준

- [ ] 첫 진입 시 "🔊 소리 켜기" 모달이 표시된다.
- [ ] "켜기" 클릭 후 ambient가 1.5s fade-in으로 시작된다.
- [ ] "건너뛰기" 클릭 후 모든 사운드가 비활성이며 모달이 다시 뜨지 않는다.
- [ ] 음소거 토글로 모든 카테고리가 즉시 음소거되고 상태가 저장된다.
- [ ] 음소거 상태가 새로고침 후 복원된다.
- [ ] 마스터 볼륨이 0.7을 넘지 않는다.
- [ ] 동일 효과음이 100ms 이내 연속 호출되어도 한 번만 재생된다.
- [ ] 동시 재생 수가 6개를 넘으면 가장 오래된 효과음이 fade-out된다.
- [ ] AudioContext는 첫 user gesture 전까지 suspended 상태이다.
- [ ] 페이지 visibility hidden 시 ambient가 일시정지된다.
- [ ] 모바일에서 햅틱이 동작하며, 사운드와 독립적으로 on/off 가능하다.
- [ ] 카테고리별 on/off가 정상 동작한다.
- [ ] 사운드 자산 총 크기가 600KB를 넘지 않는다.
- [ ] 음소거 토글 버튼이 48×48px 이상이다.
- [ ] 브라우저 콘솔 오류가 없다.
- [ ] `npm test`가 통과한다.
- [ ] `npm run build`가 통과한다.
