# Security policy

## Supported versions

Only the latest released minor version receives routine security fixes.

## Reporting a vulnerability

Please do **not** open a public issue for a suspected vulnerability. Use GitHub’s private vulnerability reporting feature for this repository, or contact the maintainer through the repository’s security advisory channel once it is enabled.

## Security model

RuleRelay is a local, read-only analyzer except for `rule-relay init`, which creates a new root-level `AGENTS.md` and refuses to overwrite an existing file. It does not execute commands found in instruction files, send repository contents to a remote service, or require authentication tokens.

Instruction files are treated as untrusted text. Validation inspects Markdown links and recognises package-script references without evaluating shell code.
