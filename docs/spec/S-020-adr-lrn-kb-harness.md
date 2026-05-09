# S-020 ADR/LRN KB Harness

## 상태

- 상태: draft
- 구현 여부: not-started
- 검증 여부: not-tested

## 목표

- 세션 중 발생하는 중요한 아키텍처 결정과 반복 가능한 실행착오를 `docs/kb` 아래에 ADR/LRN 지식 기록으로 남기는 하네스를 설계한다.
- 기존 `docs/learn` 기반 실행착오 기록과 충돌하지 않도록 역할을 분리하고, 점진 전환 경로를 둔다.
- Codex Skill 두 개를 설계한다.
  - ADR/LRN collection Skill: 세션 중 후보를 모으고 종료 전 사용자 확인을 거쳐 기록한다.
  - Harness improvement planning Skill: 누적 ADR/LRN에서 반복 패턴을 찾아 하네스 개선 계획을 만든다.
- 승인 전 자동 기록이나 governance 문서 자동 수정은 도입하지 않는다.
- Skill은 현재 프로젝트의 `.claude/skills/extract_knowledge/SKILL.md`에 두고, Claude slash command `/extract_knowledge`는 `.claude/commands/extract_knowledge.md`에서 같은 Skill을 호출한다.

## 범위

- 포함:
  - `docs/kb` 저장 구조 설계.
  - ADR/LRN 후보 판정 기준과 기록 임계값.
  - ADR/LRN 템플릿 초안.
  - ADR/LRN collection Skill `SKILL.md` 초안.
  - ADR/LRN 기반 Harness improvement planning Skill `SKILL.md` 초안.
  - Harness Improvement Plan 템플릿 초안.
  - 기존 `SPEC.md`, `docs/spec/`, `docs/learn/`, `docs/spec-command-patterns.md`, `AGENTS.md`, `Claude.md`와의 연결 방식.
  - 승인된 Harness Improvement Plan을 새 spec chunk로 전환하는 흐름.
- 제외:
  - runtime product feature 구현.
  - 자동 ADR/LRN 작성.
  - `AGENTS.md`, `Claude.md`, `docs/spec-command-patterns.md` 직접 변경.
  - 기존 `docs/learn/*.md` 일괄 이동.
  - 프로젝트 밖 Codex/Claude 전역 Skill 설치.

## 권장 아키텍처

### 문서 역할

| 문서/디렉터리 | 역할 |
| --- | --- |
| `AGENTS.md` | 에이전트 실행 우선순위와 작업 규칙. 변경은 사용자 승인과 ready spec 뒤에만 수행한다. |
| `SPEC.md` | spec index와 상태 추적. ADR/LRN 하네스 구현도 새 spec row로 관리한다. |
| `docs/spec/` | 구현 가능한 요구사항 상세. 본 S-020이 ADR/LRN 하네스 구현 전 설계 spec이다. |
| `docs/learn/` | 기존 실행착오 기록 위치. 당장은 유지한다. |
| `docs/kb/adr/` | 승인된 아키텍처/워크플로 결정 기록. |
| `docs/kb/lrn/` | 승인된 실행착오와 예방 규칙 기록. |
| `docs/kb/harness-improvements/` | ADR/LRN 반복 패턴에서 도출한 하네스 개선 계획. |
| `docs/spec-command-patterns.md` | 반복 작업 체크리스트와 명령 패턴. HIP 승인 뒤 필요한 항목만 반영한다. |

### `docs/learn`와 `docs/kb/lrn` 관계

- `docs/learn`은 기존 source를 유지한다. 현재 문서와 체크리스트가 이미 이 경로를 참조하기 때문이다.
- `docs/kb/lrn`은 새 표준 기록 위치로 설계한다.
- 전환 기간에는 다음 규칙을 사용한다.
  - 새 실행착오 기록은 사용자 승인 후 `docs/kb/lrn/LRN-YYYYMMDD-short-title.md`에 작성한다.
  - 기존 workflow가 `docs/learn`을 요구하면 `docs/learn/<YYYY-MM-DD>-<topic>.md`에 짧은 forwarding note를 둘 수 있다.
  - S-020 구현 단계에서는 기존 `docs/learn`을 대량 이동하지 않는다.
  - 충분히 안정화된 뒤 별도 spec에서 `docs/spec-command-patterns.md`와 `Claude.md`의 참조를 `docs/kb/lrn` 중심으로 갱신한다.

