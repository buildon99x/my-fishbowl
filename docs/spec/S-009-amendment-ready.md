# S-009 ready 승격 amendment

## 상태

- 원 draft: `S-009-fish-liveliness.md` (draft)
- 본 amendment 적용 후 상태: ready
- 변경 유형: 보강 (기존 draft 내용 모두 유지)

## 의존성

- S-005 (선결, 구현됨)
- S-021 마법 모먼트 (행동 머신 합류 시점 정의)
- S-022 사운드 (행동 상태 변화 옅은 효과음 옵션)
- S-013 prop-panel (개체별 파라미터 노출)

## 본 amendment의 역할

S-009 draft의 기술 명세는 충분하다. 본 문서는 **어린이 사용자 관점**과 **신규 스펙(S-021/022/023)과의 정합**을 보강하여 ready로 승격한다.

## 보강 1: 어린이 친화 성격 라벨

draft의 개체별 파라미터(`speedMultiplier`, `idleBias`, `preferredDepth`)는 내부 수치다. 어린이가 "내 물고기는 어떤 친구야?" 인지할 수 있게 **파생 라벨**을 자동 부여한다.

### 라벨 도출 규칙

| 라벨 | 조건 | 사용자 표시 |
|---|---|---|
| `lively` | speedMultiplier ≥ 1.15 AND idleBias ≤ 0.1 | "활발한 친구" 🎉 |
| `gentle` | 0.9 ≤ speedMultiplier < 1.15 AND idleBias ≤ 0.2 | "온순한 친구" 🌱 |
| `lazy`  | idleBias > 0.2 | "느긋한 친구" 😌 |
| `swift` | speedMultiplier ≥ 1.25 | "재빠른 친구" ⚡ |

라벨은 prop-panel에 작은 badge로 표시 (선택적).

## 보강 2: 터치 디바이스 회피 정책

draft는 "마우스 80px 이내 dart"만 정의 — 터치 환경에 마우스가 없다.

- 터치 환경: `pointerdown` + `pointermove`가 진행 중일 때만 회피 발동.
- 단순 탭(빠른 down/up)은 회피 트리거가 아님.
- 탭 시 회피 대신 **놀람 반응**: 0.3초 멈칫 → 부드러운 방향 전환.
- 어린이가 "와, 반응했다!" 정서를 얻음.

## 보강 3: 마법 모먼트 합류 타이밍

- S-021 Phase C 종료 시점에 행동 머신에 등록.
- 첫 3초간 강제로 `cruising` + `speedMultiplier × 0.7` (천천히 헤엄).
- 어린이가 새 친구를 충분히 관찰할 수 있는 grace period.

## 보강 4: 사운드 옵션 (기본 OFF)

- 행동 상태 전환 시 옅은 ambient 효과음(볼륨 0.15).
- 기본 OFF (10마리 환경 청각 과부하 방지).
- 부모 영역에서 켤 수 있음.

## 보강 5: prop-panel 노출

- 개체별 파라미터 수치는 어린이에게 직접 노출하지 않는다.
- prop-panel에 **성격 라벨 badge**와 **"성격 다시 뽑기" 버튼**(🎲) 추가.
- "다시 뽑기"는 파라미터를 새 랜덤값으로 재할당.
- 일일 한도: 한 물고기당 하루 5회 (남용 방지, localStorage 카운트).

## 보강 6: 데이터 모델

기존 fish 데이터에 추가:

```ts
type FishPersonality = {
  speedMultiplier: number;
  idleBias: number;
  preferredDepth: 'top' | 'middle' | 'bottom';
  wavingFrequency: number;
  wavingAmplitude: number;
  label: 'lively' | 'gentle' | 'lazy' | 'swift';  // 도출값
  rerollCount?: { date: string; count: number };  // YYYY-MM-DD 기준
};
```

- 기존 저장 데이터는 마이그레이션 시 `normalizeAquarium`이 누락된 personality 필드를 랜덤 보정.
- 라벨은 마이그레이션 시 도출 규칙으로 계산해 저장.

## 추가 검증 기준 (기존 draft 검증 기준에 추가)

- [ ] 새 물고기 등록 시 personality 필드가 자동 할당된다.
- [ ] 라벨이 규칙에 따라 정확히 부여된다.
- [ ] prop-panel에 성격 badge가 표시된다.
- [ ] "성격 다시 뽑기" 버튼이 동작하며 변경 사항이 즉시 반영된다.
- [ ] 다시 뽑기는 한 물고기당 하루 5회로 제한된다.
- [ ] 터치 환경에서 단순 탭은 회피를 발동시키지 않고 놀람 반응을 일으킨다.
- [ ] 마법 모먼트(S-021) Phase C 종료 후 첫 3초간 천천히 헤엄친다.
- [ ] 기존 저장 데이터는 personality 누락 시 자동 보정된다.
- [ ] 사운드 옵션은 기본 OFF이며 부모 영역에서 켤 수 있다.
- [ ] 기존 S-009 draft 검증 기준 모두 유지된다.
