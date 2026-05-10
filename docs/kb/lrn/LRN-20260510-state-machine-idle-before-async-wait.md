# LRN-20260510 State Machine Marked Idle Before Async Wait Completes

## Symptom

- Spec S-021 requires a 200ms "breath" pause between magic-moment phases during which any incoming registration must queue, not start a new parallel ritual.
- The implementation set `state.phase = 'idle'` and then `await wait(200)`. During those 200ms, `isMagicActive(state)` returned `false`, so a back-to-back registration started a fresh ritual instead of queueing — overlapping moments and out-of-order `onBreathEnd` / prop-panel openings.
- Caught by Codex P1 review on PR #44.

## Root Cause

- Direct cause: state transition to a "free" value happened *before* the async timer that defines the protected window finishes.
- Structural cause: a protected window in a state machine was modeled as "phase = idle for 200ms" instead of as its own first-class state.

## Fix or Recovery

- Introduce an explicit `breath` phase value. Stay in `breath` for the wait, then transition to `idle`.
- During `breath`, `isMagicActive(state)` returns true, so subsequent triggers go through the queue path.
- Commit: `49acd12 fix(magic-moment): address P1 review on PR #44`.

## Prevention Rule

- When a state machine has a protected "quiet" window after an animation/transition, model that window as its own named phase. Never move to a free/idle state before the timer that bounds the window has elapsed.

## Harness Target

- Add to `docs/spec-command-patterns.md` "코드 수정 위치 맵" the rule: every async wait inside a state-machine phase transition must be bracketed by a phase value that reflects the wait period.

## Repetition Signal

- first occurrence | related to: any future spec with phase-based timing (cleaning progress, magic-moment-like rituals, queued animations).

## Related Sources

- Files: `src/features/magic-moment/index.js`, `src/features/magic-moment/state.js`
- Spec: `S-021 Draw-to-Life Magic Moment` (Phase C → Breath → Prop-panel)
- PR: #44, commit `49acd12`