### 보수적 자동화 원칙

- 세션 중에는 후보만 모은다.
- 최종 응답 전 또는 사용자가 요청할 때만 기록 후보를 요약하고 확인한다.
- 파일 작성은 명시 승인 뒤에만 한다.
- governance 문서(`AGENTS.md`, `Claude.md`, `docs/spec-command-patterns.md`) 변경은 Harness Improvement Plan과 ready spec을 거친다.
- 반복 패턴 감지는 계획 문서까지만 자동화한다. 실제 하네스 변경은 별도 spec 구현이다.

## 디렉터리 구조 제안

```text
docs/
  kb/
    README.md
    adr/
      _template.md
      ADR-YYYYMMDD-short-title.md
    lrn/
      _template.md
      LRN-YYYYMMDD-short-title.md
    harness-improvements/
      _template.md
      HIP-YYYYMMDD-short-title.md
    session-notes/
      _template.md
      SESSION-YYYYMMDD-topic.md
```

- `session-notes/`는 선택 사항이다. 세션 중 후보를 파일로 임시 저장해야 할 때만 사용한다.
- 기본 운영은 에이전트가 대화 컨텍스트 안에서 후보를 추적하고, 승인된 후보만 `adr/` 또는 `lrn/`에 기록한다.

## ADR Collection Harness

### ADR 후보 기준

다음 중 하나 이상에 해당하고, 이후 작업자가 같은 결정을 반복해서 알아야 하면 ADR 후보로 본다.

- 아키텍처 경계 결정: 새 디렉터리, feature/module 책임, 저장소 위치, import 방향.
- spec scope 결정: 어떤 요구사항을 현재 spec에 넣고 어떤 것을 제외했는지.
- 구현 접근 선택: 대규모 refactor 대신 문서 하네스를 먼저 하기로 한 결정 등.
- 검증 전략 선택: 브라우저 검증 포트 fingerprint, strict/non-strict check 선택.
- 위험한 Git/workflow 결정: cherry-pick, worktree, squash, remote ahead 대응.
- 기존 source-of-truth 우선순위에 영향을 주는 결정.

### ADR 후보 제외 기준

- 단순 코드 스타일 선택.
- 한 번뿐인 로컬 환경 문제.
- 이미 `ARCHITECTURE.md`나 spec에 충분히 명시된 내용의 중복.
- 사용자 승인 없이 결정됐거나 아직 실험 중인 임시 판단.

### ADR 임시 추적

- 세션 중 후보 메모 형식:

```text
ADR candidate:
- decision:
- context:
- alternatives:
- consequence:
- source files:
- needs user confirmation: yes/no
```

- 한 세션에 후보가 3개를 넘으면 낮은 가치 후보는 합치거나 버린다.
- 후보가 governance 문서 변경을 요구하면 ADR 기록만 하고 변경은 HIP/spec으로 넘긴다.

### ADR 파일명

- `docs/kb/adr/ADR-YYYYMMDD-short-title.md`
- 예: `ADR-20260510-keep-docs-learn-as-legacy-source.md`

### ADR 템플릿 초안

```markdown
# ADR-YYYYMMDD Short Title

## Status

- accepted | proposed | superseded

## Context

- What situation required a decision?
- Which spec, architecture boundary, workflow, or PR did it affect?

## Decision

- The decision in one or two concrete bullets.

## Alternatives Considered

- Option A:
- Option B:

## Consequences

- Positive:
- Negative or tradeoff:
- Follow-up required:

## Scope

- Applies to:
- Does not apply to:

## Related Sources

- `SPEC.md`
- `docs/spec/<ID>.md`
- `ARCHITECTURE.md`
- Related PR/commit if available:
```

## LRN Collection Harness

### LRN 후보 기준

다음 중 하나 이상에 해당하고 재발 방지 규칙으로 바꿀 수 있으면 LRN 후보로 본다.

