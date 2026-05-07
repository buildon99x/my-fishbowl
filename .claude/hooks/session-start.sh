#!/bin/bash
set -euo pipefail

# Only run in remote (Claude Code on the web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Install npm dependencies
echo "[session-start] Installing npm dependencies..."
cd "$CLAUDE_PROJECT_DIR"
npm install

# Check Claude.md is present and readable
CLAUDE_MD="$CLAUDE_PROJECT_DIR/Claude.md"
if [ -f "$CLAUDE_MD" ] && [ -r "$CLAUDE_MD" ]; then
  LINE_COUNT=$(wc -l < "$CLAUDE_MD")
  echo "[session-start] Claude.md loaded successfully (${LINE_COUNT} lines)."
else
  echo "[session-start] WARNING: Claude.md not found or not readable at $CLAUDE_MD" >&2
  exit 1
fi

# Validate linter (ESLint + knip)
echo "[session-start] Running lint (ESLint + knip)..."
npm run lint

# Validate tests
echo "[session-start] Running Vitest..."
npm run test
