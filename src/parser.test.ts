import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";

import { parse } from "./parser.ts";
import { resolve } from "./resolver.ts";

const fixturePath = path.join(import.meta.dirname, "../test/fixtures/basic/package.json");

async function parseFixture() {
  const { entries } = await resolve(fixturePath);

  return parse(entries);
}

test("extracts JSDoc for each exported symbol", async () => {
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

  const multiply = root.exports.find((exportDoc) => exportDoc.name === "multiply");
  assert.ok(multiply, "`multiply` is exported");
  assert.deepEqual(multiply.tags, [{ name: "summary", text: "Multiplies two numbers." }]);

  const undocumented = root.exports.find((exportDoc) => exportDoc.name === "undocumented");
  assert.ok(undocumented, "`undocumented` is exported");
  assert.equal(undocumented.kind, "variable");
  assert.equal(undocumented.documentation, "");
  assert.deepEqual(undocumented.tags, []);
});

test("follows re-exports to the documented declaration", async () => {
  const modules = await parseFixture();

  const root = modules.find((module) => module.subpath === ".");
  assert.ok(root);

  const greet = root.exports.find((exportDoc) => exportDoc.name === "greet");
  assert.ok(greet, "`greet` is re-exported from the entry point");
  assert.equal(greet.documentation, "Greets someone by name.");
  assert.match(greet.location?.file ?? "", /types\/greet\.d\.ts$/);
});

test("reads JSDoc from plain JavaScript files", async () => {
  const modules = await parseFixture();

  const util = modules.find((module) => module.subpath === "./util");
  assert.ok(util, "the `./util` module is present");

  const shout = util.exports.find((exportDoc) => exportDoc.name === "shout");
  assert.ok(shout, "`shout` is exported");
  assert.equal(shout.kind, "function");
  assert.equal(shout.documentation, "Shouts a string.");
  assert.deepEqual(shout.tags, [{ name: "deprecated", text: "prefer lowercase" }]);
});

test("reads the file's `@module` comment as its documentation", async () => {
  const modules = await parseFixture();

  const util = modules.find((module) => module.subpath === "./util");
  assert.ok(util, "the `./util` module is present");
  assert.equal(util.documentation, "Miscellaneous string utilities.");
});

test("leaves `documentation` undefined when there is no `@module` comment", async () => {
  const modules = await parseFixture();

  const root = modules.find((module) => module.subpath === ".");
  assert.ok(root, "the `.` module is present");
  assert.equal(root.documentation, undefined);
});