- 잘못된 dev server 포트나 browser target 검증.
- UI 진입점 누락, 중복 버튼, 보이지 않는 affordance.
- 테스트 누락, lint/cleanup 누락, build만 보고 동작을 단정한 경우.
- Git workflow 실수: 잘못된 base, remote ahead, 중단된 merge, staged scope 오류.
- 요구사항 오독: ready가 아닌 spec 구현, scope 밖 수정, resolved cleanup 재언급.
- 반복 가능한 환경 마찰: Windows safe.directory, Vite port collision 등.

### LRN 후보 제외 기준

- 원인과 예방 규칙이 불명확한 단순 에러 로그.
- 이미 LRN으로 기록돼 있고 새 예방 규칙이 없는 반복.
- 사용자에게 영향을 주지 않았고 재현 가능성도 낮은 임시 시행착오.

### LRN 처리 방식

1. 증상과 원인을 짧게 기록한다.
2. 실제 수정 또는 회피 방법을 적는다.
3. 다음 작업에서 사용할 예방 규칙으로 변환한다.
4. 예방 규칙을 넣을 후보 위치를 명시한다.
5. 반복 패턴이면 HIP 후보로 표시한다.

### LRN 파일명

- `docs/kb/lrn/LRN-YYYYMMDD-short-title.md`
- 예: `LRN-20260510-dev-server-port-fingerprint.md`

### LRN 템플릿 초안

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

- One actionable rule that can be copied into a checklist.

## Harness Target

- `docs/spec-command-patterns.md`
- `Claude.md`
- `AGENTS.md`
- `docs/kb/lrn/_template.md`
- Script or command pattern:

## Repetition Signal

- first occurrence | repeated | related to:

## Related Sources

- Files:
- Spec:
- PR/commit if available:
```

## ADR/LRN Collection Skill Draft

Path:

- `.claude/skills/extract_knowledge/SKILL.md`

```markdown
# My Fishbowl ADR/LRN Collector

Use this skill when working in `my-fishbowl` and the task may create architecture decisions, workflow decisions, repeated failures, or prevention rules.

## Sources To Read First

1. `AGENTS.md`
2. `SPEC.md`
3. `ARCHITECTURE.md`
4. `Claude.md`
5. `docs/spec-command-patterns.md`
6. Relevant `docs/kb/adr/*.md`, `docs/kb/lrn/*.md`, and legacy `docs/learn/*.md`

## Session Start

- Check the current spec ID and status in `SPEC.md`.
- Read the matching `docs/spec/<ID>.md` when implementation is requested.
- Skim relevant ADR/LRN records before repeating similar workflow or architecture changes.
- Start an in-memory candidate list for ADR and LRN items.

## During Work

- Add an ADR candidate when a durable decision changes architecture, workflow, scope, verification, or Git strategy.
- Add an LRN candidate when a mistake or friction has a clear prevention rule.
- Do not write ADR/LRN files during work unless the user explicitly asks.
- Do not record low-value noise, transient errors, or duplicates without a new prevention rule.

## Before Final Response

- If there are high-value candidates, summarize them briefly.
- Ask for confirmation before creating ADR/LRN files unless the user already requested recording.
- If recording is approved, use the templates in `docs/kb/adr/_template.md` and `docs/kb/lrn/_template.md`.
- Mention any recommended Harness Improvement Plan only as a follow-up unless requested.

## Output

- Candidate summary.
- Created ADR/LRN file paths, if any.
- Any proposed prevention rule target.

## Guardrails

- Never modify `AGENTS.md`, `Claude.md`, or `docs/spec-command-patterns.md` from this skill alone.
- Governance changes require a Harness Improvement Plan and a ready spec.
- Prefer one concise record over several overlapping records.
```

## Harness Improvement Planning Skill Draft

Path:

- `.claude/skills/extract_knowledge/SKILL.md`의 `Harness Improvement Plan` mode

```markdown
# My Fishbowl Harness Improvement Planner

Use this skill when the user asks to improve the harness from ADR/LRN records, review repeated failures, or find patterns in `docs/kb`.

## Inputs

- `docs/kb/adr/*.md`
- `docs/kb/lrn/*.md`
- Legacy `docs/learn/*.md` when relevant
- `AGENTS.md`
- `Claude.md`
- `docs/spec-command-patterns.md`
- `SPEC.md` and `docs/spec/`

## Trigger Conditions

