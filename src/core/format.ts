import type { Applicability, Finding, ScanReport } from "../types.js";

const bySeverity = (findings: readonly Finding[], severity: Finding["severity"]): number =>
  findings.filter((finding) => finding.severity === severity).length;

const icon = (severity: Finding["severity"]): string => {
  if (severity === "error") return "✖";
  if (severity === "warning") return "▲";
  return "●";
};

export const formatScan = (report: ScanReport): string => {
  const rows = report.files.length === 0
    ? ["  No supported instruction files found."]
    : report.files.map((file) => `  ${file.relativePath.padEnd(42)} ${file.label.padEnd(16)} scope: ${file.scope}`);
  const summary = `Found ${report.files.length} instruction file(s) across ${report.agents.length} agent format(s).`;
  const findings = report.findings.length === 0
    ? "No validation findings."
    : report.findings.map((finding) => `  ${icon(finding.severity)} ${finding.file}: ${finding.message}${finding.detail ? ` (${finding.detail})` : ""}`).join("\n");
  return [
    "RuleRelay — agent instruction map",
    "",
    summary,
    "",
    "Instruction files",
    ...rows,
    "",
    `Validation: ${bySeverity(report.findings, "error")} error(s), ${bySeverity(report.findings, "warning")} warning(s), ${bySeverity(report.findings, "info")} info item(s)`,
    findings
  ].join("\n");
};

export const formatExplain = (target: string, entries: readonly Applicability[]): string => {
  if (entries.length === 0) {
    return `No recognized instruction file applies to ${target}.`;
  }
  return [
    `RuleRelay — rules visible to ${target}`,
    "",
    ...entries.map((entry, index) => `  ${index + 1}. ${entry.instruction} [${entry.agent}]${index === 0 ? " — most specific discovered rule" : ""}`),
    "",
    "Note: Copilot path-specific .instructions.md files are reported as potentially applicable until their frontmatter glob is evaluated."
  ].join("\n");
};
