import ts from "typescript";

import type { ResolvedEntry } from "./resolver.ts";

export interface JSDocTag {
  /** The tag name, without the `@`, e.g. `"param"` or `"deprecated"` */
  name: string;

  /** The text following the tag, e.g. `"a - the first number"` */
  text: string;
}

export interface ExportDoc {
  /** The name the symbol is exported under */
  name: string;

  /** What kind of thing is exported, e.g. `"function"` or `"class"` */
  kind: string;

  /** The JSDoc description, without any tags; empty when undocumented */
  documentation: string;

  tags: JSDocTag[];

  /** Where the underlying declaration lives */
  location?: {
    file: string;
    line: number;
  };
}

export interface ModuleDoc {
  /** The `exports` key this module was reached through, e.g. `"./parser"` */
  subpath: string;

  /** Absolute path of the file the exports were read from */
  file: string;

  /** The description from the file's `@module` JSDoc comment, when present */
  documentation?: string;

  exports: ExportDoc[];
}

/**
 * Extract the JSDoc documentation for every symbol exported from the given
 * entry points
 *
 * Re-exports (`export { x } from`, `export * from`) are followed to the
 * declaration that actually carries the documentation.
 */
export function parse(entries: ResolvedEntry[]): ModuleDoc[] {
  const program = ts.createProgram(
    entries.map((entry) => entry.resolvedFileName),
    {
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      allowJs: true,
      checkJs: false,
      noEmit: true,
    },
  );
  const checker = program.getTypeChecker();

  return entries.map((entry) => ({
    subpath: entry.subpath,
    file: entry.resolvedFileName,
    documentation: moduleDocumentationOf(program, entry.resolvedFileName),
    exports: exportsOf(program, checker, entry.resolvedFileName),
  }));
}

// Not part of TypeScript's public API surface, but exported at runtime; used
// to parse a comment range into a JSDoc node without a full AST re-parse
const parseIsolatedJSDocComment = (
  ts as unknown as {
    parseIsolatedJSDocComment: (
      text: string,
      start: number,
      length: number,
    ) => { jsDoc?: ts.JSDoc } | undefined;
  }
).parseIsolatedJSDocComment;

/**
 * Read the file's `@module` JSDoc comment, if it has one: a comment tagged
 * `@module` that appears before any code
 */
function moduleDocumentationOf(program: ts.Program, fileName: string): string | undefined {
  const sourceFile = program.getSourceFile(fileName);

  if (!sourceFile) {
    return undefined;
  }

  const commentRanges = ts.getLeadingCommentRanges(sourceFile.text, 0) ?? [];

  for (const range of commentRanges) {
    if (sourceFile.text.slice(range.pos, range.pos + 3) !== "/**") {
      continue;
    }

    const { jsDoc } =
      parseIsolatedJSDocComment(sourceFile.text, range.pos, range.end - range.pos) ?? {};

    if (jsDoc?.tags?.some((tag) => tag.tagName.text === "module")) {
      return ts.getTextOfJSDocComment(jsDoc.comment) ?? "";
    }
  }

  return undefined;
}

function exportsOf(program: ts.Program, checker: ts.TypeChecker, fileName: string): ExportDoc[] {
  const sourceFile = program.getSourceFile(fileName);

  if (!sourceFile) {
    return [];
  }

  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);

  // A file with no imports or exports is a script, not a module
  if (!moduleSymbol) {
    return [];
  }

  return checker.getExportsOfModule(moduleSymbol).map((exportSymbol) => {
    const name = exportSymbol.getName();

    // Re-exports are aliases; hop to the declaration carrying the JSDoc
    const symbol =
      exportSymbol.flags & ts.SymbolFlags.Alias
        ? checker.getAliasedSymbol(exportSymbol)
        : exportSymbol;

    return {
      name,
      kind: kindOf(symbol),
      documentation: ts.displayPartsToString(symbol.getDocumentationComment(checker)),
      tags: symbol.getJsDocTags(checker).map((tag) => ({
        name: tag.name,
        text: ts.displayPartsToString(tag.text),
      })),
      location: locationOf(symbol),
    };
  });
}

function kindOf(symbol: ts.Symbol): string {
  const { flags } = symbol;

  if (flags & ts.SymbolFlags.Function) return "function";
  if (flags & ts.SymbolFlags.Class) return "class";
  if (flags & ts.SymbolFlags.Interface) return "interface";
  if (flags & ts.SymbolFlags.TypeAlias) return "type";
  if (flags & ts.SymbolFlags.Enum) return "enum";
  if (flags & ts.SymbolFlags.Module) return "namespace";
  if (flags & ts.SymbolFlags.Variable) return "variable";

  return "unknown";
}

function locationOf(symbol: ts.Symbol): ExportDoc["location"] {
  const declaration = symbol.getDeclarations()?.at(0);

  if (!declaration) {
    return undefined;
  }

  const sourceFile = declaration.getSourceFile();
  const { line } = sourceFile.getLineAndCharacterOfPosition(declaration.getStart());

  return {
    file: sourceFile.fileName,
    line: line + 1,
  };
}
