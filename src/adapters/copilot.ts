const pathSpecificInstruction = /(^|\/)\.github\/instructions\/.+\.instructions\.md$/i;
const maxPatterns = 64;
const maxPatternLength = 512;

export type CopilotApplyToResult =
  | { readonly ok: true; readonly patterns: readonly string[] }
  | { readonly ok: false; readonly error: string };

const normalizePath = (value: string): string => value.replace(/\\/g, "/").replace(/^\.\//, "");

export const isCopilotPathInstruction = (relativePath: string): boolean =>
  pathSpecificInstruction.test(normalizePath(relativePath));

const scalarValue = (rawValue: string): { readonly ok: true; readonly value: string } | { readonly ok: false; readonly error: string } => {
  const value = rawValue.trim();
  if (!value) {
    return { ok: false, error: "applyTo must not be empty." };
  }

  const first = value[0];
  if (first === "\"" || first === "'") {
    if (value.length < 2 || value.at(-1) !== first) {
      return { ok: false, error: "applyTo has an unterminated quoted scalar." };
    }
    return { ok: true, value: value.slice(1, -1) };
  }

  return { ok: true, value };
};

const normalizePattern = (rawPattern: string): { readonly ok: true; readonly value: string } | { readonly ok: false; readonly error: string } => {
  const value = normalizePath(rawPattern.trim());
  if (!value) {
    return { ok: false, error: "applyTo contains an empty glob pattern." };
  }
  if (value.length > maxPatternLength) {
    return { ok: false, error: `applyTo glob exceeds ${maxPatternLength} characters.` };
  }
  if (value.startsWith("/")) {
    return { ok: false, error: "applyTo globs must be repository-relative." };
  }
  if (value.split("/").includes("..")) {
    return { ok: false, error: "applyTo globs must not escape the repository with '..'." };
  }
  return { ok: true, value };
};

export const parseCopilotApplyTo = (content: string): CopilotApplyToResult => {
  const normalized = content.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  if (lines[0]?.trim() !== "---") {
    return { ok: false, error: "Path-specific Copilot instructions must start with YAML frontmatter." };
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (closingIndex < 0) {
    return { ok: false, error: "Copilot instruction frontmatter is not closed with '---'." };
  }

  const applyToEntries = lines
    .slice(1, closingIndex)
    .map((line) => /^\s*applyTo\s*:\s*(.*)$/.exec(line))
    .filter((match): match is RegExpExecArray => match !== null);
  if (applyToEntries.length !== 1) {
    return {
      ok: false,
      error: applyToEntries.length === 0 ? "Path-specific Copilot instructions require one applyTo field." : "Path-specific Copilot instructions must not repeat applyTo."
    };
  }

  const parsedScalar = scalarValue(applyToEntries[0]?.[1] ?? "");
  if (!parsedScalar.ok) {
    return parsedScalar;
  }

  const rawPatterns = parsedScalar.value.split(",");
  if (rawPatterns.length > maxPatterns) {
    return { ok: false, error: `applyTo contains more than ${maxPatterns} glob patterns.` };
  }

  const patterns: string[] = [];
  for (const rawPattern of rawPatterns) {
    const pattern = normalizePattern(rawPattern);
    if (!pattern.ok) {
      return pattern;
    }
    patterns.push(pattern.value);
  }
  return { ok: true, patterns };
};

const regexEscape = (value: string): string => value.replace(/[\\^$+?.()|{}[\]]/g, "\\$&");

const globExpression = (pattern: string): RegExp => {
  let source = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "*") {
      let end = index;
      while (pattern[end + 1] === "*") {
        end += 1;
      }
      const recursive = end > index;
      index = end;
      if (recursive && pattern[index + 1] === "/") {
        source += "(?:.*/)?";
        index += 1;
      } else {
        source += recursive ? ".*" : "[^/]*";
      }
      continue;
    }
    if (character === "?") {
      source += "[^/]";
      continue;
    }
    source += regexEscape(character ?? "");
  }
  return new RegExp(`^${source}$`);
};

export const copilotApplyToMatches = (content: string, targetPath: string): boolean => {
  const parsed = parseCopilotApplyTo(content);
  if (!parsed.ok) {
    return false;
  }
  const normalizedTarget = normalizePath(targetPath);
  return parsed.patterns.some((pattern) => globExpression(pattern).test(normalizedTarget));
};

const patternDepth = (pattern: string): number => {
  let depth = 0;
  for (const segment of pattern.split("/")) {
    if (!segment || /[*?]/.test(segment)) {
      break;
    }
    depth += 1;
  }
  return depth;
};

export const copilotScopeDepth = (content: string, targetPath: string): number => {
  const parsed = parseCopilotApplyTo(content);
  if (!parsed.ok) {
    return 0;
  }
  const normalizedTarget = normalizePath(targetPath);
  return Math.max(
    0,
    ...parsed.patterns
      .filter((pattern) => globExpression(pattern).test(normalizedTarget))
      .map(patternDepth)
  );
};
