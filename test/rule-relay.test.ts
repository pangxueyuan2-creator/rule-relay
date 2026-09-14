import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { copilotApplyToMatches } from "../src/adapters/copilot.js";
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
    expect(explanation.map((entry) => entry.instruction)).toContain(".github/instructions/api.instructions.md");
  });

  it("filters path-specific Copilot instructions using applyTo", async () => {
    const report = await scanRepository(fixture);
    const apiInstructions = explainTarget(report, "packages/api/src/server.ts").map((entry) => entry.instruction);
    const webInstructions = explainTarget(report, "packages/web/src/page.ts").map((entry) => entry.instruction);

    expect(apiInstructions).toContain(".github/instructions/api.instructions.md");
    expect(webInstructions).not.toContain(".github/instructions/api.instructions.md");
    expect(webInstructions).toContain(".github/copilot-instructions.md");
  });

  it("supports documented recursive and comma-separated Copilot globs", () => {
    const content = `---\napplyTo: "**/*.ts,src/?.md,app/models/**/*.rb"\n---\n\nRules.\n`;

    expect(copilotApplyToMatches(content, "index.ts")).toBe(true);
    expect(copilotApplyToMatches(content, "src/core/index.ts")).toBe(true);
    expect(copilotApplyToMatches(content, "src/a.md")).toBe(true);
    expect(copilotApplyToMatches(content, "src/ab.md")).toBe(false);
    expect(copilotApplyToMatches(content, "app/models/user.rb")).toBe(true);
    expect(copilotApplyToMatches(content, "app/models/admin/user.rb")).toBe(true);
    expect(copilotApplyToMatches(content, "app/controllers/user.rb")).toBe(false);
  });

  it("discovers nested Copilot instruction files and rejects missing applyTo metadata", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "rule-relay-copilot-"));
    try {
      const instructions = path.join(directory, ".github", "instructions");
      const nested = path.join(instructions, "frontend");
      await mkdir(nested, { recursive: true });
      await writeFile(
        path.join(nested, "react.instructions.md"),
        `---\napplyTo: "src/**/*.tsx"\n---\n\nUse accessible components.\n`,
        "utf8"
      );
      await writeFile(path.join(instructions, "missing.instructions.md"), `---\nowner: platform\n---\n\nRules.\n`, "utf8");

      const report = await scanRepository(directory);
      expect(report.files.map((file) => file.relativePath)).toEqual([
        ".github/instructions/frontend/react.instructions.md",
        ".github/instructions/missing.instructions.md"
      ]);
      expect(report.findings).toContainEqual(
        expect.objectContaining({
          code: "INVALID_COPILOT_APPLY_TO",
          severity: "error",
          file: ".github/instructions/missing.instructions.md"
        })
      );

      const matching = explainTarget(report, "src/components/App.tsx").map((entry) => entry.instruction);
      const nonMatching = explainTarget(report, "src/components/App.ts").map((entry) => entry.instruction);
      expect(matching).toContain(".github/instructions/frontend/react.instructions.md");
      expect(matching).not.toContain(".github/instructions/missing.instructions.md");
      expect(nonMatching).not.toContain(".github/instructions/frontend/react.instructions.md");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("finds no issues in a clean fixture", async () => {
    const report = await scanRepository(path.resolve("test/fixtures/clean"));

    expect(report.files).toEqual([]);
    expect(report.findings).toEqual([]);
  });

  it("rejects a missing repository directory instead of reporting a green check", async () => {
    await expect(scanRepository(path.join(os.tmpdir(), "rule-relay-missing-root"))).rejects.toThrow(
      "Repository directory does not exist"
    );
  });

  it("keeps source fixtures readable for maintainers", async () => {
    const content = await readFile(path.join(fixture, "AGENTS.md"), "utf8");
    expect(content).toContain("npm run test");
  });

  it("allocates an isolated temporary path for CLI init tests", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "rule-relay-"));
    expect(directory).toContain("rule-relay-");
  });

  it("surfaces symlinked instruction files instead of silently skipping them", async (ctx) => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "rule-relay-links-"));
    try {
      await writeFile(path.join(directory, "AGENTS.md"), "canonical rules\n", "utf8");
      const nested = path.join(directory, "packages", "api");
      await mkdir(nested, { recursive: true });
      const link = path.join(nested, "AGENTS.md");
      try {
        // Junctions work without privileges on Windows; real symlinks cover POSIX CI.
        if (process.platform === "win32") {
          await symlink("../../AGENTS.md", link, "junction");
        } else {
          await symlink("../../AGENTS.md", link);
        }
      } catch {
        ctx.skip();
        return;
      }
      const report = await scanRepository(directory);
      expect(report.files.map((file) => file.relativePath)).toEqual(["AGENTS.md"]);
      const finding = report.findings.find((item) => item.code === "SYMLINKED_INSTRUCTION_FILE");
      expect(finding).toBeDefined();
      expect(finding?.file).toBe("packages/api/AGENTS.md");
      expect(finding?.severity).toBe("warning");
      // Node resolves Windows junctions to their absolute target on readlink.
      expect(finding?.detail).toContain("AGENTS.md");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("reports symlinked directories instead of silently hiding nested instructions", async (ctx) => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "rule-relay-dir-links-"));
    try {
      const target = path.join(directory, "shared-rules");
      await mkdir(target, { recursive: true });
      await writeFile(path.join(target, "AGENTS.md"), "shared rules\n", "utf8");

      const link = path.join(directory, "packages");
      try {
        if (process.platform === "win32") {
          await symlink(target, link, "junction");
        } else {
          await symlink("shared-rules", link, "dir");
        }
      } catch {
        ctx.skip();
        return;
      }

      const report = await scanRepository(directory);
      expect(report.files.map((file) => file.relativePath)).toEqual(["shared-rules/AGENTS.md"]);
      expect(report.findings).toContainEqual(
        expect.objectContaining({
          code: "SYMLINKED_DIRECTORY",
          severity: "warning",
          file: "packages"
        })
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
