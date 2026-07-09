import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";

import { resolve } from "./resolver.ts";

const fixturePath = path.join(import.meta.dirname, "../test/fixtures/basic/package.json");

test("resolves each subpath through the `exports` field", async () => {
  const { entries } = await resolve(fixturePath);
  const bySubpath = new Map(entries.map((entry) => [entry.subpath, entry]));

  const root = bySubpath.get(".");
  assert.ok(root, "the `.` subpath resolves");
  assert.match(root.resolvedFileName, /types\/index\.d\.ts$/);
  assert.equal(root.isDeclarationFile, true);

  const util = bySubpath.get("./util");
  assert.ok(util, "the `./util` subpath resolves");
  assert.match(util.resolvedFileName, /lib\/util\.js$/);
  assert.equal(util.isDeclarationFile, false);
});

test("warns about wildcard subpaths", async () => {
  const { entries, warnings } = await resolve(fixturePath);

  assert.ok(warnings.some((warning) => warning.includes("./wild/*")));
  assert.ok(!entries.some((entry) => entry.subpath.includes("*")));
});
