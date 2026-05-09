# ADR/LRN KB Harness And Skill Design Prompt

Use the following prompt to request a design for collecting ADR/LRN records into `docs/kb`, and for designing skills that use those records to improve the project harness.

```text
Current repository: `D:\git\arin\my-fishbowl`

Design a Harness and Codex Skill set for collecting architecture decisions and failure learnings from the current Codex/Claude work session, then recording them under `docs/kb`.

First read and follow these documents in priority order:

1. `AGENTS.md`
2. `SPEC.md`
3. `ARCHITECTURE.md`
4. `Claude.md`
5. `docs/spec-command-patterns.md`
6. Relevant `docs/learn/*.md`

Goal:
- Collect important decisions that happen during a session as ADR records.
- Collect failures, mistakes, repeated friction, and prevention rules as LRN records.
- Store ADR/LRN records under `docs/kb`.
- Clarify how this relates to the existing `docs/learn` workflow without creating duplicate or conflicting sources of truth.
- Before implementation, produce a design document and implementation plan for the Harness and Skills.

Design scope:

1. ADR collection Harness
   - Define what counts as an ADR candidate.
   - Examples: architecture boundary decisions, spec scope decisions, implementation approach choices, verification strategy choices, risky Git/workflow decisions.
   - Design how ADR candidates are detected and temporarily tracked during a session.
   - Propose the final file naming and template format under `docs/kb/adr/`.

2. LRN collection Harness
   - Define what counts as an LRN candidate.
   - Examples: wrong dev server port validation, missed UI entrypoint, missing tests, Git workflow mistakes, requirement misread, repeatable workflow failure.
   - Design a process that turns failures into prevention rules, not just retrospectives.
   - Propose the final file naming and template format under `docs/kb/lrn/`.

3. ADR/LRN collection Skill design
   - Design the role, trigger conditions, inputs, outputs, and checklist for a Codex Skill.
   - Define what the Skill should do at session start, during work, and before session end.
   - Include filtering rules so the Skill does not record low-value noise.
   - Explain how the Skill connects to the existing `SPEC.md`, `docs/spec/`, `docs/learn/`, and `docs/spec-command-patterns.md` workflow.

4. ADR/LRN-based Harness improvement planning Skill design
   - Also design a Skill that reads accumulated records from `docs/kb/adr/` and `docs/kb/lrn/` and produces Harness improvement plans.
   - This Skill should not merely summarize records. It should detect repeated decision and failure patterns and convert them into proposed improvements such as:
     - Work rules for `AGENTS.md` or `Claude.md`
     - Checklist additions for `docs/spec-command-patterns.md`
     - Template improvements for `docs/learn` or `docs/kb/lrn`
     - Spec writing/review/implementation/verification Harness improvements
     - Candidate automation scripts or command patterns
   - The Skill must not directly modify ADR/LRN records or apply workflow changes by itself.
   - First generate an improvement plan document.
   - Consider storing plans under `docs/kb/harness-improvements/`.
   - Suggested names: `HIP-YYYYMMDD-short-title.md` or `harness-improvement-YYYYMMDD.md`.
   - Each improvement plan must include:
     - Source ADR/LRN file list
     - Repeated pattern summary
     - Proposed Harness change
     - Target document or script
     - Expected benefit
     - Risk or over-automation concern
     - Priority
     - Whether user approval is required
   - Define Skill trigger conditions:
     - Run when the user asks things like "improve the harness from ADR/LRN", "review failures and plan workflow improvements", or "find repeated patterns in kb".
     - Also propose a manual cadence, such as running after a certain number of LRN records accumulate.
   - The Skill should write a plan first, then wait for user approval.
   - If actual Harness changes are needed, connect them to the existing `SPEC.md` workflow by creating a new spec chunk and implementing only after it becomes `ready`.

5. Storage structure proposal
   - `docs/kb/README.md`
   - `docs/kb/adr/_template.md`
   - `docs/kb/adr/ADR-YYYYMMDD-short-title.md`
   - `docs/kb/lrn/_template.md`
   - `docs/kb/lrn/LRN-YYYYMMDD-short-title.md`
   - `docs/kb/harness-improvements/_template.md`
   - `docs/kb/harness-improvements/HIP-YYYYMMDD-short-title.md`
   - If needed, propose `docs/kb/session-notes/` or another temporary candidate collection structure.

6. Operating flow
   - Session start checklist
   - Candidate collection rules during work
   - Before-final-response ADR/LRN confirmation step
   - PR body rules for summarizing ADR/LRN changes
   - Minimum recording threshold to avoid too many documents
   - Process for turning repeated ADR/LRN patterns into a Harness Improvement Plan
   - Process for turning an approved Harness Improvement Plan into a new spec chunk

Important constraints:
- Do not implement runtime product features yet.
- Design the spec chunk first.
- If needed, propose adding a new spec ID to `SPEC.md`, with detailed requirements in a separate file such as `docs/spec/<ID>-kb-harness.md`.
- Avoid conflicts with the existing documentation system.
- Decide and justify whether `docs/learn` remains the existing failure-record location, whether it should migrate into `docs/kb/lrn`, or whether the two should have separate roles.
- Prefer conservative automation. Evaluate "candidate collection + end-of-session confirmation + explicit recording" before full automatic recording.
- Do not let the Harness improvement Skill directly edit governance documents without user approval and a ready spec.

Deliverables:
- Recommended architecture
- Directory structure
- ADR template draft
- LRN template draft
- ADR/LRN collection Skill `SKILL.md` draft
- ADR/LRN-based Harness improvement planning Skill `SKILL.md` draft
- `docs/kb/harness-improvements/` structure proposal
- Harness Improvement Plan template draft
- Harness operating flow
- ADR/LRN repeated-pattern-to-spec workflow
- Integration with existing repository documents
- Questions to confirm before implementation
- Draft implementation spec

End with this exact structure:

## Recommendation
Provide the most conservative and maintainable design.

## Files To Add or Change
List expected files in a table.

## Open Questions
List only questions that must be answered before implementation.

## Next Step
Suggest which spec document to create and the implementation order after user approval.
```
