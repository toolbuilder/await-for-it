import { isString, isAsyncIterable, isSyncIterable } from './is.js'
import { iteratorFrom } from './iteratorfrom.js'
import { zipAll } from 'iterablefu/src/generators.js'

export { pool } from './pool.js'
export { chunk } from './chunk.js'
export { flattenUnordered } from './flattenunordered.js'

// Helper for arrayToObject. Matches property names to iterable values.
const zipObject = (propertyNames, iterableValues) => {
  const outputObject = {}
  const pairs = zipAll(propertyNames, iterableValues)
  // Unfortunately, Object.fromEntries creates keys for undefined
  for (const [propertyName, value] of pairs) {
    if (propertyName === undefined) continue
    outputObject[propertyName] = value
  }
  return outputObject
}

/**
* Converts a sequence of Arrays to a sequence of Objects by assigning the property names
* to each array element in turn. The input sequence doesn't have to provide arrays, it can
* provide any iterable object.
*
* If the arrays in iterable are too long, extra values are ignored.
*
* If the arrays in iterable are too short, the remaining properties are assigned undefined.
* See example.
*
* @param {Iterable} propertyNames - a sequence of property names
* @param {AsyncIterable|Iterable} iterable - a sequence of arrays (or any iterable objects)
* @return {AsyncGenerator} for the sequence of created Objects
* @example
* const objects = await toArray(arrayToObject(['a', 'b'], [[0, 1], [2, 3, 'a'], [4]]))
* // objects is [{'a': 0, 'b': 1 }, {'a': 2, 'b': 3 }, {'a': 4, 'b': undefined }]
*/
export const arrayToObject = function (propertyNames, iterable) {
  return map(iterableValues => zipObject(propertyNames, iterableValues), iterable)
}

/**
 * Pass the input sequence to the output sequence without change, but execute `fn(item)` for each
 * item in the sequence. Awaits the result of each function call before yielding the value.
 *
 * @param {AsyncFunction|Function} fn - function, `fn(item)` is called for each item in the sequence
 * @param {AsyncIterable|Iterable} iterable - the input sequence
 * @returns {AsyncGenerator} that is equivalent to the input iterable
 * @example
 * const a = callAwait(console.log, [1, 2, 3, 4, 5])
 * [...a] // iterates over `a` and prints each value on a separate line
 */
export const callAwait = async function * (fn, iterable) {
  for await (const value of iterable) {
    await fn(value)
    yield value
  }
}

/**
 * Pass the input sequence to the output sequence without change, but execute `fn(item)` for each
 * item in the sequence. Will not await the result before yielding the value.
 *
 * @param {AsyncFunction|Function} fn - synchronous function, `fn(item)` is called for each item in the sequence
 * @param {AsyncIterable|Iterable} iterable - the input sequence
 * @returns {AsyncGenerator} that is equivalent to the input iterable
 * @example
 * const a = callNoAwait(console.log, [1, 2, 3, 4, 5]) // logs each value
 */
export const callNoAwait = async function * (fn, iterable) {
  for await (const value of iterable) {
    fn(value)
    yield value
  }
}

/**
 * Execute fn(previous, current) and yields the result for each pair.
 * Would be useful for calculating time differences between timestamps.
 *
 * @param {AsyncFunction|Function} fn - fn(previous, current), yielding return value
 * @param {AsyncIterable|Iterable} iterable - the input iterable
 * @returns {AsyncGenerator} - if input has two or more items, output sequence
 * is one shorter than input sequence. Otherwise, no items are output.
 * @example
 * const a = diff((n, m) => m - n, [0, 1, 2, 3, 4])
 * console.log(await toArray(a)) // prints [1, 1, 1, 1]
 */
export const diff = async function * (fn, iterable) {
  const iterator = iteratorFrom(iterable)
  let { value, done } = await iterator.next()
  let previousValue = value;
  ({ value, done } = await iterator.next())
  while (!done) {
    yield fn(previousValue, value)
    previousValue = value;
    ({ value, done } = await iterator.next())
  }
}

/**
 * Keeps item from input sequence when fn(item) returns truthy. Remove items from input sequence when
 * fn(item) returns !truthy.
 *
 * @param {Function} fn - synchronous fn(item) returns truthy when item should be removed
 * @param {AsyncIterable|Iterable} iterable - the sequence to filter
 * @return {AsyncGenerator} for the filtered sequence
 * @example
 * const isEvenNumber = x => x % 2 === 0
 * const a = filter(isEvenNumber, [0, 1, 2, 3, 4, 5, 6])
 * console.log(await toArray(a)) // prints even numbers [0, 2, 4, 6]
 */
export const filter = async function * (fn, iterable) {
  for await (const value of iterable) {
    if (fn(value) === true) {
      yield value
    }
  }
}

// Common function for flatten and flattenRecursive to determine if a value should be flattened
const shouldIterate = (value) => !isString(value) && (isSyncIterable(value) || isAsyncIterable(value))

/**
 * Flattens a sequence of items one level deep. Each iterable is flattened fully before moving
 * to the next. If you want multiple iterables flattened at the same time, see flattenUnordered.
 * Flatten does not flatten strings, even though they are iterable. It can flatten async and
 * sync iterables within the provided iterable.
 *
 * @param {AsyncIterable|Iterable} iterable - the iterable sequence to flatten
 * @returns {AsyncGenerator} for the flattened sequence
 * @example
 * const a = flatten([[0, 1], [2, 3], chainable([4, 5]), [6]])
 * console.log(await toArray(a)) // prints [0, 1, 2, 3, 4, 5, 6]
 */
export const flatten = async function * (iterable) {
  for await (const value of iterable) {
    if (shouldIterate(value)) {
      yield * value
    } else {
      yield value
    }
  }
}

