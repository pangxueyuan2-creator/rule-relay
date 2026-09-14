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

For GitHub Copilot path-specific `.instructions.md` files, `explain` evaluates the frontmatter `applyTo` value against the requested repository-relative path. Comma-separated patterns and the documented `*`, `**`, and `?` wildcards are supported. Missing or malformed `applyTo` metadata is an error in `check` instead of being treated as globally applicable.

RuleRelay also recognizes `.github/copilot-instructions.md` in nested repository locations. A nested file is scoped to the directory that owns its `.github` folder, while the root `.github/copilot-instructions.md` remains repository-wide. `explain` reports applicable files without claiming a cross-agent precedence order.

## Status

Early public version. Single maintainer.

MIT.
