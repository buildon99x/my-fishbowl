# LRN-20260510 Overlay Wiped By Parent Re-render

## Symptom

- Magic-moment clone, splash, and glow nodes were created during the fish registration handler but never appeared on screen for normal registrations.
- Only the delayed `onWelcoming` / `onBreathEnd` callbacks fired; the visual ritual was missing.
- Caught by Codex P1 review on PR #44.

## Root Cause

- Direct cause: the magic-moment overlay was appended as a child of the app root (`#app`). The `onRegister` handler in `bindFishInputEvents` calls `options.onRegister(draft)` (which kicks off the ritual and creates DOM nodes) and then synchronously calls the input panel's `render()` — which calls `renderApp` → sets `root.innerHTML = ...`, wiping every just-created child.
- Structural cause: long-lived UI overlays were attached to a DOM subtree that the app's render pipeline rebuilds wholesale on every state change.

## Fix or Recovery

- Move the overlay parent to `document.body` so it survives re-renders of `#app`.
- Defer the actual phase runner with `requestAnimationFrame` so the caller's synchronous re-render runs first; reserve the state phase synchronously so concurrent triggers still queue.
- Commit: `49acd12 fix(magic-moment): address P1 review on PR #44`.

## Prevention Rule

- Persistent UI layers (overlays, modals, toasts, drag ghosts) must be parented to `document.body` (or another element outside the app's render-replaced subtree). If creation is triggered from inside a handler that runs during a synchronous parent re-render, defer DOM work to `requestAnimationFrame` after the re-render commits.

## Harness Target

- Add a "DOM ownership" check to `docs/spec-command-patterns.md` "코드 수정 위치 맵": any new overlay/modal/ghost element must specify its parent and confirm that parent is not subject to `innerHTML =` re-render in `main.js` or any feature `view.js`.

## Repetition Signal

- first occurrence | related to: existing pattern in `main.js` where `renderApp` rewrites `root.innerHTML` for every state change (any future overlay feature is at risk).

## Related Sources

- Files: `src/features/magic-moment/index.js`, `src/main.js`, `src/features/fish-input/index.js`
- Spec: `S-021 Draw-to-Life Magic Moment`
- PR: #44, commit `49acd12`
