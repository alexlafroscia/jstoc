import * as fs from "node:fs/promises";
import * as path from "node:path";

import ts from "typescript";

import { PackageJSON } from "./package-json.ts";

export interface ResolvedEntry {
  /** The `exports` key, e.g. `"."` or `"./parser"` */
  subpath: string;

  /** Absolute path to the file that should be analyzed for this subpath */
  resolvedFileName: string;

  /** Whether the resolved file is a `.d.ts`/`.d.mts`/`.d.cts` declaration file */
  isDeclarationFile: boolean;
}

export interface ResolveResult {
  entries: ResolvedEntry[];

  /** Subpaths that could not be handled, with the reason why */
  warnings: string[];
}

// Mirrors how a consumer would import the package; TypeScript's resolver
// prefers the `types` condition (or a sibling `.d.ts`) and falls back to
// the JavaScript target thanks to `allowJs`
const COMPILER_OPTIONS: ts.CompilerOptions = {
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  allowJs: true,
};

/**
 * Resolve each subpath of a package's `exports` field to the file that
 * documentation should be read from
 */
export async function resolve(packageJsonPath: string): Promise<ResolveResult> {
  const packageJsonContents = await fs.readFile(packageJsonPath, {
    encoding: "utf8",
  });

  const packageJson = PackageJSON.parse(JSON.parse(packageJsonContents));
  const packageDir = path.dirname(path.resolve(packageJsonPath));

  // Resolution is always performed relative to an importing file. This file
  // never has to exist -- only its location matters. Placing it inside the
  // package directory activates Node's self-reference rule, letting us
  // resolve `<name>/<subpath>` through the package's own `exports` field
  // without the package being installed anywhere
  const containingFile = path.join(packageDir, "__jstoc__.ts");

  const entries: ResolvedEntry[] = [];
  const warnings: string[] = [];

  for (const subpath of subpathsOf(packageJson.exports)) {
    if (subpath.includes("*")) {
      warnings.push(`wildcard subpath "${subpath}" is not yet supported`);
      continue;
    }

    const specifier =
      subpath === "." ? packageJson.name : `${packageJson.name}/${subpath.slice(2)}`;

    const { resolvedModule } = ts.resolveModuleName(
      specifier,
      containingFile,
      COMPILER_OPTIONS,
      ts.sys,
      undefined,
      undefined,
      ts.ModuleKind.ESNext,
    );

    if (!resolvedModule) {
      warnings.push(`subpath "${subpath}" could not be resolved to a file`);
      continue;
    }

    entries.push({
      subpath,
      resolvedFileName: resolvedModule.resolvedFileName,
      isDeclarationFile: /\.d\.[cm]?ts$/.test(resolvedModule.resolvedFileName),
    });
  }

  return { entries, warnings };
}

/**
 * Enumerate the subpath keys of an `exports` field
 *
 * A missing `exports` field, a bare string, an array, or an object of
 * conditions all describe a single entry point: `"."`
 */
function subpathsOf(exports: PackageJSON["exports"]): string[] {
  if (typeof exports !== "object" || exports === null || Array.isArray(exports)) {
    return ["."];
  }

  const keys = Object.keys(exports);

  if (keys.every((key) => key.startsWith("."))) {
    return keys;
  }

  return ["."];
}
