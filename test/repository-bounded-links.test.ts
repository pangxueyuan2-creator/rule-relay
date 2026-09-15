import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { validateInstructions } from "../src/core/validation.js";
import type { InstructionFile } from "../src/types.js";

const temporary: string[] = [];

const makeInstruction = (root: string, content: string): InstructionFile => ({
  absolutePath: path.join(root, "AGENTS.md"),
  relativePath: "AGENTS.md",
  adapter: "agents-md",
  label: "AGENTS.md",
  scope: "**",
  content,
  contentHash: "test-hash"
});

const repository = async (): Promise<string> => {
  const root = await mkdtemp(path.join(tmpdir(), "rule-relay-links-"));
  temporary.push(root);
  return root;
};

afterEach(async () => {
  await Promise.all(
    temporary.splice(0).map(async (target) => rm(target, { recursive: true, force: true }))
  );
});

describe("repository-bounded Markdown link validation", () => {
  it("rejects parent traversal even when the outside target exists", async () => {
    const root = await repository();
    const outside = path.join(path.dirname(root), `${path.basename(root)}-outside.md`);
    temporary.push(outside);
    await writeFile(outside, "outside\n", "utf8");

    const findings = await validateInstructions(
      root,
      [makeInstruction(root, `See [outside](../${path.basename(outside)}).`)]
    );

    expect(findings).toEqual([
      expect.objectContaining({
        code: "UNSAFE_LOCAL_LINK",
        severity: "error",
        file: "AGENTS.md"
      })
    ]);
  });

  it("rejects absolute targets without probing them", async () => {
    const root = await repository();
    const outside = path.join(path.dirname(root), `${path.basename(root)}-absolute.md`);
    temporary.push(outside);
    await writeFile(outside, "outside\n", "utf8");
    const markdownTarget = outside.split(path.sep).join("/");

    const findings = await validateInstructions(
      root,
      [makeInstruction(root, `See [absolute](${markdownTarget}).`)]
    );

    expect(findings).toEqual([
      expect.objectContaining({
        code: "UNSAFE_LOCAL_LINK",
        severity: "error",
        file: "AGENTS.md"
      })
    ]);
  });

  it("preserves in-repository live and dead link checks", async () => {
    const root = await repository();
    await mkdir(path.join(root, "docs"), { recursive: true });
    await writeFile(path.join(root, "docs", "guide.md"), "guide\n", "utf8");

    const findings = await validateInstructions(
      root,
      [
        makeInstruction(
          root,
          "See [guide](./docs/guide.md) and [missing](./docs/missing.md)."
        )
      ]
    );

    expect(findings).toEqual([
      expect.objectContaining({
        code: "DEAD_LOCAL_LINK",
        severity: "error",
        file: "AGENTS.md",
        detail: "Expected docs/missing.md"
      })
    ]);
  });
});
