import { isString, isAsyncIterable, isSyncIterable } from './is.js'
import { zipAll } from 'iterablefu/src/generators.js'
import { map as syncMap } from 'iterablefu/src/transforms.js'
import { List } from '@toolbuilder/list/src/list.js'
import { isFiniteNumber } from '@toolbuilder/isnumber/src/isnumber.js'

// Helper for arrayToObject. Matches property names to iterable values.
const zipObject = (propertyNames, iterableValues) => {
  const outputObject = {}
  const pairs = zipAll(propertyNames, iterableValues)
  for (const [propertyName, value] of pairs) {
    if (propertyName === undefined) continue
    outputObject[propertyName] = value
  }
  return outputObject
}
/**
* Converts a sequence of Arrays to a sequence of Objects by assigning the property names
* to each array element in turn. The input sequence doesn't have to provide arrays, it can
* provide any sequence of iterable objects.
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
 * Chunk every n items into an array, and output that array in the output sequence.
 * Chunks are yielded after `timeout` milliseconds even if not full, so that values
 * can be processed in a timely manner. Never yields empty chunks.
 *
 * Backpressure is provided by the iterator when a chunk is yielded. Stopping the
 * iterator will stop chunking and the input iterable.
 *
 * @param {Number} n - size of arrays
 * @param {Number} timeout - number of milliseconds before yielding chunk if not full
 * @param {AsyncIterable|Iterable} iterable - the iterable to chunk
 * @returns {AsyncGenerator} - provides each chunk in order
 */
