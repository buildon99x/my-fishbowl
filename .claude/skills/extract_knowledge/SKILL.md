---
name: extract_knowledge
description: "Extract ADR/LRN knowledge from the current my-fishbowl work session into docs/kb. Use when the user runs /extract_knowledge, asks to record architecture decisions, collect failure learnings, write ADR or LRN records, review repeated ADR/LRN patterns, or plan harness improvements from accumulated knowledge. Compatible with Claude and Codex: read this SKILL.md directly and follow the repository source-of-truth order before writing files."
---

# Extract Knowledge

Extract durable decisions and repeated-failure learnings from the current work session, then record only confirmed knowledge under `docs/kb`.

## Source Order

Read these first, in order:

1. `AGENTS.md`
2. `SPEC.md`
3. `ARCHITECTURE.md`
4. `Claude.md`
5. `docs/spec-command-patterns.md`
6. Relevant `docs/spec/*.md`
7. Existing `docs/kb/adr/*.md`, `docs/kb/lrn/*.md`, `docs/kb/harness-improvements/*.md`
8. Legacy `docs/learn/*.md` only when it is relevant to the current failure or workflow

## Modes

Choose the mode from the user request:

| Request | Mode |
| --- | --- |
| `/extract_knowledge`, "extract knowledge", "ADR/LRN 남겨줘" | Collect and record candidates |
| "ADR만", "decision record" | ADR only |
| "LRN만", "failure learning" | LRN only |
| "harness improvement", "반복 패턴", "kb에서 개선 계획" | Harness Improvement Plan |

If the request is ambiguous, default to collecting ADR and LRN candidates from the current session.

## Recording Threshold

Record only high-value knowledge.

ADR candidates:
- Architecture boundary decisions.
- Spec scope decisions that affect future work.
- Implementation approach choices with meaningful alternatives.
- Verification strategy choices.
- Risky Git or workflow decisions.
- Source-of-truth or governance decisions.

LRN candidates:
- Wrong dev server or browser validation target.
- Missed or duplicate UI entrypoint.
- Missing tests, lint, cleanup, or build verification.
- Git workflow mistakes.
- Requirement or spec-scope misread.
- Repeated Windows, Vite, worktree, or permission friction with a prevention rule.

Reject:
- One-off transient errors with no prevention rule.
- Low-value style choices.
- Duplicates that add no new rule.
- Unapproved governance changes.
- Anything already fully covered by an existing ADR/LRN.

## Workflow

1. Inspect the current diff and relevant docs.
2. Build a candidate list with this shape:
   - type: ADR or LRN
   - title:
   - evidence:
   - decision or learning:
   - prevention rule, for LRN:
   - related files:
   - recommended target path:
3. De-duplicate candidates against existing `docs/kb` and legacy `docs/learn`.
4. If the user explicitly asked to record knowledge, write the files. Otherwise summarize candidates and ask for confirmation before writing.
5. For every written file, use the templates below and keep one concept per file.
6. Do not modify `AGENTS.md`, `Claude.md`, `docs/spec-command-patterns.md`, or scripts from this skill alone. Use a Harness Improvement Plan and a ready spec first.

## Paths

Use these paths:

- ADR: `docs/kb/adr/ADR-YYYYMMDD-short-title.md`
- LRN: `docs/kb/lrn/LRN-YYYYMMDD-short-title.md`
- Harness Improvement Plan: `docs/kb/harness-improvements/HIP-YYYYMMDD-short-title.md`

Use the current local date. Use lowercase ASCII slugs.

## ADR Template

```markdown
# ADR-YYYYMMDD Short Title

## Status

- accepted

## Context

- What situation required a decision?
- Which spec, architecture boundary, workflow, or PR did it affect?

## Decision

- What was decided?

## Alternatives Considered

- Option A:
- Option B:

## Consequences

- Positive:
- Tradeoff:
- Follow-up:

## Scope

- Applies to:
- Does not apply to:

## Related Sources

- `SPEC.md`
- `docs/spec/<ID>.md`
- Other files:
```

## LRN Template

```markdown
# LRN-YYYYMMDD Short Title

## Symptom

- What went wrong?
- Where was it observed?

## Root Cause

- Direct cause:
- Structural cause:

## Fix or Recovery

- What changed or what should be done next time?

## Prevention Rule

- One actionable rule that future agents can follow.

## Harness Target

- Candidate target document, checklist, script, or skill:

## Repetition Signal

- first occurrence | repeated | related to:

## Related Sources

- Files:
- Spec:
- PR/commit if available:
```

## Harness Improvement Plan Template

```markdown
# HIP-YYYYMMDD Short Title

## Status

- proposed

## Source ADR/LRN Files

- `docs/kb/adr/...`
- `docs/kb/lrn/...`

## Repeated Pattern Summary

- Pattern:
- Evidence:
- Affected workflow phase:

## Proposed Harness Change

- Change:
- Target document or script:
- Expected benefit:

## Risk or Over-Automation Concern

- Risk:
- Mitigation:

## Priority

- high | medium | low

## User Approval Required

- yes

## Spec Conversion

- Candidate spec ID:
- Suggested scope:
- Out of scope:
```

## Output

When complete, report:

- Created files.
- Candidates rejected and why, if important.
- Whether any HIP or future spec is recommended.
- Verification performed.
