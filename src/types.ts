export type AgentId = "agents-md" | "copilot" | "claude" | "gemini" | "cursor";

export type Severity = "error" | "warning" | "info";

export interface AgentAdapter {
  readonly id: AgentId;
  readonly label: string;
  matches(relativePath: string): boolean;
  appliesToTarget(instructionPath: string, targetPath: string): boolean;
}

export interface InstructionFile {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly adapter: AgentId;
  readonly label: string;
  readonly scope: string;
  readonly content: string;
  readonly contentHash: string;
}

export interface Finding {
  readonly code:
    | "DUPLICATE_INSTRUCTION"
    | "DEAD_LOCAL_LINK"
    | "MISSING_PACKAGE_SCRIPT"
    | "UNREADABLE_FILE"
    | "UNKNOWN_INSTRUCTION_FORMAT";
  readonly severity: Severity;
  readonly message: string;
  readonly file: string;
  readonly detail?: string;
}

export interface Applicability {
  readonly target: string;
  readonly agent: AgentId;
  readonly instruction: string;
  readonly precedence: number;
}

export interface ScanReport {
  readonly root: string;
  readonly files: readonly InstructionFile[];
  readonly findings: readonly Finding[];
  readonly agents: readonly AgentId[];
}

export interface CheckResult {
  readonly report: ScanReport;
  readonly exitCode: 0 | 1;
}
