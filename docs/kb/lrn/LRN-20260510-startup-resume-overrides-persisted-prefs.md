# LRN-20260510 Startup "Resume" Path Overrides Persisted Granular Preferences

## Symptom

- Codex P1 review on PR #46: persisted sound settings with `masterEnabled: true` and ambient enabled but other categories deliberately disabled (e.g. user opted out of UI/interaction/magic categories) get silently re-enabled on every page reload.
- Effect: per-category preferences are not actually preserved across reloads.

## Root Cause

- Direct cause: `initApp` in `src/main.js` calls `appState.sound.acceptSoundOnboarding()` whenever `masterEnabled && categories.ambient.enabled` is true on load. That helper is the *first-time-onboarding accept* path — internally it runs `enableAllCategories(settings, true)`, which forces every category enabled.
- Structural cause: a single helper conflated two flows — "user just clicked '소리 켜기' for the first time" (legitimately turns everything on) and "we're loading and the user already had sound on" (must respect granular settings).

## Fix or Recovery

- Replace the startup call with a granular "resume audio" path that only does what's needed on reload: `await engine.resume()` and `engine.startAmbient()` if the persisted state already has it enabled. Leave the `enableAllCategories` step for the actual modal accept.
- Will land as a follow-up commit on PR #46 / s023 PR.

## Prevention Rule

- Keep first-time-onboarding helpers (`acceptX`, `dismissX`) separate from resume/restore helpers. If you find yourself calling an onboarding-accept helper from a startup branch, that is a smell: write a dedicated "resume from persisted state" path that does not mutate persisted granular settings.

## Harness Target

- Add to `docs/spec-command-patterns.md` settings-feature checklist: any settings feature with first-time onboarding must list two startup paths — "first time" and "resume" — and verify persisted fine-grained state survives a full reload.

## Repetition Signal

- first occurrence | related to: any future spec with localStorage-backed user preferences (S-022 sound, S-013 prop-panel position, S-023 onboarding completion).

## Related Sources

- Files: `src/main.js`, `src/features/sound/index.js`, `src/features/sound/state.js`
- Spec: `S-022 Sound system` (검증 기준: 음소거 상태가 새로고침 후 복원된다)
- PR: #46 (review by chatgpt-codex-connector at line `src/main.js:376`)
