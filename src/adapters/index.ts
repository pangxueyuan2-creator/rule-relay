import path from "node:path";

import type { AgentAdapter, AgentId } from "../types.js";
import { copilotApplyToMatches, isCopilotPathInstruction } from "./copilot.js";

const normalize = (value: string): string => value.split(path.sep).join("/").replace(/^\.\//, "");

const directoryScope = (instructionPath: string): string => {
  const normalized = normalize(instructionPath);
  return path.posix.dirname(normalized) === "." ? "." : path.posix.dirname(normalized);
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
    return normalized === ".github/copilot-instructions.md" || isCopilotPathInstruction(normalized);
  },
  appliesToTarget: (instruction, targetPath) => {
    const normalized = normalize(instruction.relativePath);
    if (normalized === ".github/copilot-instructions.md") {
      return true;
    }
    return isCopilotPathInstruction(normalized) && copilotApplyToMatches(instruction.content, normalize(targetPath));
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
