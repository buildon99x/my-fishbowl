---
description: Extract ADR/LRN knowledge from the current work session into docs/kb
argument-hint: "[adr|lrn|hip|all] [optional focus]"
---

Use the project skill at `.claude/skills/extract_knowledge/SKILL.md`.

Run it for the current work session with the requested focus:

- `adr`: record architecture or workflow decisions only.
- `lrn`: record failure learnings and prevention rules only.
- `hip`: review accumulated ADR/LRN records and create a Harness Improvement Plan.
- `all` or no argument: collect ADR and LRN candidates from the current session and record high-value items when the user requested recording.

Follow `AGENTS.md` source-of-truth order. Do not modify governance documents directly. If a harness change is needed, create a HIP first and convert it to a ready spec before implementation.
