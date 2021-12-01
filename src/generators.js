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
export { zip, zipAll } from './zip.js'

/**
 * Creates a sequence of numbers similar to the Python range. See the example.
 *
 * @param  {...integer} args per the example
 * @returns {Generator} that represents the range
 * @example
 *
 * let output
 *
 * // zero arguments produces an empty sequence
 * output = await toArray(range())
 * console.log(output) // prints []
 *
 * // one Number produces a sequence that starts with zero
 * // the number specifies how many elements are in the sequence
 * output = await toArray(range(5))
 * console.log(output) // prints [0, 1, 2, 3, 4]
 *
 * // two Numbers produces a sequence starting from the first number
 * // the second number specifies how many elements are in the sequence
 * output = await toArray(range(2, 5))
 * console.log(output) // prints [2, 3, 4, 5, 6]
 *
 * // three numbers produces a sequence starting from the first number
 * // the second number specifies how many elements are in the sequence
 * // the third number specifies the increment - in this case add three to the previous value
 * output = await toArray(range(2, 5, 3)
 * console.log(output)  // prints [2, 5, 8, 11, 14]
 */
export const range = (...args) => {
  const rangeGenerator = function * (start, length, increment) {
    let value = start
    for (let i = 0; i < length; i++) {
      yield value
      value += increment
    }
  }
  switch (args.length) {
    case 0:
      return rangeGenerator(0, 0, 1)
    case 1:
      return rangeGenerator(0, args[0], 1)
    case 2:
      return rangeGenerator(args[0], args[1], 1)
    default:
      return rangeGenerator(...args)
  }
}
