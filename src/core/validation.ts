import { access, readFile } from "node:fs/promises";
import path from "node:path";

import type { Finding, InstructionFile } from "../types.js";

const localMarkdownLinks = /\[[^\]]*\]\((?!https?:\/\/|mailto:|#)([^)\s]+)(?:\s+[^)]*)?\)/g;
const inlineCode = /`([^`\n]+)`/g;
const packageCommands = /^(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?([a-zA-Z0-9:_-]+)(?:\s|$)/;

interface PackageManifest {
  readonly scripts?: Record<string, string>;
}

const normalizeContent = (content: string): string => content.replace(/\r\n/g, "\n").trim();

const pushDuplicateFindings = (files: readonly InstructionFile[], findings: Finding[]): void => {
  const groups = new Map<string, InstructionFile[]>();
  for (const file of files) {
    const key = normalizeContent(file.content);
    if (key.length === 0) {
      continue;
    }
    groups.set(key, [...(groups.get(key) ?? []), file]);
  }

  for (const group of groups.values()) {
    if (group.length < 2) {
      continue;
    }
    const locations = group.map((file) => file.relativePath).join(", ");
    for (const file of group) {
      findings.push({
        code: "DUPLICATE_INSTRUCTION",
        severity: "warning",
        message: `Instruction content is duplicated across: ${locations}`,
        file: file.relativePath,
        detail: "Choose a canonical source or use a short, explicit compatibility shim."
      });
    }
  }
};

const pushLinkFindings = async (root: string, file: InstructionFile, findings: Finding[]): Promise<void> => {
  for (const match of file.content.matchAll(localMarkdownLinks)) {
    const rawTarget = match[1];
    if (!rawTarget || rawTarget.startsWith("#")) {
      continue;
    }
    const target = rawTarget.split("#", 1)[0];
    if (!target) {
      continue;
    }
    const resolved = path.resolve(path.dirname(file.absolutePath), target);
    try {
      await access(resolved);
    } catch {
      findings.push({
        code: "DEAD_LOCAL_LINK",
        severity: "error",
        message: `Local Markdown link does not exist: ${rawTarget}`,
        file: file.relativePath,
        detail: `Expected ${path.relative(root, resolved).split(path.sep).join("/")}`
      });
    }
  }
};

const findNearestManifest = async (root: string, instructionDirectory: string): Promise<PackageManifest | undefined> => {
  let current = instructionDirectory;
  while (true) {
    const candidate = path.join(current, "package.json");
    try {
      return JSON.parse(await readFile(candidate, "utf8")) as PackageManifest;
    } catch {
      // Continue toward the checked repository root. A missing or malformed manifest is not a command proof.
    }
    if (current === root) {
      return undefined;
    }
    const parent = path.dirname(current);
    if (!parent.startsWith(root)) {
      return undefined;
    }
    current = parent;
  }
};

const pushCommandFindings = async (root: string, file: InstructionFile, findings: Finding[]): Promise<void> => {
  const manifest = await findNearestManifest(root, path.dirname(file.absolutePath));
  if (!manifest?.scripts) {
    return;
  }
  for (const match of file.content.matchAll(inlineCode)) {
    const value = match[1]?.trim();
    if (!value) {
      continue;
    }
    const commandMatch = packageCommands.exec(value);
    if (!commandMatch) {
      continue;
    }
    const scriptName = commandMatch[1];
    if (scriptName && !Object.hasOwn(manifest.scripts, scriptName)) {
      findings.push({
        code: "MISSING_PACKAGE_SCRIPT",
        severity: "error",
        message: `Referenced package script is not declared: ${scriptName}`,
        file: file.relativePath,
        detail: `Command: ${value}`
      });
    }
  }
};

export const validateInstructions = async (root: string, files: readonly InstructionFile[]): Promise<readonly Finding[]> => {
  const findings: Finding[] = [];
  pushDuplicateFindings(files, findings);
  for (const file of files) {
    await pushLinkFindings(root, file, findings);
    await pushCommandFindings(root, file, findings);
  }
  return findings;
};
