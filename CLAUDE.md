# CLAUDE.md

## Running Tasks

Always use `mise` to execute tasks in this project (e.g. `mise run test`, `mise run build`). Do not invoke `tsc`, `node --test`, or other underlying tools directly — the task definitions in `mise.toml` are the source of truth.

Common tasks:

- `mise run build` — compile TypeScript to JavaScript
- `mise run test` — run the full suite (format check, typecheck, unit tests)
- `mise run test:unit` — run just the unit tests
- `mise run typecheck` — run type-checking
- `mise run format` — format files

## Testing

- Tests are written using the built-in `node:test` setup (run via `mise run test:unit`).
- When writing tests, prefer fixture examples over unit tests: add an end-to-end fixture scenario under `test/fixtures/` (exercised by `test/fixtures.test.ts`) rather than a narrow unit test, whenever possible.
