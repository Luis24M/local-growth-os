#!/usr/bin/env bash
#
# preflight.sh — local safety guard to run before committing.
# Backstop is the Gitleaks GitHub Action; this catches the obvious cases early.
#
# Usage:
#   scripts/preflight.sh            # check staged changes (default)
#   scripts/preflight.sh --all      # check all tracked files
#
set -euo pipefail

mode="staged"
[ "${1:-}" = "--all" ] && mode="all"

if [ "$mode" = "staged" ]; then
  files=$(git diff --cached --name-only --diff-filter=ACM)
else
  files=$(git ls-files)
fi

fail=0
note() { printf '  - %s\n' "$1"; }

# 1. Block private/raw data and env files from being committed.
blocked=$(printf '%s\n' "$files" | grep -E '(^|/)\.env($|\.)|^data/(private|raw)/|^secrets/|^credentials/' | grep -v '\.env\.example$' || true)
if [ -n "$blocked" ]; then
  echo "BLOCKED: private/secret paths are staged:"
  printf '%s\n' "$blocked" | while read -r f; do note "$f"; done
  fail=1
fi

# 2. Heuristic secret content scan on staged/tracked text.
patterns='-----BEGIN [A-Z ]*PRIVATE KEY-----|refresh_token|client_secret|GHL_PRIVATE_INTEGRATION_TOKEN=.+|AIza[0-9A-Za-z_-]{20,}|xox[baprs]-[0-9A-Za-z-]+|https://hooks\.[a-z]+\.com/|sk-[0-9A-Za-z]{20,}'
hits=""
for f in $files; do
  [ -f "$f" ] || continue
  case "$f" in
    *.example*|*.md|.env.example) continue;;
  esac
  if grep -EnI "$patterns" "$f" >/dev/null 2>&1; then
    hits="$hits\n$f"
  fi
done
if [ -n "$hits" ]; then
  echo "WARNING: possible secret content detected:"
  printf '%b\n' "$hits" | sed '/^$/d' | while read -r f; do note "$f"; done
  fail=1
fi

if [ "$fail" -ne 0 ]; then
  echo
  echo "Preflight failed. Review the items above before committing."
  exit 1
fi

echo "Preflight OK: no private paths or obvious secrets staged."
