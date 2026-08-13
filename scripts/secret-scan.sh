#!/usr/bin/env bash
set -euo pipefail

# This lightweight guard complements platform secret scanning. It intentionally scans
# only tracked text files, avoids .git internals, and prints matching paths/lines.
patterns=(
  'AKIA[0-9A-Z]{16}'
  '-----BEGIN (RSA|EC|OPENSSH|DSA|PGP) PRIVATE KEY-----'
  'ghp_[A-Za-z0-9]{36}'
  'github_pat_[A-Za-z0-9_]{20,}'
  'sk-[A-Za-z0-9]{20,}'
)

status=0
for pattern in "${patterns[@]}"; do
  if git grep -n -I -E -e "$pattern" -- ':!pnpm-lock.yaml'; then
    echo "Potential secret pattern matched: $pattern" >&2
    status=1
  fi
done

exit "$status"
