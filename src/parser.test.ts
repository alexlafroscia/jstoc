import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";

import { parse } from "./parser.ts";
import { resolve } from "./resolver.ts";

const fixturePath = path.join(import.meta.dirname, "../test/fixtures/javascript/package.json");

async function parseFixture() {
  const { entries } = await resolve(fixturePath);

  return parse(entries);
}

test("extracts the name, kind, documentation, and tags of each export", async () => {
  const modules = await parseFixture();

  const root = modules.find((module) => module.subpath === ".");
  assert.ok(root, "the `.` module is present");

  const add = root.exports.find((exportDoc) => exportDoc.name === "add");
  assert.ok(add, "`add` is exported");
  assert.equal(add.kind, "function");
  assert.equal(add.documentation, "Adds two numbers together.");
  assert.deepEqual(add.tags, [
    { name: "param", text: "a - the first number" },
    { name: "param", text: "b - the second number" },
    { name: "returns", text: "the sum of both numbers" },
  ]);

  const undocumented = root.exports.find((exportDoc) => exportDoc.name === "undocumented");
  assert.ok(undocumented, "`undocumented` is exported");
  assert.equal(undocumented.kind, "variable");
  assert.equal(undocumented.documentation, "");
  assert.deepEqual(undocumented.tags, []);
});
