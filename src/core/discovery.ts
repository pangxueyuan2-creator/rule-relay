import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { adapterFor } from "../adapters/index.js";
import type { Finding, InstructionFile } from "../types.js";

const ignoredDirectories = new Set([".git", "node_modules", "dist", "coverage", ".next", ".turbo"]);

interface DiscoveryResult {
  readonly files: readonly InstructionFile[];
  readonly findings: readonly Finding[];
}

const digest = (content: string): string => createHash("sha256").update(content).digest("hex");

const visit = async (root: string, current: string, files: InstructionFile[], findings: Finding[]): Promise<void> => {
  try {
    const entries = await readdir(current, { withFileTypes: true, encoding: "utf8" });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) {
          await visit(root, path.join(current, entry.name), files, findings);
        }
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }

      const absolutePath = path.join(current, entry.name);
      const relativePath = path.relative(root, absolutePath).split(path.sep).join("/");
      const adapter = adapterFor(relativePath);
      if (!adapter) {
        continue;
      }

      try {
        const content = await readFile(absolutePath, "utf8");
        files.push({
          absolutePath,
          relativePath,
          adapter: adapter.id,
          label: adapter.label,
          scope: path.posix.dirname(relativePath) === "." ? "." : path.posix.dirname(relativePath),
          content,
          contentHash: digest(content)
        });
      } catch (error) {
        findings.push({
          code: "UNREADABLE_FILE",
          severity: "warning",
          message: `Cannot read instruction file: ${relativePath}`,
          file: relativePath,
          detail: error instanceof Error ? error.message : String(error)
        });
      }
    }
  } catch (error) {
    findings.push({
      code: "UNREADABLE_FILE",
      severity: "warning",
      message: `Cannot read directory: ${current}`,
      file: path.relative(root, current) || ".",
      detail: error instanceof Error ? error.message : String(error)
    });
  }
};

export const discoverInstructions = async (root: string): Promise<DiscoveryResult> => {
  const files: InstructionFile[] = [];
  const findings: Finding[] = [];
  await visit(root, root, files, findings);
  return {
    files: files.sort((left, right) => left.relativePath.localeCompare(right.relativePath)),
    findings
  };
};
