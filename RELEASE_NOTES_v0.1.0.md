# RuleRelay v0.1.0

RuleRelay v0.1.0 is the first public release of a local, deterministic CLI for repositories that use more than one AI coding agent.

## Highlights

- Discover `AGENTS.md`, GitHub Copilot instruction files, `CLAUDE.md`, `GEMINI.md`, and `.cursorrules`.
- Explain the discovered instruction files that apply to a target path.
- Identify exact duplicate instruction documents, stale local Markdown links, and undeclared `npm`/`pnpm`/`yarn`/`bun` package-script references.
- Run `rule-relay check .` in CI with deterministic exit behavior and optional `--strict` warning enforcement.
- Generate JSON output for scripts and integrations.
- Create a minimal `AGENTS.md` safely with `init`; existing files are never overwritten.

## Verification

This release passed strict TypeScript checking, ESLint, seven automated tests, a local secret-pattern scan, command-line smoke tests, and a clean-directory installation test from the attached npm-compatible tarball.

## Known boundaries

RuleRelay does not execute commands from instruction files, upload repository contents, infer semantic agreement between natural-language rules, or fully evaluate every glob expression inside path-specific Copilot instruction files. Those boundaries are intentional and documented in the README.

## Installation

Download the attached `rule-relay-0.1.0.tgz` artifact, or clone the repository and follow the README’s source-install instructions.
