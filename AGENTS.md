# AGENTS.md

## Source of Truth
- Agent task execution rules: this file
- Product requirements and acceptance criteria: `SPEC.md`
- Architecture boundaries and technical constraints: `ARCHITECTURE.md`
- Supplemental workflow/context notes: `Claude.md`

## Priority on Conflict
`AGENTS.md` > `SPEC.md` > `ARCHITECTURE.md` > `Claude.md`

## Working Rules
- Implement only requirements that are explicitly defined in `SPEC.md`.
- Meet acceptance criteria before considering a task complete.
- Preserve architectural boundaries described in `ARCHITECTURE.md`.
- If requirements are ambiguous or conflicting, follow priority order and document the decision in the PR.

## Standard Commands
- Install: `npm ci`
- Dev: `npm run dev`
- Build: `npm run build`
- Test: `npm test`

## PR Rules
- Summarize implemented scope against `SPEC.md` acceptance criteria.
- Call out architecture-impacting changes explicitly.
- Keep PR scope focused and minimal.
