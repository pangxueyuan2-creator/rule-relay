# RuleRelay

**See which AI coding-agent instructions apply, and catch stale or duplicated ones.**

Repositories often end up with `AGENTS.md`, Copilot instructions, Claude rules, Cursor rules, and more. RuleRelay is a small local CLI that discovers those files, shows which ones apply to a path, and checks for exact duplicates, broken local links, and missing package scripts.

It never calls a model and never executes commands found in the docs.

## Quick start

Node 20+.

```bash
npm exec --yes \
  --package=https://github.com/pangxueyuan2-creator/rule-relay/releases/download/v0.1.1/rule-relay-0.1.1.tgz \
  -- rule-relay scan .

npm exec --yes \
  --package=https://github.com/pangxueyuan2-creator/rule-relay/releases/download/v0.1.1/rule-relay-0.1.1.tgz \
  -- rule-relay explain src/server.ts

npm exec --yes \
  --package=https://github.com/pangxueyuan2-creator/rule-relay/releases/download/v0.1.1/rule-relay-0.1.1.tgz \
  -- rule-relay check .
```

Or build from source:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
pnpm exec rule-relay check .
```

## Commands

```text
rule-relay scan      Discover instruction files
rule-relay explain   Show rules relevant to a path
rule-relay check     Validate (duplicates, links, scripts) — good for CI
rule-relay init      Create a minimal AGENTS.md if missing
```

`check` exits non-zero on errors. Add `--strict` to also fail on warnings.

## Status

Early public version. Single maintainer.

MIT License.
