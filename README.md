# JSToc

Generate a "table of contents" for your JS package from your JSDoc comments.

`jstoc` reads your `package.json#exports` configuration to detect what your package actually exposes to users, leveraging source- or declaration maps where necessary to trace your build output back to the source code to link to. JSDoc comments are parsed to provide a description of each function

## CLI Usage

Run the `jstoc` executable, providing a path to your `package.json` and `README.md` if they are not in the standard location:

```bash
jstoc ./package.json ./README.md
```

The generated contents will be inserted between "fence" comments containing `jstoc:start` and `jstoc:end`, respectively. These will be inserted for you automatically the first time you run the tool.

It's recommended that you set up a tool like `husky` to automatically run `jstoc` as part of your pre-commit hooks.

## Module API

A JS API is also provided if you want more control over the process. The details below are generated using `jstoc`!

<!-- jstoc:start -->

### `./parser`

| Export                           | Description                                                              |
| -------------------------------- | ------------------------------------------------------------------------ |
| [`parse`](src/parser.ts#L53)     | Extract the JSDoc documentation for every symbol exported from the given |
| [`JSDocTag`](src/parser.ts#L6)   |                                                                          |
| [`ExportDoc`](src/parser.ts#L14) |                                                                          |
| [`ModuleDoc`](src/parser.ts#L33) |                                                                          |

<!-- jstoc:end -->
