import { Semaphore } from './semaphore.js'

/**
 * Executes function fn(item, index) for each item in the iterable sequence provided. Each function
 * call must resolve before the function is called again.
 *
 * @param {AsyncFunction|Function} fn - a function(item, index), where item is the current item in the sequence, and index
 * is the index of the current item.
 * @param {Iterable} iterable - the sequence of items to call fn(item, index) with.
 * @returns {undefined}
 * @example
 * const fn = (item, index) => console.log(`item - ${item}, index - ${index}`)
 * forEach(fn, [1, 2, 3]) // prints the following...
 * // item - 1, index - 0
 * // item - 2, index - 1
 * // item - 3, index - 2
 */
export const forEach = async (fn, iterable) => {
  let index = 0
  for await (const value of iterable) {
    await fn(value, index++)
  }
}

/**
 * The reduce() method executes a reducer function on each element of
 * the input iterable, resulting in a single output value.
 *
 * @param {AsyncFunction|Function} fn - fn(accumulator, item) that returns (or resolves to)
 * the new accumulator value.
 * @param {any} accumulator - the initial accumulator value
 * @param {Iterable} iterable - the sequence to execute fn over.
 * @returns {any} - the final accumulator value
 * @example
 * const add = (a, b) => a + b
 * const sum = reduce(add, 0, [0, 1, 2, 3, 4]) // sum === 10
 */
export const reduce = async (fn, accumulator, iterable) => {
  for await (const value of iterable) {
    accumulator = await Promise.resolve(fn(accumulator, value))
  }
  return accumulator
}

/**
 * Iterates over an iterable asynchronously. It is sort of like
 * starting a thread, and the returned controller allows you to
 * start and stop iteration.
 *
 * @param {AsyncIterable|Iterable} iterable - input iterable
 * @returns {Object} - Has a start() method to start iteration, although
 * it is already started when controllable returns. Has a stop method to
 * stop iteration. Has a running attribute to check if iteration is running.
 * @example
 * const control = run(longRunningIterable)
 * if (control.running) control.stop()
 * control.start()
 */
export const run = (iterable) => {
  const semaphore = new Semaphore(1)
  const runner = async () => {
    for await (const unused of iterable) { // eslint-disable-line
      if (!semaphore.acquireSync()) await semaphore.acquire()
      // all work is done by iterable, so we do nothing with unused value here
      semaphore.release()
    }
  }
  runner() // start off running
  return {
    stop: () => { if (semaphore.available()) semaphore.acquire() },
    start: () => { if (!semaphore.available()) semaphore.release() },
    get running () { return semaphore.available() }
  }
}

/**
 * Iterates over iterable asynchronously. It is sort of like starting
 * a thread. Unlike `run(iterable)`, there is no control over iteration.
 *
 * @param {AsyncIterable|Iterable} iterable - iterable to iterate over
 * @example
 * await runAwait([0, 1, 2, 3, 4])
 */
export const runAwait = async (iterable) => {
  for await (const value of iterable) { // eslint-disable-line
  }
}

/**
 * Creates an  Array from the items in iterable.
 *
 * @param {AsyncIterable|Iterable} iterable - the iterable to create the array from
 * @returns {Array} - the array
 * @example
 * const a = await toArray([0, 1, 2, 3, 4]) // a is [0, 1, 2, 3, 4]
 */
export const toArray = (iterable) => reduce((a, v) => { a.push(v); return a }, [], iterable)
