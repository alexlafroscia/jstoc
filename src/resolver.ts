import * as fs from "node:fs/promises";
import * as path from "node:path";

import ts from "typescript";

import { type ExportValue, PackageJSON } from "./package-json.ts";

/** @ignore hide from jstoc */
export interface ResolvedEntry {
  /** The `exports` key, e.g. `"."` or `"./parser"` */
  subpath: string;

  /** Absolute path to the file that should be analyzed for this subpath */
  resolvedFileName: string;

  /** Whether the resolved file is a `.d.ts`/`.d.mts`/`.d.cts` declaration file */
  isDeclarationFile: boolean;
}

/** @ignore hide from jstoc */
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
      const exportValue = (packageJson.exports as Record<string, ExportValue>)[subpath];
      const concreteSubpaths = await enumerateWildcardSubpaths(subpath, exportValue, packageDir);

      if (concreteSubpaths.length === 0) {
        warnings.push(`wildcard subpath "${subpath}" did not match any files`);
        continue;
      }

      for (const concreteSubpath of concreteSubpaths) {
        resolveSubpath(concreteSubpath, packageJson.name, containingFile, entries, warnings);
      }

      continue;
    }

    resolveSubpath(subpath, packageJson.name, containingFile, entries, warnings);
  }

  return { entries, warnings };
}

/**
 * Resolve a single, concrete (non-wildcard) subpath to the file that
 * documentation should be read from, recording the result in `entries` or a
 * failure in `warnings`
 */
function resolveSubpath(
  subpath: string,
  packageName: string,
  containingFile: string,
  entries: ResolvedEntry[],
  warnings: string[],
): void {
  const specifier = subpath === "." ? packageName : `${packageName}/${subpath.slice(2)}`;

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
    return;
  }

  entries.push({
    subpath,
    resolvedFileName: resolvedModule.resolvedFileName,
    isDeclarationFile: /\.d\.[cm]?ts$/.test(resolvedModule.resolvedFileName),
  });
}

/**
 * Expand a wildcard subpath (e.g. `"./wild/*"`) into the concrete subpaths
 * (e.g. `"./wild/one"`) implied by the files on disk that match the
 * pattern(s) it maps to
 */
async function enumerateWildcardSubpaths(
  subpath: string,
  exportValue: ExportValue,
  packageDir: string,
): Promise<string[]> {
  const concreteSubpaths = new Set<string>();

  for (const pattern of patternsOf(exportValue)) {
    const glob = pattern.replace(/^\.\//, "");
    const matcher = new RegExp(`^${escapeRegExp(pattern).replace("\\*", "(.+)")}$`);

    for await (const match of fs.glob(glob, { cwd: packageDir })) {
      const normalized = `./${match.split(path.sep).join("/")}`;
      const captured = matcher.exec(normalized)?.[1];

      if (captured !== undefined) {
        concreteSubpaths.add(subpath.replace("*", captured));
      }
    }
  }

  return [...concreteSubpaths].sort();
}

/**
 * Collect every string pattern reachable from an `exports` value, e.g. every
 * condition's target when a wildcard subpath maps to a conditions object
 */
function patternsOf(value: ExportValue): string[] {
  if (typeof value === "string") {
    return value.includes("*") ? [value] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(patternsOf);
  }

  if (value !== null && typeof value === "object") {
    return Object.values(value).flatMap(patternsOf);
  }

  return [];
}

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
