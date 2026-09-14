import path from "node:path";

import type { AgentAdapter, AgentId } from "../types.js";
import { copilotApplyToMatches, isCopilotPathInstruction } from "./copilot.js";

const normalize = (value: string): string => value.split(path.sep).join("/").replace(/^\.\//, "");

const directoryScope = (instructionPath: string): string => {
  const normalized = normalize(instructionPath);
  return path.posix.dirname(normalized) === "." ? "." : path.posix.dirname(normalized);
};

const copilotRepositoryInstruction = /(^|\/)\.github\/copilot-instructions\.md$/i;

export const isCopilotRepositoryInstruction = (relativePath: string): boolean =>
  copilotRepositoryInstruction.test(normalize(relativePath));

export const instructionScopeFor = (relativePath: string): string => {
  const normalized = normalize(relativePath);
  if (!isCopilotRepositoryInstruction(normalized)) {
    return directoryScope(normalized);
  }

  const suffix = ".github/copilot-instructions.md";
  const owner = normalized.slice(0, normalized.length - suffix.length).replace(/\/$/, "");
  return owner || ".";
};

const isInside = (targetPath: string, directory: string): boolean =>
  directory === "." || targetPath === directory || targetPath.startsWith(`${directory}/`);

const exactAdapter = (id: AgentId, label: string, pattern: RegExp): AgentAdapter => ({
  id,
  label,
  matches: (relativePath) => pattern.test(normalize(relativePath)),
  appliesToTarget: (instruction, targetPath) =>
    isInside(normalize(targetPath), directoryScope(instruction.relativePath))
});

const agentsMd: AgentAdapter = {
  id: "agents-md",
  label: "AGENTS.md",
  matches: (relativePath) => /(^|\/)AGENTS\.md$/i.test(normalize(relativePath)),
  appliesToTarget: (instruction, targetPath) => {
    const instructionDirectory = directoryScope(instruction.relativePath);
    return isInside(normalize(targetPath), instructionDirectory);
  }
};

const copilot: AgentAdapter = {
  id: "copilot",
  label: "GitHub Copilot",
  matches: (relativePath) => {
    const normalized = normalize(relativePath);
    return isCopilotRepositoryInstruction(normalized) || isCopilotPathInstruction(normalized);
  },
  appliesToTarget: (instruction, targetPath) => {
    const normalizedInstruction = normalize(instruction.relativePath);
    const normalizedTarget = normalize(targetPath);
    if (isCopilotRepositoryInstruction(normalizedInstruction)) {
      return isInside(normalizedTarget, instructionScopeFor(normalizedInstruction));
    }
    return isCopilotPathInstruction(normalizedInstruction) && copilotApplyToMatches(instruction.content, normalizedTarget);
  }
};

export const adapters: readonly AgentAdapter[] = [
  agentsMd,
  copilot,
  exactAdapter("claude", "Claude Code", /(^|\/)CLAUDE\.md$/i),
  exactAdapter("gemini", "Gemini CLI", /(^|\/)GEMINI\.md$/i),
  exactAdapter("cursor", "Cursor", /(^|\/)\.cursorrules$/i)
];

export const adapterFor = (relativePath: string): AgentAdapter | undefined =>
  adapters.find((adapter) => adapter.matches(relativePath));
