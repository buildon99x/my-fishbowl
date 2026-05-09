# AGENTS.md

## Source of Truth
- Agent task execution rules: this file
- Product requirements and acceptance criteria: `SPEC.md`
- Architecture boundaries and technical constraints: `ARCHITECTURE.md`
- Default workflow instructions: `Claude.md`
- Supplemental reusable command/checklist notes: `docs/spec-command-patterns.md`

## Priority on Conflict
`AGENTS.md` > `SPEC.md` > `ARCHITECTURE.md` > `Claude.md` > `docs/spec-command-patterns.md`

## Working Rules
- Treat `Claude.md` as Codex's default repository workflow guide. Follow its workflow unless a higher-priority source above conflicts.
- Implement only requirements that are explicitly defined in `SPEC.md`.
- Meet acceptance criteria before considering a task complete.
- Preserve architectural boundaries described in `ARCHITECTURE.md`.
- If requirements are ambiguous or conflicting, follow priority order and document the decision in the PR.

## Default Codex Workflow
1. Check `SPEC.md` for the current task ID, status, scope, and acceptance criteria.
2. Read the matching detail document under `docs/spec/` before implementation.
3. Implement only specs marked `ready`; keep `draft`, `blocked`, or unrelated specs out of scope.
4. Check `ARCHITECTURE.md` before adding files, moving code, or changing module boundaries.
5. Check relevant `docs/learn/*.md` notes before repeating similar workflow, UI, browser-validation, or Git changes.
6. Use `docs/spec-command-patterns.md` for repeatable spec-writing, spec-review, implementation, completion, browser-validation, and UI-entrypoint checklists.
7. After implementation, verify against the spec acceptance criteria and record completion status where the spec requires it.

## Standard Commands
- Install: `npm ci`
- Dev: `npm run dev`
- Build: `npm run build`
- Test: `npm test`

## PR Rules
- Summarize implemented scope against `SPEC.md` acceptance criteria.
- Call out architecture-impacting changes explicitly.
- Keep PR scope focused and minimal.
