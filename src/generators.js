/**
 * Returns the input iterable unchanged. Used as a static constructor by
 * ChainableClass to create a ChainableIterable from an existing iterable.
 *
 * @type {<T = any>(iterable: AsyncIterable<T> | Iterable<T>) => AsyncIterable<T> | Iterable<T>}
 * @param {AsyncIterable<any> | Iterable<any>} iterable - input iterable
 * @returns {AsyncIterable<any> | Iterable<any>} - the input iterable
 */
export const from = (iterable) => {
  return iterable
}

export { merge } from './merge.js'
export { zip, zipAll } from './zip.js'

/**
 * Helper generator yielding numbers matching Python range semantics.
 *
 * @param {number} start - first number in sequence
 * @param {number} stop - non-inclusive boundary
 * @param {number} step - non-zero step increment
 * @returns {Generator<number, void, unknown>}
 */
const rangeGenerator = function * (start, stop, step) {
  if (step > 0) {
    for (let value = start; value < stop; value += step) {
      yield value
    }
  } else {
    for (let value = start; value > stop; value += step) {
      yield value
    }
  }
}

/**
 * Creates a synchronous sequence of numbers matching the Python range function:
 * `range(stop)` or `range(start, stop[, step])`.
 *
 * @type {(...args: (number | undefined)[]) => Generator<number, void, unknown>}
 * @param {...(number | undefined)} args - arguments matching Python range:
 * - `range()` produces an empty sequence
 * - `range(stop)` starts at 0, steps by 1, ends before `stop`
 * - `range(start, stop)` starts at `start`, steps by 1, ends before `stop`
 * - `range(start, stop, step)` starts at `start`, steps by `step`, ends before `stop`
 * @returns {Generator<number, void, unknown>} generator that represents the range
 * @throws {RangeError} if step is 0
 * @example
 * import { generators } from '@toolbuilder/await-for-it'
 *
 * // zero arguments produces an empty sequence
 * console.log([...generators.range()]) // prints []
 *
 * // one argument specifies stop (starts with zero, step 1)
 * console.log([...generators.range(5)]) // prints [0, 1, 2, 3, 4]
 *
 * // two arguments specify start and stop (step 1)
 * console.log([...generators.range(2, 5)]) // prints [2, 3, 4]
 *
 * // three arguments specify start, stop, and step
 * console.log([...generators.range(2, 5, 2)]) // prints [2, 4]
 *
 * // negative step counts down
 * console.log([...generators.range(5, 0, -1)]) // prints [5, 4, 3, 2, 1]
 */
export const range = (...args) => {
  let start = 0
  let stop = 0
  let step = 1

  if (args.length === 1) {
    stop = args[0] ?? 0
  } else if (args.length === 2) {
    start = args[0] ?? 0
    stop = args[1] ?? 0
  } else if (args.length >= 3) {
    start = args[0] ?? 0
    stop = args[1] ?? 0
    step = args[2] ?? 1
  }

  if (step === 0) {
    throw new RangeError('range() step must not be zero')
  }

  return rangeGenerator(start, stop, step)
}
