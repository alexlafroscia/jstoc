import * as fs from "node:fs";

import { originalPositionFor, TraceMap } from "@jridgewell/trace-mapping";

const cache = new Map<string, TraceMap | undefined>();

function loadSourceMap(mapPath: string): TraceMap | undefined {
  if (cache.has(mapPath)) {
    return cache.get(mapPath);
  }

  let map: TraceMap | undefined;

  try {
    map = new TraceMap(fs.readFileSync(mapPath, "utf8"), mapPath);
  } catch {
    map = undefined;
  }

  cache.set(mapPath, map);
  return map;
}

/**
 * Trace a generated file back through its `.map` file to the original source
 * file it was produced from, when a declaration/source map is available
 */
export function traceFileToSource(generatedFile: string): string | undefined {
  const map = loadSourceMap(`${generatedFile}.map`);

  return map?.resolvedSources[0] ?? undefined;
}

/**
 * Trace a position in a generated file back through its `.map` file to the
 * original source location, when a declaration/source map is available
 */
export function traceToSource(
  generatedFile: string,
  line: number,
  character: number,
): { file: string; line: number } | undefined {
  const mapPath = `${generatedFile}.map`;

  if (!fs.existsSync(mapPath)) {
    return undefined;
  }

  const map = loadSourceMap(mapPath);

  if (!map) {
    return undefined;
  }

  // `originalPositionFor` expects a 1-based line and 0-based column
  const position = originalPositionFor(map, { line: line + 1, column: character });

  if (position.source === null || position.line === null) {
    return undefined;
  }

  return { file: position.source, line: position.line };
}