/**
 * Flattens a sequence by recursively returning items from each iterable in the sequence.
 * Each iterable is flattened fully before moving to the next. Does not flatten strings
 * even though they are iterable. Can flatten combinations of async and sync iterables
 * within the provided iterable.
 *
 * @param {AsyncIterable|Iterable} iterable - the sequence to flatten
 * @returns {AsyncGenerator} for the flattened sequence
 * @example
 * const input = [0, [1, 2, 3], [[4, 5], [[chainable([6, 7])], [8, 9], 10]], 11, 12]
 * const a = flattenRecursive(input)
 * console.log(await toArray(a)) // prints [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
 */
export const flattenRecursive = async function * (iterable) {
  for await (const value of iterable) {
    if (shouldIterate(value)) {
      yield * flattenRecursive(value)
    } else {
      yield value
    }
  }
}

/**
 * Generates a sequence of items by calling fn(item) for each item of the input iterable.
 *
 * @param {AsyncFunction|Function} fn - fn(item) returns the output item
 * @param {AsyncIterable|Iterable} iterable - the sequence to map
 * @returns {AsyncGenerator} for the mapped sequence
 * @example
 * const a = map(x => 2 * x, [0, 1, 2, 3])
 * console.log(await toArray(a)) // prints [0, 2, 4, 6]
 */
export const map = async function * (fn, iterable) {
  for await (const value of iterable) {
    yield fn(value)
  }
}

/**
 * Map the input sequence to the output sequence with an async generator that maps one iterator to another.
 *
 * This method exists solely so that ChainableIterable supports chaining for an arbitrary generator function.
 *
 * @param {AsyncGeneratorFunction} generatorFunction - a function that returns an async iterable object,
 * and takes an async iterable as a parameter.
 * @param {AsyncIterable|Iterable} iterable - the input sequence
 * @returns {AsyncGenerator} for the mapped sequence
 * @example
 * const fn = async function * (iterable) {
 *   for await (let x of iterable) {
 *     yield x * x
 *   }
 * }
 * const a = mapWith(fn, [0, 1, 2, 3])
 * console.log(await toArray(a)) // prints [0, 1, 4, 9]
 */
export const mapWith = function (generatorFunction, iterable) {
  return generatorFunction(iterable)
}

/**
 * Given a sequence of Arrays, output the nth element of each array as a sequence.
 *
 * @param {Number} index - the index of the Array to output. Negative index values
 * are ok. The index of the last element is -1.
 * @param {AsyncIterable|Iterable} iterable - the iterable to process
 * @returns {AsyncGenerator} for the nth elements
 * @example
 * const input = [[0, 1], [2, 3], [4, 5]]
 * const a = nth(1, input)
 * console.log(await toArray(a)) // prints [1, 3, 5]
 */
export const nth = (index, iterable) => {
  return map(x => (index < 0) ? x[x.length + index] : x[index], iterable)
}

/**
 * Given a sequence of Objects, output the specified property of each Object as a sequence.
 *
 * @param {string} propertyname - the property to extract from each Object
 * @param {AsyncIterable|Iterable} iterable - the input sequence of Objects
 * @returns {AsyncGenerator} for the plucked items
 * @example
 * const input = [{'a': 1, 'b': 2}, {'a': 3, 'b': 4}, {'a': 5, 'b': 6}]
 * const a = pluck('a', input)
 * console.log(await toArray(a))) // prints [1, 3, 5]
 */
export const pluck = (propertyName, iterable) => {
  return map(x => x[propertyName], iterable)
}

/**
 * Reject items when fn(item) returns truthy.
 *
 * @param {Function} fn - synchronous fn(item) returns truthy when item should be removed from output sequence
 * @param {AsyncIterable|Iterable} iterable - input sequence
 * @returns {AsyncGenerator} for the non-rejected items
 * @example
 * const isEvenNumber = x => x % 2 === 0
 * const a = reject(isEvenNumber, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
 * console.log(await toArray(a)) // prints [1, 3, 5, 7, 9]
 */
export const reject = (fn, iterable) => {
  return filter(x => fn(x) !== true, iterable)
}

/**
 * Provide the first n values of iterator. Useful to truncate infinite sequences.
 *
 * @param {Number} n - number of items to take
 * @param {AsyncIterable|Iterable} iterable - provides the first n values
 * @returns {AsyncGenerator} - provides the first n values
 * @example
 * const a = take(2, [0, 1, 2, 3, 4])
 * console.log(await toArray(a)) // prints [0, 1]
 */
export const take = async function * (n, iterable) {
  let count = 0
  for await (const value of iterable) {
    yield value
    if (++count >= n) break
  }
}

/**
 * Throttle an async iterator to a maximum iteration speed.
 *
 * @param {Number} period - milliseconds to wait between yielding each value
 * @param {Number} initialWait - milliseconds before yielding first value
 * @param {AsyncIterable|Iterable} iterable - the async iterable to throttle
 * @returns {AsyncGenerator} - the throttled sequence of values
 * @example
 * const a = throttle(100, 0, [0, 1, 2, 3, 4])
 * console.log(await toArray(a)) // prints [0, 1, 2, 3, 4] with 100ms wait after each element
 */
export const throttle = async function * (period, initialWait, iterable) {
  if (initialWait !== 0) {
    await new Promise(resolve => setTimeout(() => resolve(), initialWait))
  }
  for await (const value of iterable) {
    const startTime = Date.now()
    yield value
    const yieldDuration = Date.now() - startTime
    if (yieldDuration < period) {
      await new Promise(resolve => setTimeout(() => resolve(), period - yieldDuration))
    }
  }
}
