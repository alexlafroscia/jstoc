import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";

import { resolve } from "./resolver.ts";

function fixturePath(name: string): string {
  return path.join(import.meta.dirname, `../test/fixtures/${name}/package.json`);
}

test("prefers the `types` condition and flags declaration files", async () => {
  const { entries } = await resolve(fixturePath("typescript"));

  const root = entries.find((entry) => entry.subpath === ".");
  assert.ok(root, "the `.` subpath resolves");
  assert.match(root.resolvedFileName, /dist\/index\.d\.ts$/);
  assert.equal(root.isDeclarationFile, true);
});

test("warns about wildcard subpaths", async () => {
  const { entries, warnings } = await resolve(fixturePath("wildcard"));

  assert.ok(warnings.some((warning) => warning.includes("./wild/*")));
  assert.ok(!entries.some((entry) => entry.subpath.includes("*")));
});
