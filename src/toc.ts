import * as path from "node:path";

import type { ExportDoc, ModuleDoc } from "./parser.ts";

export const START_FENCE = "<!-- jstoc:start -->";
export const END_FENCE = "<!-- jstoc:end -->";

const FENCE_PATTERN = new RegExp(`${START_FENCE}[\\s\\S]*?${END_FENCE}`);

export interface RenderOptions {
  /** Directory that links should be relative to; usually the README's own */
  relativeTo: string;

  /** Heading level (number of `#`) each subpath section should render at; defaults to `3` */
  headingLevel?: number;
}

const HEADING_PATTERN = /^(#{1,6})(?:\s|$)/;

/**
 * Find the heading level table-of-contents sections should render at: one
 * level deeper than the nearest heading above the injection point, falling
 * back to `###` when no heading precedes it
 */
export function detectHeadingLevel(contents: string): number {
  const fenceMatch = FENCE_PATTERN.exec(contents);
  const searchArea = fenceMatch ? contents.slice(0, fenceMatch.index) : contents;
  const lines = searchArea.split("\n");

  for (let index = lines.length - 1; index >= 0; index--) {
    const match = HEADING_PATTERN.exec(lines[index]);

    if (match) {
      return Math.min(match[1].length + 1, 6);
    }
  }

  return 3;
}

/**
 * Render a Markdown table of contents for a package's exports: a sub-header
 * per subpath, each followed by a table linking every export to its source
 */
export function renderTableOfContents(modules: ModuleDoc[], options: RenderOptions): string {
  return modules.map((module) => renderSection(module, options)).join("\n\n");
}

/**
 * Place the table of contents into a Markdown document
 *
 * When the document already contains a fenced block, its contents are
 * replaced; otherwise the fenced block is appended to the end
 */
export function injectTableOfContents(contents: string, toc: string): string {
  const block = `${START_FENCE}\n\n${toc}\n\n${END_FENCE}`;

  if (FENCE_PATTERN.test(contents)) {
    return contents.replace(FENCE_PATTERN, block);
  }

  const existing = contents.trimEnd();

  return existing.length > 0 ? `${existing}\n\n${block}\n` : `${block}\n`;
}

function renderSection(module: ModuleDoc, options: RenderOptions): string {
  const heading = "#".repeat(options.headingLevel ?? 3);
  const target = path.relative(options.relativeTo, module.file);
  const documentation = module.documentation?.trim();

  return [
    `${heading} [\`${module.subpath}\`](${target})`,
    ...(documentation ? ["", documentation] : []),
    // A module can be listed even when every export is hidden; skip the table
    // rather than render one with no rows
    ...(module.exports.length > 0
      ? [
          "",
          "| Export | Description |",
          "| ------ | ----------- |",
          ...module.exports.map(
            (exportDoc) => `| ${linkTo(exportDoc, options)} | ${descriptionOf(exportDoc)} |`,
          ),
        ]
      : []),
  ].join("\n");
}

function linkTo(exportDoc: ExportDoc, options: RenderOptions): string {
  const name = `\`${exportDoc.name}\``;

  if (!exportDoc.location) {
    return name;
  }

  const target = path.relative(options.relativeTo, exportDoc.location.file);

  return `[${name}](${target}#L${exportDoc.location.line})`;
}

/**
 * The brief description of an export, in order of precedence: the full
 * `@summary` tag; the first sentence of the JSDoc comment, up to a period;
 * or the comment's first paragraph, up to an empty line
 */
function descriptionOf(exportDoc: ExportDoc): string {
  const summary = exportDoc.tags.find((tag) => tag.name === "summary");
  const description = summary ? summary.text : implicitSummaryOf(exportDoc.documentation);

  // Keep the description on a single line and inside its table cell
  return description.replaceAll(/\s+/g, " ").replaceAll("|", "\\|").trim();
}

/**
 * The first sentence of the comment or its first paragraph, whichever ends
 * first; a sentence may wrap across lines, but never past an empty line
 */
function implicitSummaryOf(documentation: string): string {
  const paragraph = documentation.split(/\n\s*\n/, 1)[0] ?? "";
  const sentence = /^[\s\S]*?\./.exec(paragraph);

  return sentence ? sentence[0] : paragraph;
}
