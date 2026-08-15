# RuleRelay

Small local tool that shows which AI coding-agent instruction files apply in a repo, and catches obvious problems like exact duplicates, broken local links, and missing package scripts.

It looks at files like AGENTS.md, Copilot instructions, Claude rules, Cursor rules, etc. It never calls a model and never executes anything found in the docs.

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

Or from source:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
pnpm exec rule-relay check .
```

## Commands

```text
rule-relay scan      discover instruction files
rule-relay explain   show rules that apply to a path
rule-relay check     validate (duplicates, links, scripts) — useful in CI
rule-relay init      create a minimal AGENTS.md if missing
```

`check` exits non-zero on errors. Add `--strict` to also fail on warnings.

## Status

Early public version. Single maintainer.

MIT.
