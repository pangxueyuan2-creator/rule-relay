# RuleRelay launch pack

This document is a reusable communication kit. It is not a posting instruction. Before sharing in any community, read its rules, disclose the maintainer relationship, and publish only where the project is genuinely relevant.

## One-sentence pitch

RuleRelay is a local CLI that explains which AI coding-agent instructions apply to a file and catches duplicate, stale, or non-runnable rules before they confuse an agent or a contributor.

## Short social post

I built **RuleRelay**, a local CLI for repositories that use more than one AI coding agent. It maps `AGENTS.md`, Copilot, Claude, Gemini, and Cursor instruction files; explains which discovered rules apply to a target path; and checks duplicates, stale local links, and missing package scripts. No model calls and no source upload. https://github.com/pangxueyuan2-creator/rule-relay

## Developer-community description

Repositories are increasingly carrying a mix of `AGENTS.md`, `.github/copilot-instructions.md`, `CLAUDE.md`, nested instruction files, and path-specific rules. The hard part is not creating another instruction file; it is knowing which rules overlap, which ones a target path can inherit, and whether the commands and links in those rules are still valid.

RuleRelay is an MIT-licensed, deterministic CLI for that narrow maintenance problem. `scan` inventories supported formats, `explain` maps discovered rules to a path, and `check` produces CI-friendly failures for stale local links and undeclared package scripts. Exact duplicate documents are surfaced as warnings. It operates locally and does not execute instruction-file content or transmit repository data.

The v0.1.1 release has passed a Node 20/22 GitHub Actions matrix, local secret-pattern scanning, and fresh-tarball installation smoke tests. The main limitation is deliberate: RuleRelay does not claim to fully reconstruct an agent vendor’s private runtime context or infer semantic agreement between natural-language policies.

Repository: https://github.com/pangxueyuan2-creator/rule-relay
Release: https://github.com/pangxueyuan2-creator/rule-relay/releases/tag/v0.1.1

## Hacker News-style title

Show HN: RuleRelay – a local CLI to map and validate AI coding-agent instructions

## Community-specific opener

I maintain RuleRelay. I am sharing it because this community discusses multi-agent coding workflows and repository maintenance; if this is off-topic for the community rules, please disregard it.

## Thirty-second demo narration

“Here is a repository with a root `AGENTS.md`, a nested API rule, a Copilot instruction file, and a path-specific rule. `rule-relay explain packages/api/src/server.ts` lists the discovered instruction files relevant to that path. Then `rule-relay check .` reveals an exact duplicate policy, a stale documentation link, and an instruction that refers to a package script that does not exist. That makes agent rules reviewable in CI without sending the codebase to a model.”

## FAQ

| Question | Answer |
| --- | --- |
| Does it call an AI model? | No. RuleRelay is deterministic and local-first. |
| Does it execute commands copied from `AGENTS.md` or other instruction files? | No. It recognizes package-script references without executing document content. |
| Does it support every agent instruction format? | v0.1 recognizes `AGENTS.md`, GitHub Copilot instruction files, `CLAUDE.md`, `GEMINI.md`, and `.cursorrules`. Adapter additions require documented behavior and fixtures. |
| Does it understand whether two English rules conflict? | Not yet. It reports exact document duplication and objective validation failures rather than presenting uncertain semantic claims as facts. |
| Can I use it in CI? | Yes. `rule-relay check .` fails on errors; `--strict` also fails on warnings. |

## Likely objections and direct responses

| Objection | Response |
| --- | --- |
| “Why not just keep one file?” | That is often best, but teams still need a way to find old copies, verify compatibility shims, and understand nested or vendor-specific scope. |
| “Doesn’t each tool load rules differently?” | Yes. RuleRelay documents its discovery boundaries and avoids claiming a vendor’s private runtime context. The CLI makes the known, repository-visible layer auditable. |
| “Can a linter solve policy quality?” | No. It can solve high-confidence structural failures—duplicate content, stale local links, and invalid package-script references—while leaving subjective policy review to humans. |

## Contribution invitation

Contributions are welcome, especially documented adapter behavior, scope fixtures, and high-confidence validation rules. Please avoid adding LLM-dependent behavior or format assumptions that cannot be backed by an authoritative source and regression tests.
