import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { ModuleDoc } from "./parser.ts";
import {
  detectHeadingLevel,
  END_FENCE,
  injectTableOfContents,
  renderTableOfContents,
  START_FENCE,
} from "./toc.ts";

const modules: ModuleDoc[] = [
  {
    subpath: ".",
    file: "/package/types/index.d.ts",
    exports: [
      {
        name: "add",
        kind: "function",
        documentation: "Adds two numbers together.\n\nMore detail that should not appear.",
        tags: [],
        location: { file: "/package/types/index.d.ts", line: 8 },
      },
      {
        name: "multiply",
        kind: "function",
        documentation: "A long-winded description.",
        tags: [{ name: "summary", text: "Multiplies two numbers." }],
        location: { file: "/package/types/index.d.ts", line: 16 },
      },
    ],
  },
  {
    subpath: "./empty",
    file: "/package/lib/empty.js",
    exports: [],
  },
];

test("renders a section per subpath with a table of exports", () => {
  const toc = renderTableOfContents(modules, { relativeTo: "/package" });

  assert.equal(
    toc,
    [
      "### [`.`](types/index.d.ts)",
      "",
      "| Export | Description |",
      "| ------ | ----------- |",
      "| [`add`](types/index.d.ts#L8) | Adds two numbers together. |",
      "| [`multiply`](types/index.d.ts#L16) | Multiplies two numbers. |",
      "",
      "### [`./empty`](lib/empty.js)",
    ].join("\n"),
  );
});

test("renders a subpath with no exports as a heading without a table", () => {
  const toc = renderTableOfContents(modules, { relativeTo: "/package" });

  assert.ok(toc.endsWith("### [`./empty`](lib/empty.js)"));
});

test("renders module documentation under the heading, before the table", () => {
  const documented: ModuleDoc[] = [
    {
      subpath: "./documented",
      file: "/package/lib/documented.js",
      documentation: "Utilities for doing a thing.",
      exports: [
        {
          name: "doThing",
          kind: "function",
          documentation: "Does the thing.",
          tags: [],
        },
      ],
    },
  ];

  const toc = renderTableOfContents(documented, { relativeTo: "/package" });

  assert.equal(
    toc,
    [
      "### [`./documented`](lib/documented.js)",
      "",
      "Utilities for doing a thing.",
      "",
      "| Export | Description |",
      "| ------ | ----------- |",
      "| `doThing` | Does the thing. |",
    ].join("\n"),
  );
});

test("appends a fenced block when the document has none", () => {
  const result = injectTableOfContents("# My Package\n\nSome prose.\n", "TOC");

  assert.equal(result, `# My Package\n\nSome prose.\n\n${START_FENCE}\n\nTOC\n\n${END_FENCE}\n`);
});

test("creates the fenced block in an empty document", () => {
  const result = injectTableOfContents("", "TOC");

  assert.equal(result, `${START_FENCE}\n\nTOC\n\n${END_FENCE}\n`);
});

test("replaces the contents of an existing fence", () => {
  const original = `# My Package\n\n${START_FENCE}\n\nstale\n\n${END_FENCE}\n\nTrailing prose.\n`;

  const result = injectTableOfContents(original, "fresh");

  assert.equal(
    result,
    `# My Package\n\n${START_FENCE}\n\nfresh\n\n${END_FENCE}\n\nTrailing prose.\n`,
  );
});

test("renders sections at the requested heading level", () => {
  const toc = renderTableOfContents(modules, { relativeTo: "/package", headingLevel: 2 });

  assert.ok(toc.startsWith("## [`.`](types/index.d.ts)"));
});

test("detects one level deeper than the nearest heading above the fence", () => {
  const contents = `# Title\n\n## API\n\n${START_FENCE}\n\nstale\n\n${END_FENCE}\n`;

  assert.equal(detectHeadingLevel(contents), 3);
});

test("ignores headings that come after the fence", () => {
  const contents = `# Title\n\n#### Deep\n\n${START_FENCE}\n\nstale\n\n${END_FENCE}\n\n## After\n`;

  assert.equal(detectHeadingLevel(contents), 5);
});

test("falls back to a level-3 heading when nothing precedes the fence", () => {
  assert.equal(detectHeadingLevel("Some prose with no headings.\n"), 3);
});

test("caps at a level-6 heading", () => {
  assert.equal(detectHeadingLevel("###### Deepest\n"), 6);
});
