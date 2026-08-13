import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { explainTarget, scanRepository } from "../src/core/scan.js";

const fixture = path.resolve("test/fixtures/complex");

describe("RuleRelay", () => {
  it("discovers supported instructions and their agent formats", async () => {
    const report = await scanRepository(fixture);

    expect(report.files.map((file) => file.relativePath)).toEqual([
      ".github/copilot-instructions.md",
      ".github/instructions/api.instructions.md",
      "AGENTS.md",
      "packages/api/AGENTS.md"
    ]);
    expect(report.agents).toEqual(["agents-md", "copilot"]);
  });

  it("reports duplicate instructions, dead links, and missing package scripts", async () => {
    const report = await scanRepository(fixture);
    const codes = report.findings.map((finding) => finding.code);

    expect(codes).toContain("DUPLICATE_INSTRUCTION");
    expect(codes).toContain("DEAD_LOCAL_LINK");
    expect(codes).toContain("MISSING_PACKAGE_SCRIPT");
  });

  it("orders nested instruction files before broader discovered files", async () => {
    const report = await scanRepository(fixture);
    const explanation = explainTarget(report, "packages/api/src/server.ts");

    expect(explanation[0]).toMatchObject({ instruction: "packages/api/AGENTS.md", agent: "agents-md" });
    expect(explanation.map((entry) => entry.instruction)).toContain("AGENTS.md");
    expect(explanation.map((entry) => entry.instruction)).toContain(".github/copilot-instructions.md");
  });

  it("finds no issues in a clean fixture", async () => {
    const report = await scanRepository(path.resolve("test/fixtures/clean"));

    expect(report.files).toEqual([]);
    expect(report.findings).toEqual([]);
  });

  it("rejects a missing repository directory instead of reporting a green check", async () => {
    await expect(scanRepository(path.join(os.tmpdir(), "rule-relay-missing-root"))).rejects.toThrow("Repository directory does not exist");
  });

  it("keeps source fixtures readable for maintainers", async () => {
    const content = await readFile(path.join(fixture, "AGENTS.md"), "utf8");
    expect(content).toContain("npm run test");
  });

  it("allocates an isolated temporary path for CLI init tests", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "rule-relay-"));
    expect(directory).toContain("rule-relay-");
  });
});
