# Knowledge Base

This directory stores durable project knowledge extracted from working sessions.

## Directories

| Path | Purpose |
| --- | --- |
| `adr/` | Architecture Decision Records: durable decisions about architecture, scope, workflow, verification, or risky Git strategy. |
| `lrn/` | Learning Records: failures, mistakes, repeated friction, and prevention rules. |
| `harness-improvements/` | Harness Improvement Plans derived from repeated ADR/LRN patterns. |

## Relationship To `docs/learn`

`docs/learn` is the legacy failure-record location and remains readable context. New high-value learning records should be written to `docs/kb/lrn` unless a specific workflow still asks for `docs/learn`.

## Operating Rule

Collect candidates during work. Record files only when the user requests recording or confirms the proposed ADR/LRN candidates.
