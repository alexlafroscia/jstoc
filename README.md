# JSToc

Generate a "table of contents" for your JS package from your JSDoc comments.

Reads your `package.json#exports` configuration to automatically detect your package's exports to help you make sure nothing is missing!

## Usage

Run the `jstoc` executable, providing a path to your `package.json` and `README.md` if they are not in the standard location:

```bash
jstoc ./package.json ./README.md
```

The generated contents will be inserted between "fence" comments containing `jstoc:start` and `jstoc:end`, respectively. These will be inserted for you automatically the first time you run the tool.

It's recommended that you set up a tool like `husky` to automatically run `jstoc` as part of your pre-commit hooks.

## Module API

<!-- jstoc:start -->

### `./parser`

| Export                              | Description                                                              |
| ----------------------------------- | ------------------------------------------------------------------------ |
| [`parse`](dist/parser.d.ts#L36)     | Extract the JSDoc documentation for every symbol exported from the given |
| [`JSDocTag`](dist/parser.d.ts#L2)   |                                                                          |
| [`ExportDoc`](dist/parser.d.ts#L8)  |                                                                          |
| [`ModuleDoc`](dist/parser.d.ts#L22) |                                                                          |

<!-- jstoc:end -->
