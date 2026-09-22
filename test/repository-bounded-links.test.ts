import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
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

const directoryLink = async (target: string, link: string): Promise<void> => {
  await symlink(target, link, process.platform === "win32" ? "junction" : "dir");
};

afterEach(async () => {
  await Promise.all(
    temporary.splice(0).map(async (target) => rm(target, { recursive: true, force: true }))
  );
});

describe("repository-bounded Markdown link validation", () => {
  it.each(["bridge", ".git/bridge", "node_modules/bridge"])(
    "rejects an outside target reached through %s",
    async (link) => {
      const fixture = await repository();
      const root = path.join(fixture, "repo");
      const outside = path.join(fixture, "repo-outside");
      await mkdir(root);
      await mkdir(outside);
      await writeFile(path.join(outside, "guide.md"), "outside\n", "utf8");
      await mkdir(path.dirname(path.join(root, link)), { recursive: true });
      await directoryLink(outside, path.join(root, link));

      const findings = await validateInstructions(
        root,
        [makeInstruction(root, `See [guide](./${link}/guide.md).`)]
      );

      expect(findings).toEqual([
        expect.objectContaining({ code: "UNSAFE_LOCAL_LINK", severity: "error", file: "AGENTS.md" })
      ]);
    }
  );

  it("allows a directory link whose actual target remains in the repository", async () => {
    const root = await repository();
    await mkdir(path.join(root, "docs"));
    await writeFile(path.join(root, "docs", "guide.md"), "inside\n", "utf8");
    await directoryLink(path.join(root, "docs"), path.join(root, "bridge"));

    expect(await validateInstructions(
      root,
      [makeInstruction(root, "See [guide](./bridge/guide.md).")]
    )).toEqual([]);
  });

  it("uses the actual repository root when the selected root is a directory link", async () => {
    const fixture = await repository();
    const actualRoot = path.join(fixture, "actual-repo");
    const selectedRoot = path.join(fixture, "selected-repo");
    await mkdir(actualRoot);
    await writeFile(path.join(actualRoot, "guide.md"), "inside\n", "utf8");
    await directoryLink(actualRoot, selectedRoot);

    expect(await validateInstructions(
      selectedRoot,
      [makeInstruction(selectedRoot, "See [guide](./guide.md).")]
    )).toEqual([]);
  });

  it("rejects an outside target reached through multiple directory links", async () => {
    const fixture = await repository();
    const root = path.join(fixture, "repo");
    const outside = path.join(fixture, "outside");
    await mkdir(root);
    await mkdir(outside);
    await writeFile(path.join(outside, "guide.md"), "outside\n", "utf8");
    await directoryLink(outside, path.join(root, "second"));
    await directoryLink(path.join(root, "second"), path.join(root, "first"));

    expect(await validateInstructions(
      root,
      [makeInstruction(root, "See [guide](./first/guide.md).")]
    )).toEqual([
      expect.objectContaining({ code: "UNSAFE_LOCAL_LINK", severity: "error" })
    ]);
  });

  it.skipIf(process.platform === "win32")("rejects a file symlink whose target is outside", async () => {
    const fixture = await repository();
    const root = path.join(fixture, "repo");
    const outside = path.join(fixture, "outside.md");
    await mkdir(root);
    await writeFile(outside, "outside\n", "utf8");
    await symlink(outside, path.join(root, "linked.md"), "file");

    expect(await validateInstructions(
      root,
      [makeInstruction(root, "See [guide](./linked.md).")]
    )).toEqual([
      expect.objectContaining({ code: "UNSAFE_LOCAL_LINK", severity: "error" })
    ]);
  });

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
