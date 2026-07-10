/**
 * Helpers for working with dates, described above the table of exports.
 *
 * @module
 */

/**
 * Formats a date as an ISO string.
 */
export function format(date) {
  return date.toISOString();
}

/**
 * Parses an ISO string into a date.
 */
export function parse(input) {
  return new Date(input);
}
