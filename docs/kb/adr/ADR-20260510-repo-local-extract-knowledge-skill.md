# ADR-20260510 Repo Local Extract Knowledge Skill

## Status

- accepted

## Context

- S-020 introduces an ADR/LRN knowledge base and a skill-driven workflow for extracting durable project knowledge.
- The design initially left the skill installation location open: repository-local skill files or user-level Codex/Claude skill installation.
- The user decided the skill should live in the current project under `.claude/skills`, be named `extract_knowledge`, work through `/extract_knowledge`, and remain usable by both Claude and Codex.

## Decision

- Store the ADR/LRN extraction skill at `.claude/skills/extract_knowledge/SKILL.md`.
- Expose Claude slash-command entry through `.claude/commands/extract_knowledge.md`.
- Keep the same `SKILL.md` directly readable by Codex so the workflow is shared instead of duplicated across tools.

## Alternatives Considered

- User-level Codex skill under `C:\Users\jhchoi\.codex\skills`: easier for Codex global discovery, but not project-scoped and less portable with this repository.
- Separate Claude and Codex skill files: possible, but creates drift risk between the two agents' ADR/LRN recording rules.
- Two separate skills for collection and harness improvement planning: clearer separation, but unnecessary for the initial repo-local harness and harder to invoke through one slash command.

## Consequences

- Positive: The project carries its own knowledge-extraction workflow and Claude/Codex can follow the same source file.
- Tradeoff: Codex may need to be explicitly pointed at `.claude/skills/extract_knowledge/SKILL.md` because this is not installed under the global Codex skill directory.
- Follow-up: If this pattern is reused across repositories, consider a separate spec for publishing or syncing the skill to a user-level or plugin-level location.

## Scope

- Applies to: this repository's ADR/LRN extraction workflow, S-020, and the `/extract_knowledge` command.
- Does not apply to: runtime product features or automatic governance document edits.

## Related Sources

- `SPEC.md`
- `docs/spec/S-020-adr-lrn-kb-harness.md`
- `ARCHITECTURE.md`
- `.claude/skills/extract_knowledge/SKILL.md`
- `.claude/commands/extract_knowledge.md`
- Commit: `157cade Add ADR LRN knowledge extraction harness`
