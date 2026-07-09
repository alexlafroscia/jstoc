import * as fs from "node:fs";
import * as path from "node:path";

interface ParsedSourceMap {
  sources: string[];
  sourceRoot?: string;

  /** One entry per generated line; each is a `[genColumn, sourceIndex, sourceLine, sourceColumn]` tuple */
  mappings: number[][][];
}

const cache = new Map<string, ParsedSourceMap | undefined>();

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function decodeVLQ(segment: string): number[] {
  const fields: number[] = [];
  let shift = 0;
  let value = 0;

  for (const char of segment) {
    const digit = BASE64_ALPHABET.indexOf(char);
    const continues = (digit & 32) !== 0;

    value += (digit & 31) << shift;

    if (continues) {
      shift += 5;
      continue;
    }

    fields.push(value & 1 ? -(value >>> 1) : value >>> 1);
    value = 0;
    shift = 0;
  }

  return fields;
}

// Source-map columns/lines are deltas from the previous field of the same
// kind; `sourceIndex`/`sourceLine`/`sourceColumn` accumulate across the
// whole file, while `genColumn` resets at the start of every line
function parseMappings(mappings: string): number[][][] {
  let sourceIndex = 0;
  let sourceLine = 0;
  let sourceColumn = 0;

  return mappings.split(";").map((line) => {
    let genColumn = 0;

    return (line.length === 0 ? [] : line.split(","))
      .map((rawSegment) => decodeVLQ(rawSegment))
      .filter((fields) => fields.length >= 4)
      .map((fields) => {
        genColumn += fields[0] ?? 0;
        sourceIndex += fields[1] ?? 0;
        sourceLine += fields[2] ?? 0;
        sourceColumn += fields[3] ?? 0;

        return [genColumn, sourceIndex, sourceLine, sourceColumn];
      });
  });
}

function loadSourceMap(mapPath: string): ParsedSourceMap | undefined {
  if (cache.has(mapPath)) {
    return cache.get(mapPath);
  }

  let parsed: ParsedSourceMap | undefined;

  try {
    const raw: unknown = JSON.parse(fs.readFileSync(mapPath, "utf8"));

    if (typeof raw === "object" && raw !== null && "mappings" in raw) {
      const map = raw as { sources?: unknown; sourceRoot?: unknown; mappings?: unknown };

      parsed = {
        sources: Array.isArray(map.sources) ? map.sources : [],
        sourceRoot: typeof map.sourceRoot === "string" ? map.sourceRoot : undefined,
        mappings: parseMappings(typeof map.mappings === "string" ? map.mappings : ""),
      };
    }
  } catch {
    parsed = undefined;
  }

  cache.set(mapPath, parsed);
  return parsed;
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
  const segments = map?.mappings[line];

  if (!map || !segments || segments.length === 0) {
    return undefined;
  }

  // Find the segment covering `character`: the last one starting at or before it
  let match = segments[0];
  for (const segment of segments) {
    if (segment[0] > character) break;
    match = segment;
  }

  const [, sourceIndex, sourceLine] = match;
  const source = map.sources[sourceIndex];

  if (source === undefined) {
    return undefined;
  }

  return {
    file: path.resolve(path.dirname(mapPath), map.sourceRoot ?? "", source),
    line: sourceLine + 1,
  };
}
