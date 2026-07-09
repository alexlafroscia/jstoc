#!/usr/bin/env node
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { parse } from "./parser.ts";
import { resolve } from "./resolver.ts";
import { injectTableOfContents, renderTableOfContents } from "./toc.ts";

const [packageJsonArg, readmeArg] = process.argv.slice(2);

const input = path.resolve(packageJsonArg ?? process.cwd());
const stats = await fs.stat(input);
const packageJsonPath = stats.isDirectory() ? path.join(input, "package.json") : input;

const readmePath = path.resolve(readmeArg ?? path.join(path.dirname(packageJsonPath), "README.md"));

const { entries, warnings } = await resolve(packageJsonPath);

for (const warning of warnings) {
  console.error(`warning: ${warning}`);
}

const toc = renderTableOfContents(parse(entries), {
  relativeTo: path.dirname(readmePath),
});

const readme = await fs.readFile(readmePath, { encoding: "utf8" }).catch((error) => {
  if (error.code === "ENOENT") {
    return "";
  }

  throw error;
});

await fs.writeFile(readmePath, injectTableOfContents(readme, toc));
