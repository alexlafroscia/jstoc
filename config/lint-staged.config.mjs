/** @type {import('lint-staged').Configuration} */
export default {
  "*": "mise run format --no-error-on-unmatched-pattern",

  // Regenerate the README table of contents when the source or package
  // manifest changes; the function form runs the commands once, without
  // the staged filenames appended. lint-staged matchers only see files
  // staged before it starts, so the regenerated README must be formatted
  // and staged explicitly here
  "{src/**/*,package.json}": () => [
    "mise run jstoc",
    "mise run format README.md",
    "git add README.md",
  ],
};
