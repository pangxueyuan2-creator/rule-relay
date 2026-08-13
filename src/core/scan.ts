import { stat } from "node:fs/promises";
import path from "node:path";

import { adapters } from "../adapters/index.js";
import type { Applicability, InstructionFile, ScanReport } from "../types.js";
import { discoverInstructions } from "./discovery.js";
import { validateInstructions } from "./validation.js";

export const scanRepository = async (root: string): Promise<ScanReport> => {
  const absoluteRoot = path.resolve(root);
  let metadata: Awaited<ReturnType<typeof stat>>;
  try {
    metadata = await stat(absoluteRoot);
  } catch {
    throw new Error(`Repository directory does not exist: ${absoluteRoot}`);
  }
  if (!metadata.isDirectory()) {
    throw new Error(`Repository path is not a directory: ${absoluteRoot}`);
  }

  const discovered = await discoverInstructions(absoluteRoot);
  const validationFindings = await validateInstructions(absoluteRoot, discovered.files);
  return {
    root: absoluteRoot,
    files: discovered.files,
    findings: [...discovered.findings, ...validationFindings],
    agents: [...new Set(discovered.files.map((file) => file.adapter))].sort()
  };
};

const pathSpecificScopeDepth = (file: InstructionFile): number => {
  if (file.adapter !== "copilot" || !file.relativePath.includes("/.github/instructions/")) {
    return 0;
  }
  const applyTo = /^---\s*[\s\S]*?^applyTo:\s*["']?([^\n"']+)/m.exec(file.content)?.[1]?.trim();
  if (!applyTo) {
    return 0;
  }
  const fixedPrefix = applyTo.split(/[*!?{]/, 1)[0]?.replace(/\/$/, "") ?? "";
  return fixedPrefix.split("/").filter(Boolean).length;
};

const scopeDepth = (file: InstructionFile): number => {
  if (file.adapter === "agents-md") {
    return file.scope === "." ? 0 : file.scope.split("/").length;
  }
  return pathSpecificScopeDepth(file);
};

export const explainTarget = (report: ScanReport, target: string): readonly Applicability[] => {
  const normalizedTarget = target.split(path.sep).join("/").replace(/^\.\//, "");
  return report.files
    .flatMap((file) => {
      const adapter = adapters.find((candidate) => candidate.id === file.adapter);
      if (!adapter || !adapter.appliesToTarget(file.relativePath, normalizedTarget)) {
        return [];
      }
      return [{ target: normalizedTarget, agent: file.adapter, instruction: file.relativePath, precedence: scopeDepth(file) }];
    })
    .sort((left, right) => right.precedence - left.precedence || left.agent.localeCompare(right.agent) || left.instruction.localeCompare(right.instruction));
};
