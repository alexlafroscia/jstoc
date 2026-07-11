# JSToc

Generate a "table of contents" for your JS package from your JSDoc comments.

`jstoc` reads your `package.json#exports` configuration to detect what your package actually exposes to users, leveraging source- or declaration maps where necessary to trace your build output back to the relevant source code. JSDoc comments are parsed to provide a description of each function

## CLI Usage

Run the `jstoc` executable, providing a path to your `package.json` and `README.md` if they are not in the standard location:

```bash
# Install the package
pnpm add -D @alexlafroscia/jstoc

# Make sure your build output exists first
pnpm run build

# Inject the TOC into your README
pnpm exec jstoc ./package.json ./README.md
```

The generated contents will be inserted between "fence" comments containing `jstoc:start` and `jstoc:end`, respectively. These will be inserted for you automatically the first time you run the tool.

It's recommended that you set up tools like `husky` and `lint-staged` to automatically run `jstoc` as part of your pre-commit hooks. Check out [this package's configuration](./config/lint-staged.config.mjs#L10-L14) for an example. You may also want to ensure that running `jstoc` does not result in a change to your README as part of [your package's CI](./.github/workflows/ci.yml#19-21).

## Module API

A JS API is also provided if you want more control over the process. The details below are generated using `jstoc`!

<!-- jstoc:start -->

### [`./resolver`](src/resolver.ts)

| Export                           | Description                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [`resolve`](src/resolver.ts#L41) | Resolve each subpath of a package's `exports` field to the file that documentation should be read from |

### [`./parser`](src/parser.ts)

| Export                       | Description                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| [`parse`](src/parser.ts#L68) | Extract the JSDoc documentation for every symbol exported from the given entry points |

<!-- jstoc:end -->
