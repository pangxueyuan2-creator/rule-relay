import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { formatExplain } from "../src/core/format.js";
import { explainTarget, scanRepository } from "../src/core/scan.js";

describe("nested Copilot repository instructions", () => {
  it("discovers nested .github/copilot-instructions.md with the owning directory as scope", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "rule-relay-copilot-scope-"));
    try {
      const rootGithub = path.join(directory, ".github");
      const apiGithub = path.join(directory, "packages", "api", ".github");
      const webGithub = path.join(directory, "packages", "web", ".github");
      await mkdir(rootGithub, { recursive: true });
      await mkdir(apiGithub, { recursive: true });
      await mkdir(webGithub, { recursive: true });
      await writeFile(path.join(rootGithub, "copilot-instructions.md"), "Root Copilot rules.\n", "utf8");
      await writeFile(path.join(apiGithub, "copilot-instructions.md"), "API Copilot rules.\n", "utf8");
      await writeFile(path.join(webGithub, "copilot-instructions.md"), "Web Copilot rules.\n", "utf8");

      const report = await scanRepository(directory);
      expect(report.files.map(({ relativePath, scope }) => ({ relativePath, scope }))).toEqual([
        { relativePath: ".github/copilot-instructions.md", scope: "." },
        { relativePath: "packages/api/.github/copilot-instructions.md", scope: "packages/api" },
        { relativePath: "packages/web/.github/copilot-instructions.md", scope: "packages/web" }
      ]);

      const apiInstructions = explainTarget(report, "packages/api/src/server.ts").map((entry) => entry.instruction);
      expect(apiInstructions).toContain(".github/copilot-instructions.md");
      expect(apiInstructions).toContain("packages/api/.github/copilot-instructions.md");
      expect(apiInstructions).not.toContain("packages/web/.github/copilot-instructions.md");

      const webInstructions = explainTarget(report, "packages/web/src/page.ts").map((entry) => entry.instruction);
      expect(webInstructions).toContain(".github/copilot-instructions.md");
      expect(webInstructions).toContain("packages/web/.github/copilot-instructions.md");
      expect(webInstructions).not.toContain("packages/api/.github/copilot-instructions.md");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("does not present applicability order as cross-agent precedence", () => {
    const output = formatExplain("src/server.ts", [
      { target: "src/server.ts", agent: "agents-md", instruction: "AGENTS.md", precedence: 0 },
      { target: "src/server.ts", agent: "copilot", instruction: ".github/copilot-instructions.md", precedence: 0 }
    ]);

    expect(output).not.toContain("most specific discovered rule");
    expect(output).toContain("not a cross-agent precedence claim");
    expect(output).toContain("appear only when their applyTo glob matches this target");
  });
});
