import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import ts from "typescript";

import { traceToSource } from "./source-map.ts";

/** Compile a `.ts` source string with a declaration map, mirroring this project's own build */
function compileWithDeclarationMap(source: string): {
  sourceFile: string;
  declarationFile: string;
} {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "jstoc-source-map-"));
  const srcDir = path.join(tmpDir, "src");
  const outDir = path.join(tmpDir, "dist");
  fs.mkdirSync(srcDir);

  const sourceFile = path.join(srcDir, "example.ts");
  fs.writeFileSync(sourceFile, source);

  const program = ts.createProgram([sourceFile], {
    declaration: true,
    declarationMap: true,
    emitDeclarationOnly: true,
    outDir,
    rootDir: srcDir,
  });
  program.emit();

  return { sourceFile, declarationFile: path.join(outDir, "example.d.ts") };
}

test("traces a generated declaration back to its original source location", () => {
  const { sourceFile, declarationFile } = compileWithDeclarationMap(
    "export function add(a: number, b: number): number {\n  return a + b;\n}\n",
  );

  const declaration = fs.readFileSync(declarationFile, "utf8");
  const line = declaration.split("\n").findIndex((text) => text.includes("declare function add"));
  assert.ok(line >= 0, "the declaration is present in the emitted `.d.ts`");

  const traced = traceToSource(declarationFile, line, 0);

  assert.deepEqual(traced, { file: sourceFile, line: 1 });
});

test("returns undefined when no `.map` file is present", () => {
  const traced = traceToSource(import.meta.filename, 0, 0);

  assert.equal(traced, undefined);
});
