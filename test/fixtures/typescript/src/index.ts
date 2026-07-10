/**
 * Doubles a number.
 */
export function double(value: number): number {
  return value * FACTOR;
}

/**
 * The value that `double` multiplies by.
 */
export const FACTOR = 2;

export type { DoubleOptions } from "./options.js";
