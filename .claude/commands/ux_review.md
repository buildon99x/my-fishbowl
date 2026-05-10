---
description: Review the recent change set from the target user's perspective
argument-hint: "[PR# | spec-id | branch-name]"
---

Use the project skill at `.claude/skills/ux_review/SKILL.md`.

Resolve the review target from the argument:

- `<PR#>` (e.g. `46`): review that GitHub PR via the MCP github tools.
- `<spec-id>` (e.g. `S-023`): review the implementation of that spec on the current branch.
- `<branch-name>`: review that branch's diff vs. its base.
- no argument: review the current branch's pending diff vs. its base.

Follow the source order in the skill: persona → spec → diff → CSS/views → existing LRN.

Produce one Markdown report with the structure defined in the skill — do not modify product code, do not post to GitHub. After reporting, ask the user whether to fix any ⚠️ items.
