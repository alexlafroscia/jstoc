#!/usr/bin/env node
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { parse } from "./parser.ts";
import { resolve } from "./resolver.ts";

const input = path.resolve(process.argv[2] ?? process.cwd());
const stats = await fs.stat(input);
const packageJsonPath = stats.isDirectory() ? path.join(input, "package.json") : input;

const { entries, warnings } = await resolve(packageJsonPath);

for (const warning of warnings) {
  console.error(`warning: ${warning}`);
}

console.log(JSON.stringify(parse(entries), null, 2));
