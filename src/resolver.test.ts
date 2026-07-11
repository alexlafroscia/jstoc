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

test("enumerates wildcard subpaths against the files that match them", async () => {
  const { entries, warnings } = await resolve(fixturePath("wildcard"));

  assert.deepEqual(warnings, []);
  assert.ok(!entries.some((entry) => entry.subpath.includes("*")));

  const one = entries.find((entry) => entry.subpath === "./wild/one");
  assert.ok(one, "the `./wild/*` pattern resolves `./wild/one`");
  assert.match(one.resolvedFileName, /lib\/one\.js$/);

  const two = entries.find((entry) => entry.subpath === "./wild/two");
  assert.ok(two, "the `./wild/*` pattern resolves `./wild/two`");
  assert.match(two.resolvedFileName, /lib\/two\.js$/);
});

test("warns when a wildcard subpath matches no files", async () => {
  const { entries, warnings } = await resolve(fixturePath("wildcard-empty"));

  assert.ok(warnings.some((warning) => warning.includes("./wild/*")));
  assert.ok(!entries.some((entry) => entry.subpath.includes("*")));
});
