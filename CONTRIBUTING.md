# Contributing to RuleRelay

Thank you for helping make multi-agent repository rules easier to understand and maintain.

## Development workflow

Use Node.js 20 or later and pnpm.

```bash
pnpm install --ignore-scripts
pnpm verify
```

Before submitting a change, confirm that `pnpm verify` passes. It runs type checking, linting, tests, and a production build.

## Design principles

RuleRelay should remain local-first, deterministic, and conservative. It must not execute commands found in agent instruction files, transmit repository contents, or claim to know a model’s private runtime context. New checks should be explainable, actionable, and covered by fixtures that show both a passing and a failing case.

When adding support for an instruction format, cite an authoritative public document that describes how the relevant tool discovers and scopes that format. Keep adapters narrow until their behavior is verified.

## Pull requests

A focused pull request should explain the developer problem it solves, identify any format-semantics assumption, include a regression test, and avoid unrelated formatting changes. For user-facing behavior, update the README command table and compatibility boundaries as needed.
