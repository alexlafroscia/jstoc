# CLAUDE.md

## Running Tasks

Always use `mise` to execute tasks in this project (e.g. `mise run test`, `mise run build`). Do not invoke `tsc`, `node --test`, or other underlying tools directly — the task definitions in `mise.toml` are the source of truth.

Common tasks:

- `mise run build` — compile TypeScript to JavaScript
- `mise run test` — run the full suite (format check, typecheck, unit tests)
- `mise run test:unit` — run just the unit tests
- `mise run typecheck` — run type-checking
- `mise run format` — format files

`pnpm` commands should always be executed through `mise exec` (e.g. `mise exec -- pnpm install`), so they use the tool versions pinned in `mise.toml`.

## Changesets

Important changes should always have a changeset generated for them (via `mise changeset`, or by adding a markdown file under `.changeset/`) so they are included in the changelog and trigger a release.

## Testing

- Tests are written using the built-in `node:test` setup (run via `mise run test:unit`).
- When writing tests, prefer fixture examples over unit tests: add an end-to-end fixture scenario under `test/fixtures/` (exercised by `test/fixtures.test.ts`) rather than a narrow unit test, whenever possible.
