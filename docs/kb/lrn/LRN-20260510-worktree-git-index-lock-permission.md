# LRN-20260510 Worktree Git Index Lock Permission

## Symptom

- While committing the ADR/LRN harness work, `git add` failed with:
  - `fatal: Unable to create 'D:/git/arin/my-fishbowl/.git/worktrees/feat-adr-lrn-kb-harness/index.lock': Permission denied`
- The failure happened in the worktree at `D:\git\arin\my-fishbowl\.worktrees\feat-adr-lrn-kb-harness`.

## Root Cause

- Direct cause: Git needed to create `index.lock` in the shared `.git/worktrees/...` metadata directory, but the sandboxed command lacked permission.
- Structural cause: This Windows worktree stores Git metadata outside the worktree directory, so normal workspace-write access can be enough for files but insufficient for staging and commit metadata.

## Fix or Recovery

- Re-run the same targeted `git -c safe.directory=... add ...` command with explicit elevated permission.
- Stage only the intended paths and verify with `git status --short` plus `git diff --cached --stat` before committing.
- Leave unrelated untracked files, such as `docs/prompt/`, untouched.

## Prevention Rule

- In this worktree layout, treat `index.lock: Permission denied` during staging or commit as Git metadata permission friction; retry the same narrow Git command with approval instead of changing files, deleting locks, or broadening the staged scope.

## Harness Target

- Candidate target document, checklist, script, or skill: `.claude/skills/extract_knowledge/SKILL.md` or `docs/spec-command-patterns.md` if this staging failure recurs.

## Repetition Signal

- repeated | related to: Windows worktree and shared `.git` metadata permission friction noted in prior project guidance.

## Related Sources

- Files: `.claude/skills/extract_knowledge/SKILL.md`, `.claude/commands/extract_knowledge.md`, `docs/kb/README.md`, `docs/spec/S-020-adr-lrn-kb-harness.md`
- Spec: `S-020 ADR/LRN KB Harness`
- Commit: `157cade Add ADR LRN knowledge extraction harness`
