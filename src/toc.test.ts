import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { ModuleDoc } from "./parser.ts";
import { END_FENCE, injectTableOfContents, renderTableOfContents, START_FENCE } from "./toc.ts";

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
      "### `.`",
      "",
      "| Export | Description |",
      "| ------ | ----------- |",
      "| [`add`](types/index.d.ts#L8) | Adds two numbers together. |",
      "| [`multiply`](types/index.d.ts#L16) | Multiplies two numbers. |",
    ].join("\n"),
  );
});

test("omits subpaths that have no exports", () => {
  const toc = renderTableOfContents(modules, { relativeTo: "/package" });

  assert.ok(!toc.includes("./empty"));
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
      "### `./documented`",
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
