/**
 * This function exists solely so that the generated ChainableIterable class has a static constructor.
 *
 * @param {AsyncIterable|Iterable} iterable - input iterable
 * @returns {AsyncIterable|Iterable} - the input iterable
 */
export const from = (iterable) => {
  return iterable
}

export { merge } from './merge.js'
