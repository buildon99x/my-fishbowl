# LRN-20260510 pointer-events:none Blocks Bubbling Listeners on the Same Element

## Symptom

- Onboarding sequence-1 was supposed to count off-target taps (max 3 retries, then static highlight). The retry counter never incremented, so the static-highlight fallback never engaged.
- Caught by Codex P1 review on PR #45.

## Root Cause

- Direct cause: `.onboarding-overlay` had `pointer-events: none` (so it would not block taps on the underlying UI). A click handler attached *to that overlay* therefore never received target events for non-CTA taps — pointer-events: none means the element is not the event target at all, and there is no bubble path through it.
- Structural cause: confusing two different goals — "let pointer events pass to elements below" and "still observe pointer events on this layer".

## Fix or Recovery

- Move the off-target detection listener to the document level (capture-phase `pointerdown`), and ignore the CTA / help / sound-modal targets there.
- Commit: `c48f9fa fix(onboarding): address P1 review on PR #45`.

## Prevention Rule

- An overlay that uses `pointer-events: none` cannot be the target of bubbling pointer or mouse events. If the overlay still needs to *observe* user input (e.g., to count off-target taps), attach the listener to `document` (capture phase) and filter by target, not to the overlay itself.

## Harness Target

- Add to `docs/spec-command-patterns.md` overlay/UI checklist: when `pointer-events: none` is set on an overlay, list which selectors the overlay is supposed to "see" and confirm the listener is on `document`, not the overlay.

## Repetition Signal

- first occurrence | related to: any future overlay-style guide/highlight feature.

## Related Sources

- Files: `src/styles/components/onboarding.css`, `src/features/onboarding/index.js`
- Spec: `S-023 First-entry onboarding` (사용자 일탈 처리 — 최대 3회 retry)
- PR: #45, commit `c48f9fa`