export const chunk = async function * (n, timeout, iterable) {
  // I've called this method incorrectly often enough to throw in some checks
  if (!(isFiniteNumber(n) && n > -1)) throw new RangeError(`chunk parameter 'n' must be a positive number: ${n}`)
  if (!(isFiniteNumber(timeout) && timeout > -1)) throw new RangeError(`chunk parameter 'timeout' must be a positive number: ${timeout}`)
  if (!(isAsyncIterable(iterable) || isSyncIterable(iterable))) throw new RangeError(`chunk parameter 'iterable' must be iterable: ${iterable}`)

  // state for chunking process
  let buffer = [] // store values from input iterable while building chunk
  let fillListException = null // store exception thrown in fillList for later throwing
  let done = false // true if iteration of iterable is done
  let timer = null // timeout timer reference so it can be cleared when a chunk is ready
  let restartFillBuffer = null // Promise resolve function to restart fillBuffer
  let restartMainLoop = null // Promise resolve function to restart output loop

  // Runs promise resolve functions
  const runFunction = (resolver) => {
    if (resolver != null) {
      resolver()
      resolver = null
    }
  }

  // state management functions
  const onFirstPushOfChunk = () => { timer = setTimeout(() => onTimeout(), timeout) }
  const onTimeout = () => { runFunction(restartMainLoop) }
  const onChunkReady = () => { clearTimeout(timer); runFunction(restartMainLoop) }
  const onDone = () => { done = true; clearTimeout(timer); runFunction(restartMainLoop) }
  const onFillNextChunk = () => { if (!done) runFunction(restartFillBuffer) }

  // asynchronously fill buffer, stop when full, restarted by main loop
  const fillBuffer = async function () {
    try {
      for await (const value of iterable) {
        buffer.push(value)
        if (buffer.length === 1) onFirstPushOfChunk()
        if (buffer.length === n) {
          onChunkReady()
          // Wait until iterator wanting chunks requests more data before filling buffer again.
          // This allows iterator wanting chunks to provide back pressure to iterable
          await new Promise((resolve, reject) => { restartFillBuffer = resolve })
        }
      }
    } catch (error) {
      fillListException = error // save error from iterable to rethrow in main loop
    } finally {
      onDone()
    }
  }

  fillBuffer()
  // main loop yields chunks from fillBuffer to iterator
  while (!done || buffer.length > 0) { // eslint-disable-line
    if (buffer.length === 0) {
      // fillBuffer or timeout will resolve this promise to restart loop
      await new Promise((resolve, reject) => { restartMainLoop = resolve })
    }
    if (buffer.length > 0) {
      const chunk = buffer
      buffer = []
      yield chunk
      onFillNextChunk()
    }
  }
  // exception can be caught while awaiting, or yielding
  // either way done === true now, so loop will end ensuring this check
  if (fillListException != null) throw fillListException
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
 * Flattens a sequence of items one level deep. It does not flatten strings, even
 * though they are iterable. Can flatten async and sync iterables within the provided
 * iterable.
 *
 * @param {AsyncIterable|Iterable} iterable - the iterable sequence to flatten
 * @returns {AsyncGenerator} for the flattened sequence
 * @example
 * const a = flatten([[0, 1], [2, 3], toAsync([4, 5]), [6]])
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
 * Does not flatten strings even though they are iterable. Can flatten combinations of
 * async and sync iterables within the provided iterable.
 *
 * @param {AsyncIterable|Iterable} iterable - the sequence to flatten
 * @returns {AsyncGenerator} for the flattened sequence
 * @example
 * const input = [0, [1, 2, 3], [[4, 5], [[toAsync([6, 7])], [8, 9], 10]], 11, 12]
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
 * Execute async functions provided by input iterable. Returns results as they resolve, with
 * no more than maxPoolSize promises pending at any time. Results may be out of order with
 * respect to the input order.
 *
 * The input iterable can yield anything. However, async and sync functions are
 * handled specially. Each function will be called, and the result placed into the pool to
 * be yielded when resolved. Promises will remain in the pool until they resolve, other
 * values will resolve immediately as you would expect.
 *
 * As always with async iterables, if the input iterable yields a Promise, pool must wait
 * until the Promise resolves before advancing the input iterable. This
 * defeats the purpose of pool. So if you need to yield a promise from input iterator,
 * wrap it with a function like so: `() => promise`. Pool will call the function to get
 * the Promise, then advance the input iterable to get the next value.
 *
 * The iterator provides backpressure, and can stop function calls by stopping iteration.
 *
 * @param {Number} maxPoolSize - maximum number of pending promises at any given time
 * @param {AsyncIterable|Iterable} iterable - input iterable
 * @returns {AsyncGenerator} - a generator that provides the output values as they occur
 * @throws - if iterable throws, or if any functions yielded by iterable throw, or if any
 * Promise in the pool rejects, the exception will be caught and rethrown by pool, so the
 * iterator can handle it. Once an exception is thrown, the iteration is complete.
 */
export const pool = async function * (maxPoolSize, iterable) {
  // NOTE:
  // Each Promise pushed to 'awaiting' is tagged with an id like this:
  // const id = idSequence++
  // const promise = asyncFunction().then(result => ({ result, id }))
  // Each node in 'awaiting' has the same id so we can find it given the id from the resolved value
  let idSequence = 31
  let exception = null // if fillAwaiting catches an exception, it stores it here
  const awaiting = new List() // fill with { promise, id, pushed} objects
  let isDone = false
  let restartFillAwaiting = null // Promise resolve function called to restart filling 'awaiting'
  let pushedPromiseToAwaiting = null // Promise resolve function called when a new Promise is in 'awaiting'

  // awaiting has a Promise for pushedPromiseToAwaiting in it as well as async function promises.
  // So when asyncIterable is not done:
  // (awaiting.length - 1) === [...awaiting].filter(value => value.pushed === false).length
  // when asyncIterable is done, fillAwaiting is done too, so awaiting won't overfill, and the difference between
  // those two calculations is moot.
  const awaitingCallCount = () => awaiting.length - 1

  // call when something is pushed to 'awaiting'
  const onPushedPromiseToAwaiting = () => {
    if (pushedPromiseToAwaiting) {
      // log('pushedPromiseToAwaiting')
      pushedPromiseToAwaiting()
      pushedPromiseToAwaiting = null
    }
  }

  // Need a way to interrupt the Promise.race in the main iterator loop when something is pushed
  // into awaiting. The onPushedPromiseToAwaiting function will resolve the promise below.
  const makePushedPromise = () => {
    const id = idSequence++
    const promise = new Promise((resolve, reject) => { pushedPromiseToAwaiting = resolve }).then(result => ({ result, id }))
    const pushed = true // to indicate that this promise is the onPushedPromiseToAwaiting interrupt
    return { promise, id, pushed }
  }

  // This function pulls values from asyncIterable, calls the resulting function
  // and pushes the returned Promise into 'awaiting' after tagging it with an id.
  const fillAwaiting = async () => {
    try {
      for await (const value of iterable) {
        const id = idSequence++
        // support async functions, sync functions, and values
        const promise = (typeof value === 'function')
          ? Promise.resolve(value()).then(result => ({ result, id }))
          : Promise.resolve(value).then(result => ({ result, id }))
        const pushed = false
        awaiting.push({ promise, id, pushed })
        onPushedPromiseToAwaiting()
        if (awaitingCallCount() >= maxPoolSize) {
          await new Promise((resolve, reject) => { restartFillAwaiting = resolve })
        }
      }
    } catch (error) {
      exception = error
    } finally {
      isDone = true
      onPushedPromiseToAwaiting() // if main loop is waiting, need to interrupt it
    }
  }

  // Primary iterator loop is here.
  fillAwaiting()
  awaiting.push(makePushedPromise())
  while (awaiting.length > 0 || !isDone) { // eslint-disable-line
    const promises = syncMap(value => value.promise, awaiting)
    const { result, id } = await Promise.race(promises)
    if (exception != null) throw exception

    const node = awaiting.find(value => value.id === id)
    if (node.value.pushed === true) {
      if (!isDone) awaiting.push(makePushedPromise())
    } else {
      yield result
    }
    awaiting.remove(node) // This is why List is being used instead of Array

    if (awaitingCallCount() < maxPoolSize && restartFillAwaiting) {
      restartFillAwaiting()
      restartFillAwaiting = null
    }
  }
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
 * @param {Number} waitBetweenValues - milliseconds to wait between yielding each value
 * @param {boolean} immediate - true indicates that first value should be yielded immediately,
 * @param {AsyncIterable|Iterable} iterable - the async iterable to throttle
 * @returns {AsyncGenerator} - the throttled sequence of values
 * otherwise the first value is yielded after waitBetweenValues milliseconds.
 * @example
 * const a = throttle(100, true, [0, 1, 2, 3, 4])
 * console.log(await toArray(a)) // prints [0, 1, 2, 3, 4] with 100ms wait after each element
 */
export const throttle = async function * (waitBetweenValues, immediate, iterable) {
  if (immediate !== true) {
    await new Promise(resolve => setTimeout(() => resolve(), waitBetweenValues))
  }
  for await (const value of iterable) {
    yield value
    await new Promise(resolve => setTimeout(() => resolve(), waitBetweenValues))
  }
}

/**
 * Pass the input sequence to the output sequence without change, but execute `fn(item)` for each
 * item in the sequence.
 *
 * @param {Function} fn - synchronous function, `fn(item)` is called for each item in the sequence
 * @param {AsyncIterable|Iterable} iterable - the input sequence
 * @returns {AsyncGenerator} that is equivalent to the input iterable
 * @example
 * const a = tap(console.log, [1, 2, 3, 4, 5])
 */
export const tap = (fn, iterable) => {
  return map(x => { fn(x); return x }, iterable)
}
