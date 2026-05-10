---
name: ux_review
description: Review the user experience of a recent change set (current branch, a PR, or a spec) from the project's target-user perspective. Use when the user asks for a UX review, UX 리뷰, "사용자 경험 리뷰", or types /ux_review.
---

# UX Review

Review pending or recently merged changes from the **target user's** perspective, not from a code-quality perspective.

This skill is complementary to `/review` (general code review) and `/security-review` (security). It focuses on perceived experience: friction, ambiguity, age/literacy fit, accessibility, motion safety, error recovery, and reward/feedback completeness.

## Invocation

- `/ux_review` — review the current branch's pending diff vs. its base.
- `/ux_review <PR#>` — review a specific GitHub PR.
- `/ux_review <spec-id>` — review a specific spec implementation (e.g. `S-023`).

## Source Order

Read these first, in the order most relevant to the target:

1. The repo `README.md` and any `DESIGN.md` to learn the **target user persona** (age, literacy, device, accessibility constraints).
2. The spec(s) being reviewed under `docs/spec/<ID>-*.md`. Pay special attention to:
   - "사용자 흐름" / "User flow"
   - "UX 리뷰 결정 사항" / "UX review decisions"
   - "안전 가드" / "Safety guards" (motion, contrast, hit area, audio caps)
   - "검증 기준" / "Acceptance criteria"
3. The actual diff (via `git diff`, `gh pr diff`, or MCP `pull_request_read`).
4. CSS and view files to inspect hit-target sizes, color contrast hints, motion timings, prefers-reduced-motion handling.
5. Existing UX-relevant `docs/kb/lrn/*.md` to avoid re-reporting known patterns.

If the project has no DESIGN.md or persona doc, **infer the persona from spec language** (e.g. mentions of "4–8세", "어린이", "부모", "글 못 읽는", "어린이 청각 보호") and state the inferred persona in the report.

## Review Lenses

For each change, evaluate through these lenses. Skip lenses that don't apply.

| Lens | What to check |
| --- | --- |
| First-impression clarity | Within 3s of seeing the screen, does the target user know what to do next? Is there an unambiguous primary action? |
| Literacy/age fit | If the target is pre-literate or low-literacy, is meaning carried by icons, animation, sound, or shape — not text? |
| Hit target & ergonomics | Are all interactive targets ≥ the spec-defined min (often 48×48 for adults, 56×56+ for children)? Spacing? |
| Motion & sensory safety | Flicker < 3 Hz? `prefers-reduced-motion` honored? Audio capped (e.g. ≤ 0.7 master)? Haptic optional? |
| Feedback completeness | Every user action gets visible, audible, or haptic feedback within 100 ms? Multi-channel coverage? |
| Reward / emotional arc | For "magic" moments: does the experience emotionally complete (anticipation → payoff → afterglow)? Is the afterglow protected from being cut off? |
| Error & recovery | If the user taps the "wrong" thing, does the system shame, ignore, or gently guide? Is there a path back without parent help? |
| Persistence & re-entry | On reload, are user choices honored? Does onboarding re-trigger inappropriately? |
| Cross-spec coherence | Do related specs (e.g. sound/onboarding/magic-moment) hand off cleanly? Any double-fires, missed triggers, or ordering gaps? |
| Parent-area separation | Are parent-level controls (volume, opt-outs, reset) reachable without exposing children to risky options? |

## Output Format

Produce a single Markdown report with this structure. Keep each entry tight — one sentence of evidence + one of recommendation per finding.

```markdown
# UX Review — <PR# or spec ID or branch>

## Target persona
- Inferred from: <where>
- Primary user: <description>
- Secondary user: <e.g. parent>
- Device & context: <e.g. tablet, no-keyboard, often shared>

## Verdict
- Overall: shippable / needs follow-up / blocking
- One-line summary:

## Findings

### 🚨 Blocking (target user cannot succeed)
- **[lens]** <one-line evidence>. → Recommendation: <one-line>.

### ⚠️ Should-fix (degrades intended experience)
- **[lens]** <evidence>. → <recommendation>.

### 💡 Nice-to-have (polish)
- **[lens]** <evidence>. → <recommendation>.

## Strengths worth keeping
- <one-line>

## Spec acceptance-criteria coverage
- ✅ <criterion that the implementation clearly meets>
- ⚠️ <criterion that is partial or ambiguous>
- ❌ <criterion not yet met> → <where to add>

## Suggested follow-up specs / KB entries
- <if any pattern is reusable, propose a new LRN/ADR/spec>
```

## Workflow

1. Resolve target: branch HEAD vs. base, PR number, or spec ID. Determine the diff scope.
2. Identify the affected specs (file paths under `src/features/<feature>/` map to `docs/spec/S-*-<feature>.md` if present).
3. Read persona + specs in the order above. State the inferred persona before doing anything else.
4. For each lens, walk the user flow mentally as the target user and note frictions. Don't editorialize about code quality — that's `/review`.
5. Cross-check each spec's "검증 기준" / acceptance criteria. Mark each ✅ / ⚠️ / ❌ with the file:line that supports the verdict.
6. Skim existing `docs/kb/lrn/*.md` so you don't re-report a known pattern as a new finding (instead, cite the LRN).
7. Write the report. If the user asked for a review only, do **not** open files for editing — just report.
8. Offer next steps: "want me to fix any of the ⚠️ items?" — do not auto-fix unless asked.

## Constraints

- **Do not** modify product code or CSS unless the user explicitly asks for a fix after seeing the report.
- **Do not** post the review to GitHub unless asked.
- Keep the report focused: target ≤ 30 findings total. If more, group by spec.
- Cite file:line for every finding so the author can navigate.
- If the project lacks a persona doc, the report's first responsibility is to make the inferred persona explicit so the author can challenge it.

## Reject

- Code-quality complaints (lint, naming, refactor) — those belong to `/review`.
- Security issues — those belong to `/security-review`.
- Bikeshed color/font preferences without spec backing.