- User asks: "improve the harness from ADR/LRN", "review failures and plan workflow improvements", or "find repeated patterns in kb".
- Manual cadence: run after 5 new LRN records, 3 related ADR records, or before a harness-focused PR.

## Process

1. List source ADR/LRN files.
2. Group repeated patterns by failure mode, decision type, or workflow phase.
3. Convert repeated patterns into candidate harness changes.
4. Evaluate risk of over-automation.
5. Write a Harness Improvement Plan under `docs/kb/harness-improvements/`.
6. Stop and wait for user approval.

## Output

- `docs/kb/harness-improvements/HIP-YYYYMMDD-short-title.md`
- The plan must include source files, repeated pattern summary, proposed change, target document or script, expected benefit, risk, priority, and approval requirement.

## Guardrails

- Do not directly edit ADR/LRN source records.
- Do not directly edit `AGENTS.md`, `Claude.md`, `docs/spec-command-patterns.md`, or scripts.
- If implementation is approved, create or update a `docs/spec/S-*.md` chunk first.
- Implement only after that spec is marked `ready`.
```

## Harness Improvement Plan Template Draft

```markdown
# HIP-YYYYMMDD Short Title

## Status

- proposed | approved | implemented | rejected

## Source ADR/LRN Files

- `docs/kb/adr/ADR-YYYYMMDD-...md`
- `docs/kb/lrn/LRN-YYYYMMDD-...md`

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

## 운영 흐름

### 세션 시작

1. `AGENTS.md` 우선순위를 확인한다.
2. `SPEC.md`에서 현재 작업과 상태를 확인한다.
3. 구현 요청이면 matching `docs/spec/<ID>.md`가 `ready`인지 확인한다.
4. 관련 `docs/kb/adr`, `docs/kb/lrn`, legacy `docs/learn`를 훑는다.
5. ADR/LRN 후보 목록을 세션 내부에서 시작한다.

### 작업 중

- durable decision이 생기면 ADR candidate로 둔다.
- 실패나 반복 마찰이 생기면 LRN candidate로 둔다.
- 후보마다 "나중에 같은 작업자가 이 기록을 읽으면 실제로 도움이 되는가?"를 통과해야 한다.
- 후보가 많으면 유사 항목을 합친다.

### 최종 응답 전

- high-value 후보가 있으면 1~3개만 요약한다.
- 사용자가 기록을 원하면 파일을 만든다.
- 사용자가 요청하지 않았으면 후보를 제안만 하고 자동 기록하지 않는다.

### PR 본문 규칙

- ADR/LRN 파일을 추가한 PR은 다음을 포함한다.
  - 생성한 ADR/LRN 경로.
  - 어떤 spec 또는 workflow 판단에서 나온 기록인지.
  - governance 문서 변경이 포함됐는지 여부.
  - HIP/spec 후속이 필요한지 여부.

### 기록 임계값

- ADR: 선택지가 있었고, 결과가 후속 구조나 workflow에 영향을 줄 때만 기록한다.
- LRN: 예방 규칙으로 바꿀 수 있고, 재발 가능성이 높을 때만 기록한다.
- 같은 날 같은 원인으로 2개 이상 기록하지 않는다. 하나의 LRN에 `Related Sources`를 추가한다.

## ADR/LRN 반복 패턴에서 Spec으로 가는 흐름

1. ADR/LRN 누적.
2. Harness improvement planning Skill 실행.
3. `docs/kb/harness-improvements/HIP-YYYYMMDD-short-title.md` 작성.
4. 사용자 승인.
5. `SPEC.md`에 새 spec row 추가.
6. `docs/spec/S-XXX-<short-title>.md` 작성.
7. spec이 `ready`가 된 뒤에만 governance 문서나 스크립트 변경 구현.
8. 검증 뒤 spec completion 기록.

## 구현 메모

- 관련 파일:
  - `SPEC.md`
  - `docs/spec/S-020-adr-lrn-kb-harness.md`
  - `docs/kb/README.md`
  - `docs/kb/adr/_template.md`
  - `docs/kb/lrn/_template.md`
  - `docs/kb/harness-improvements/_template.md`
  - optional `docs/kb/session-notes/_template.md`
  - `.claude/skills/extract_knowledge/SKILL.md`
  - `.claude/commands/extract_knowledge.md`
