import { Semaphore } from '@toolbuilder/semaphore'
import { iteratorFrom } from './iteratorfrom.js'

/**
 * Controller returned by `run` to start, stop, and check iteration status.
 *
 * @typedef {object} RunController
 * @property {() => void} stop - pause iteration
 * @property {() => void} start - resume iteration
 * @property {boolean} running - true if iteration is currently running
 */

/**
 * Controller returned by `publish` to manage subscribers and control iteration.
 *
 * @template [T=any]
 * @typedef {object} PublishController
 * @property {() => void} stop - pause iteration and publishing
 * @property {() => void} start - resume iteration and publishing
 * @property {boolean} running - true if currently running
 * @property {(subscriber: (value: T) => any) => number} subscribe - register a subscriber function and return its subscription key
 * @property {(key: number) => void} unsubscribe - remove a subscriber by its subscription key
 */

/**
 * Executes function fn(item, index) for each item in the iterable sequence provided. Each function
 * call must resolve before the function is called again.
 *
 * @type {<T = any>(fn: (item: Awaited<T>, index: number) => any, iterable: AsyncIterable<T> | Iterable<T>) => Promise<void>}
 * @param {(item: any, index: number) => any} fn - a function(item, index), where item is the current item in the sequence, and index
 * is the index of the current item.
 * @param {AsyncIterable<any> | Iterable<any>} iterable - the sequence of items to call fn(item, index) with.
 * @returns {Promise<void>}
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
 * Publishes values from iterable to any subscribing function. Functions can
 * be added and removed during iteration.
 *
 * Functions are passed the each value from the iterable. Only values provided
 * after subscribing are provided. Any return value is ignored.
 *
 * @type {<T = any>(iterable: AsyncIterable<T> | Iterable<T>) => PublishController<Awaited<T>>}
 * @param {AsyncIterable<any> | Iterable<any>} iterable that provides the values
 * @returns {PublishController<any>} - Returns an object with subscribe and unsubscribe
 * methods. The subscribe method accepts a function and returns an unsubscribe
 * key. The unsubscribe method accepts an unsubscribe key, to remove the function.
 * Also has start, stop, and running just like the run function.
 * @example
 * const publisher = chainable([0, 1, 2, 3]).throttle(50, 50).publish()
 * const key = publisher.subscribe(console.log) // prints 0, 1 - then unsubscribed
 * wait(110, publisher.unsubscribe(key)) // console.log is no longer called after 110ms
 */
export const publish = (iterable) => {
  const semaphore = new Semaphore(1)
  let sequence = 0
  const subscribers = new Map()
  const runner = async () => {
    for await (const value of iterable) {
      if (!semaphore.acquireSync()) await semaphore.acquire() // stopped
      semaphore.release()
      for (const subscriber of subscribers.values()) {
        subscriber(value)
      }
    }
  }
  runner() // start off running
  return {
    stop: () => { if (semaphore.available()) semaphore.acquire() },
    start: () => { if (!semaphore.available()) semaphore.release() },
    get running () { return semaphore.available() },
    subscribe: (pushable) => { subscribers.set(++sequence, pushable); return sequence },
    unsubscribe: key => { subscribers.delete(key) }
  }
}

/**
 * The reduce() method executes a reducer function on each element of
 * the input iterable, resulting in a single output value.
 *
 * @type {<T = any, R = any>(fn: (accumulator: R extends never[] ? any[] : Awaited<R>, item: Awaited<T>) => (R extends never[] ? any[] : Awaited<R>) | PromiseLike<R extends never[] ? any[] : Awaited<R>>, accumulator: R, iterable: AsyncIterable<T> | Iterable<T>) => Promise<R extends never[] ? any[] : Awaited<R>>}
 * @param {(accumulator: any, item: any) => any} fn - fn(accumulator, item) that returns (or resolves to)
 * the new accumulator value.
 * @param {any} accumulator - the initial accumulator value
 * @param {AsyncIterable<any> | Iterable<any>} iterable - the sequence to execute fn over.
 * @returns {Promise<any>} - the final accumulator value
 * @example
 * const add = (a, b) => a + b
 * const sum = reduce(add, 0, [0, 1, 2, 3, 4]) // sum === 10
 */
export const reduce = async (fn, accumulator, iterable) => {
  for await (const value of iterable) {
    accumulator = /** @type {any} */ (await Promise.resolve(fn(/** @type {any} */ (accumulator), value)))
  }
  return /** @type {any} */ (accumulator)
}

/**
 * Iterates over an iterable asynchronously. It is sort of like
 * starting a thread, and the returned controller allows you to
 * start and stop iteration.
 *
 * @type {(iterable: AsyncIterable<any> | Iterable<any>) => RunController}
 * @param {AsyncIterable<any> | Iterable<any>} iterable - input iterable
 * @returns {RunController} - Has a start() method to start iteration, although
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
 * @type {(iterable: AsyncIterable<any> | Iterable<any>) => Promise<void>}
 * @param {AsyncIterable<any> | Iterable<any>} iterable - iterable to iterate over
 * @returns {Promise<void>}
 * @example
 * await runAwait([0, 1, 2, 3, 4])
 */
export const runAwait = async (iterable) => {
  // Rollup.js is removing the for await loop as if it is dead code, so fooling it with
  // more complex code that does the same thing.
  // for await (const value of iterable) { // eslint-disable-line
  // }
  const iterator = iteratorFrom(iterable)
  let { done } = await iterator.next()
  while (!done) {
    ({ done } = await iterator.next())
  }
}

/**
 * Creates an  Array from the items in iterable.
 *
 * @type {<T = any>(iterable: AsyncIterable<T> | Iterable<T>) => Promise<Awaited<T>[]>}
 * @param {AsyncIterable<any> | Iterable<any>} iterable - the iterable to create the array from
 * @returns {Promise<Array<any>>} - the array
 * @example
 * const a = await toArray([0, 1, 2, 3, 4]) // a is [0, 1, 2, 3, 4]
 */
export const toArray = (iterable) => reduce((a, v) => { a.push(v); return a }, [], iterable)
