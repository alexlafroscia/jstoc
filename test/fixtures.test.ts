import * as assert from "node:assert/strict";
import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";

import { run } from "../src/bin.ts";

const exec = promisify(execFile);

const PROJECT_DIR = path.join(import.meta.dirname, "..");
const FIXTURES_DIR = path.join(import.meta.dirname, "fixtures");
const OXFMT = path.join(PROJECT_DIR, "node_modules/.bin/oxfmt");

// Re-generate each fixture's README instead of asserting against it
const UPDATE = Boolean(process.env.UPDATE_FIXTURES);

/**
 * Each directory in `fixtures` is a scenario: a package whose README holds
 * the table of contents the program is expected to generate for it. The
 * package is copied somewhere temporary, the program is run against the copy
 * end-to-end, and the resulting README must match the committed one.
 *
 * The generated README is passed through `oxfmt` before comparing, since the
 * committed fixtures are formatted along with the rest of the repository.
 */
for (const entry of await fs.readdir(FIXTURES_DIR, { withFileTypes: true })) {
  if (!entry.isDirectory()) {
    continue;
  }

  test(`fixture: ${entry.name}`, async () => {
    const fixtureDir = path.join(FIXTURES_DIR, entry.name);
    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `jstoc-${entry.name}-`));
    const workReadme = path.join(workDir, "README.md");

    try {
      await fs.cp(fixtureDir, workDir, { recursive: true });

      await run([workDir, workReadme]);
      await exec(OXFMT, [workReadme], { cwd: PROJECT_DIR });

      const generated = await fs.readFile(workReadme, "utf8");

      if (UPDATE) {
        await fs.writeFile(path.join(fixtureDir, "README.md"), generated);
        return;
      }

      const committed = await fs
        .readFile(path.join(fixtureDir, "README.md"), "utf8")
        .catch(() => "");

      assert.equal(
        generated,
        committed,
        "the generated README does not match the fixture; run the tests with UPDATE_FIXTURES=1 to accept the new output",
      );
    } finally {
      await fs.rm(workDir, { recursive: true, force: true });
    }
  });
}