- `ARCHITECTURE.md` 기준으로 새 파일이나 디렉터리가 필요한지:
  - 구현 승인 시 `docs/kb/` 디렉터리를 문서 구조에 추가해야 한다.
  - Skill은 repo 내부 `.claude/skills/extract_knowledge`에 둔다.

## 검증 기준

- [ ] `docs/spec/S-020-adr-lrn-kb-harness.md`가 설계와 implementation plan을 포함한다.
- [ ] `docs/kb` 저장 구조가 설계되어 있다.
- [ ] ADR 템플릿 초안이 있다.
- [ ] LRN 템플릿 초안이 있다.
- [ ] `.claude/skills/extract_knowledge/SKILL.md`가 있고 Claude/Codex가 같은 절차를 읽을 수 있다.
- [ ] `.claude/commands/extract_knowledge.md`가 있어 Claude에서 `/extract_knowledge`로 진입할 수 있다.
- [ ] Harness Improvement Plan 템플릿 초안이 있다.
- [ ] `docs/learn`와 `docs/kb/lrn`의 관계가 명확하다.
- [ ] governance 문서 자동 수정 금지와 ready spec 필요 조건이 명시되어 있다.
- [ ] 구현 승인 뒤 추가/변경할 파일 목록이 정리되어 있다.
- [ ] 문서 변경 후 `npm run build`가 통과한다.

## Recommendation

가장 보수적이고 유지보수 가능한 설계는 `docs/learn`을 즉시 폐기하지 않고, `docs/kb/lrn`을 새 표준으로 도입하는 방식이다. 세션 중에는 후보만 수집하고, 종료 전 사용자 확인을 거쳐 기록한다. 누적 기록에서 하네스 개선이 필요하면 먼저 `docs/kb/harness-improvements`에 HIP 문서를 만들고, 사용자 승인 뒤 새 spec chunk로 전환한다.

## Files To Add or Change

| Path | Action | Purpose |
| --- | --- | --- |
| `SPEC.md` | change | Add S-020 index row as draft. |
| `docs/spec/S-020-adr-lrn-kb-harness.md` | add | Design document and draft implementation spec. |
| `docs/kb/README.md` | future add | Explain ADR/LRN/HIP storage roles. |
| `docs/kb/adr/_template.md` | future add | ADR record template. |
| `docs/kb/lrn/_template.md` | future add | LRN record template. |
| `docs/kb/harness-improvements/_template.md` | future add | Harness Improvement Plan template. |
| `docs/kb/session-notes/_template.md` | optional future add | Temporary candidate collection template if file-based candidate tracking is needed. |
| `ARCHITECTURE.md` | future change | Add `docs/kb` to documentation structure after implementation approval. |
| `Claude.md` | future change | Point future workflow to ADR/LRN reading only after approved implementation. |
| `docs/spec-command-patterns.md` | future change | Add ADR/LRN checklist only after HIP/spec approval. |
| `.claude/skills/extract_knowledge/SKILL.md` | add | Claude/Codex-compatible skill for ADR/LRN extraction and HIP planning. |
| `.claude/commands/extract_knowledge.md` | add | Claude slash command entrypoint for `/extract_knowledge`. |

## Open Questions

- `docs/learn`에 forwarding note를 남길지, 아니면 새 LRN은 `docs/kb/lrn`에만 두고 기존 참조 문서는 후속 spec에서 바꿀지 결정해야 한다.
- S-020 구현 단계에서 `docs/kb/session-notes/`까지 만들지, 초기에는 in-memory 후보 추적으로 충분한지 결정해야 한다.

## Next Step

사용자 승인 후 `S-020`을 `ready`로 바꾸고 다음 순서로 구현한다.

1. `docs/kb/README.md`, `adr/_template.md`, `lrn/_template.md`, `harness-improvements/_template.md`를 추가한다.
2. `ARCHITECTURE.md`에 `docs/kb` 문서 구조를 반영한다.
3. Skill 초안을 실제 설치 위치로 옮길지 결정하고, 결정된 위치에 `SKILL.md`를 작성한다.
4. 필요한 경우 `docs/spec-command-patterns.md`에는 ADR/LRN 확인 체크리스트만 최소 추가한다.
