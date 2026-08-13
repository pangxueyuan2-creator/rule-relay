#!/usr/bin/env node
import { access, writeFile } from "node:fs/promises";
import path from "node:path";

import { formatExplain, formatScan } from "./core/format.js";
import { explainTarget, scanRepository } from "./core/scan.js";

const usage = `RuleRelay — make AI coding-agent rules explainable and verifiable.

Usage:
  rule-relay scan [directory] [--json]
  rule-relay check [directory] [--strict] [--json]
  rule-relay explain <target-path> [directory] [--json]
  rule-relay init [directory]

Commands:
  scan      Discover supported instruction files and validate them.
  check     Run validation for CI; fails on errors, or warnings with --strict.
  explain   Show the discovered instructions that apply to one target path.
  init      Create a minimal AGENTS.md only when one does not already exist.
`;

const template = `# Agent instructions\n\n## Repository contract\n\nDescribe the project, package manager, and commands agents must run before handing work back. Keep this file concise and link to durable documentation instead of duplicating it.\n\n## Validate changes\n\n\`npm run check\`\n\`npm test\`\n\n## Scope\n\nAdd a nested \`AGENTS.md\` only when a subdirectory genuinely needs different rules.\n`;

interface ParsedArgs {
  readonly command: string;
  readonly positional: readonly string[];
  readonly json: boolean;
  readonly strict: boolean;
}

const parseArgs = (argv: readonly string[]): ParsedArgs => {
  const [command = "help", ...rest] = argv;
  return {
    command,
    positional: rest.filter((value) => !value.startsWith("--")),
    json: rest.includes("--json"),
    strict: rest.includes("--strict")
  };
};

const print = (value: unknown, json: boolean): void => {
  console.log(json ? JSON.stringify(value, null, 2) : value);
};

const commandRoot = (positional: readonly string[], fallback = "."): string => positional[0] ?? fallback;

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "help" || args.command === "--help" || args.command === "-h") {
    console.log(usage);
    return;
  }

  if (args.command === "scan") {
    const report = await scanRepository(commandRoot(args.positional));
    print(args.json ? report : formatScan(report), args.json);
    return;
  }

  if (args.command === "check") {
    const report = await scanRepository(commandRoot(args.positional));
    print(args.json ? report : formatScan(report), args.json);
    const errors = report.findings.filter((finding) => finding.severity === "error").length;
    const warnings = report.findings.filter((finding) => finding.severity === "warning").length;
    process.exitCode = errors > 0 || (args.strict && warnings > 0) ? 1 : 0;
    return;
  }

  if (args.command === "explain") {
    const target = args.positional[0];
    if (!target) {
      throw new Error("The explain command needs a target path. Example: rule-relay explain packages/api/src/server.ts");
    }
    const root = commandRoot(args.positional.slice(1));
    const report = await scanRepository(root);
    const explanation = explainTarget(report, target);
    print(args.json ? { target, instructions: explanation, findings: report.findings } : formatExplain(target, explanation), args.json);
    return;
  }

  if (args.command === "init") {
    const root = path.resolve(commandRoot(args.positional));
    const destination = path.join(root, "AGENTS.md");
    try {
      await access(destination);
      throw new Error(`Refusing to overwrite existing file: ${destination}`);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Refusing")) {
        throw error;
      }
    }
    await writeFile(destination, template, "utf8");
    console.log(`Created ${path.relative(process.cwd(), destination) || "AGENTS.md"}. Review it before committing.`);
    return;
  }

  throw new Error(`Unknown command: ${args.command}\n\n${usage}`);
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`RuleRelay: ${message}`);
  process.exitCode = 1;
});
