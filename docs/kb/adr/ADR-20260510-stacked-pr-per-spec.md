# ADR-20260510 Stacked PR Per Spec With Base Branch Chain

## Status

- accepted

## Context

- A single user request asked for sequential implementation of three dependent specs (S-022 sound system → S-021 magic moment → S-023 onboarding) with a separate PR per spec.
- The harness instruction also designated a single feature work branch (`claude/implement-specs-s022-s021-s023-2Rdd3`) for "develop and push final" — which appears to conflict with the per-PR-per-spec request.
- S-021 depends on S-022 (sound triggers); S-023 depends on both. A single PR against `main` per spec would either bundle dependencies or open PRs that lint-fail because the parent isn't yet merged.

## Decision

- Keep the designated work branch as the rolling integration branch where all three specs accumulate; commit and push there at the end of each spec.
- For each spec, additionally create a stacked PR branch: `claude/spec-s022-…`, `claude/spec-s021-…`, `claude/spec-s023-…`.
- Each stacked branch contains only its own spec commits (cherry-picked from the work branch).
- Base branches chain by dependency: S-022 PR → `main`; S-021 PR → S-022 branch; S-023 PR → S-021 branch.
- After the parent PR merges, the child PR is re-targeted to `main` (callout placed in PR body).
- Review-comment fixes land on the spec PR branch first, then are cherry-picked back to the integration work branch so both stay in sync.

## Alternatives Considered

- One PR with all three specs: simpler branching but loses per-spec review focus and violates the explicit user request.
- All three PRs against `main` directly: each child PR would carry the parent diff, inflating reviews and confusing diff stats.
- Open child PRs only after parent merges (sequential): blocks reviewers; user asked to "proceed without interruption".

## Consequences

- Positive: each PR shows only the diff for its own spec; reviewers can read in dependency order; parent fixes flow forward via cherry-pick.
- Tradeoff: re-targeting child PRs to `main` after parent merge is a manual step easy to forget. Two-way fix-sync (PR branch ↔ work branch) takes extra cherry-picks.
- Follow-up: if this pattern recurs, capture a checklist in `docs/spec-command-patterns.md` for "stacked PR per spec" including the re-target reminder.

## Scope

- Applies to: a single user request that bundles multiple dependent specs and asks for per-spec PRs.
- Does not apply to: independent specs (one PR per spec against `main` is enough), or single-spec sessions.

## Related Sources

- `SPEC.md`
- `docs/spec/S-021-magic-moment.md`, `docs/spec/S-022-sound-system.md`, `docs/spec/S-023-onboarding.md`
- PRs: #43 (S-022), #44 (S-021 → #43), #45 (S-023 → #44), #46 (rolling work branch)
