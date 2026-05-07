#!/bin/bash
# PostToolUse hook: auto-run `eslint --fix` on JS files under src/ after edits.
# Receives the tool-call payload as JSON on stdin.
set -uo pipefail

payload=$(cat)
file=$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty')

# Only act on .js files inside src/
case "$file" in
  *"/src/"*.js) ;;
  *) exit 0 ;;
esac

[ -f "$file" ] || exit 0

cd "$CLAUDE_PROJECT_DIR" || exit 0
npx eslint --fix --quiet "$file" >/dev/null 2>&1 || true
exit 0
