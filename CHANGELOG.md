# Changelog

All notable changes are documented here.

## 0.1.1 — 2026-08-13

- Fix the CI-only failure caused by an intentionally empty test fixture not being represented in Git.
- Preserve the clean fixture with `.gitkeep` so local, archive, and GitHub Actions test runs exercise the same repository shape.

## 0.1.0 — 2026-08-13

The initial RuleRelay release introduces a local TypeScript CLI for mapping and validating AI coding-agent instruction files. It discovers `AGENTS.md`, GitHub Copilot instruction files, `CLAUDE.md`, `GEMINI.md`, and `.cursorrules`; explains discovered rules for a target path; identifies exact duplicate instruction documents; validates local Markdown links and package-script references; offers JSON and CI-friendly `check` output; and creates a non-destructive starter `AGENTS.md` with `init`.

This release does not execute commands from instruction files, transmit source code, attempt semantic natural-language conflict detection, or fully evaluate every path glob expression in path-specific Copilot instruction files.
