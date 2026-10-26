import { isAsyncIterable, isFunction, isSyncIterable } from './is.js'

/**
 * Safely format an arbitrary value for error messages.
 *
 * @param {any} value
 * @returns {string}
 */
const formatValue = (value) => {
  try {
    return String(value)
  } catch {
    return Object.prototype.toString.call(value)
  }
}

/**
 * Validate that a parameter is a function (excluding ES6 classes).
 *
 * @param {string} caller
 * @param {string} paramName
 * @param {any} fn
 */
const assertFunction = (caller, paramName, fn) => {
  if (!isFunction(fn)) {
    throw new TypeError(`${caller} parameter '${paramName}' must be a function: ${formatValue(fn)}`)
  }
}

/**
 * Validate that a parameter is a sync or async iterable.
 *
 * @param {string} caller
 * @param {any} iterable
 */
const assertIterable = (caller, iterable) => {
  if (!(isAsyncIterable(iterable) || isSyncIterable(iterable))) {
    throw new TypeError(`${caller} parameter 'iterable' must be iterable: ${formatValue(iterable)}`)
  }
}

/**
 * Wrap any sync or async iterable using native `for await...of` semantics
 * (preferring `[Symbol.asyncIterator]`, unwrapping Promises in sync iterables,
 * and forwarding `.return()` cleanup).
 *
 * @template T
 * @param {AsyncIterable<T> | Iterable<T>} iterable
 * @returns {AsyncGenerator<Awaited<T>, void, unknown>}
 */
const toAsyncGenerator = async function * (iterable) {
  for await (const value of iterable) {
    yield value
  }
}

/**
 * Shared background iteration runner and controller state for `run` and `publish`.
 *
 * @param {AsyncIterable<any> | Iterable<any>} iterable
 * @param {((value: any, isCancelled: () => boolean) => void) | null} onValue
 * @param {(() => void) | null} onCleanup
 * @returns {RunController}
 */
const createRunnerController = (iterable, onValue, onCleanup) => {
  let paused = false
  let isDone = false
  let isCancelled = false
  /** @type {(() => void) | null} */
  let resume = null

  const wake = () => {
    if (resume !== null) {
      const r = resume
      resume = null
      r()
    }
  }

  const waitUntilRunning = async () => {
    while (paused && !isCancelled) {
      await /** @type {Promise<void>} */ (new Promise(resolve => { resume = resolve }))
    }
  }

  const runner = async () => {
    /** @type {AsyncGenerator<any, void, unknown> | null} */
    let iterator = null
    try {
      // Defer initial pull by one microtask so synchronous stop(), cancel(), or subscribe()
      // calls right after run()/publish() take effect before pulling the first item.
      await Promise.resolve()
      if (paused && !isCancelled) await waitUntilRunning()
      if (isCancelled) return

      iterator = toAsyncGenerator(iterable)
      while (!isCancelled) {
        if (paused && !isCancelled) await waitUntilRunning()
        if (isCancelled) break

        const { value, done } = await iterator.next()
        if (done || isCancelled) break

        if (onValue !== null) {
          if (paused && !isCancelled) await waitUntilRunning()
          if (isCancelled) break
          onValue(value, () => isCancelled)
        }
      }
    } finally {
      isDone = true
      paused = false
      wake()
      if (onCleanup !== null) onCleanup()
      if (iterator !== null) {
        await iterator.return(undefined)
      }
    }
  }

  const finished = runner()

  return {
    stop: () => {
      if (!isDone) paused = true
    },
    start: () => {
      if (!isDone && paused) {
        paused = false
        wake()
      }
    },
    cancel: () => {
      if (!isDone) {
        isCancelled = true
        isDone = true
        paused = false
        wake()
      }
      return finished
    },
    get running () {
      return !isDone && !paused
    },
    finished
  }
}

/**
 * Controller returned by `run` to pause, resume, cancel, and observe background iteration.
 *
 * @typedef {object} RunController
 * @property {() => void} stop Pause iteration before pulling the next item. No-op once finished.
 * @property {() => void} start Resume paused iteration. No-op once finished.
 * @property {() => Promise<void>} cancel Permanently stop iteration, close the upstream iterator, and return `finished`.
 * @property {boolean} running True while iteration is active (neither paused nor finished).
 * @property {Promise<void>} finished Resolves when iteration completes or is cancelled; rejects if an unhandled error escapes the iterable.
 */

/**
 * Controller returned by `publish` to manage subscribers and control background iteration.
 *
 * @template [T=any]
 * @typedef {object} PublishController
 * @property {() => void} stop Pause iteration and publishing. No-op once finished.
 * @property {() => void} start Resume paused iteration and publishing. No-op once finished.
 * @property {() => Promise<void>} cancel Permanently stop iteration, clear subscribers, close the upstream iterator, and return `finished`.
 * @property {boolean} running True while iteration is active (neither paused nor finished).
 * @property {Promise<void>} finished Resolves when iteration completes or is cancelled; rejects if an unhandled error escapes the iterable or a subscriber throws synchronously.
 * @property {(subscriber: (value: T) => any) => number} subscribe Register a subscriber function and return its subscription key.
 * @property {(key: number) => void} unsubscribe Remove a subscriber by its subscription key.
 */

/**
 * Executes function `fn(item, index)` for each item in the iterable sequence provided. Each function
 * call must resolve before the function is called again.
 *
 * @type {<T = any>(fn: (item: Awaited<T>, index: number) => any, iterable: AsyncIterable<T> | Iterable<T>) => Promise<void>}
 * @param {(item: any, index: number) => any} fn - a function(item, index), where item is the current item in the sequence, and index
 * is the zero-based index of the current item.
 * @param {AsyncIterable<any> | Iterable<any>} iterable - the sequence of items to call fn(item, index) with.
 * @returns {Promise<void>}
 * @throws {TypeError} rejects with TypeError if fn is not a function or iterable is not iterable
 * @example
 * const fn = (item, index) => console.log(`item - ${item}, index - ${index}`)
 * await forEach(fn, [1, 2, 3]) // prints the following...
 * // item - 1, index - 0
 * // item - 2, index - 1
 * // item - 3, index - 2
 */
export const forEach = async (fn, iterable) => {
  assertFunction('forEach', 'fn', fn)
  assertIterable('forEach', iterable)
  let index = 0
  for await (const value of iterable) {
    await fn(value, index++)
  }
}

/**
 * Publishes values from iterable to any subscribing function. Functions can
 * be added and removed during iteration.
 *
 * Functions are passed each value from the iterable. Only values produced
 * after subscribing are provided. Any return value is ignored (so async
 * subscribers must handle their own rejections). Synchronous exceptions thrown
 * by a subscriber abort iteration, close the upstream iterable, and reject `finished`.
 *
 * @type {<T = any>(iterable: AsyncIterable<T> | Iterable<T>) => PublishController<Awaited<T>>}
 * @param {AsyncIterable<any> | Iterable<any>} iterable - iterable that provides the values
 * @returns {PublishController<any>} controller with subscribe, unsubscribe, start, stop, cancel, running, and finished
 * @throws {TypeError} throws synchronously if iterable is not iterable, or when subscribe is called with a non-function
 * @example
 * const publisher = publish(throttle(50, 50, [0, 1, 2, 3]))
 * const key = publisher.subscribe(console.log) // prints 0, 1 - then unsubscribed
 * waitToCall(110, () => publisher.unsubscribe(key)) // console.log is no longer called after 110ms
 * await publisher.finished
 */
export const publish = (iterable) => {
  assertIterable('publish', iterable)
  let sequence = 0
  /** @type {Map<number, (value: any) => any>} */
  const subscribers = new Map()
  let completed = false

  const base = createRunnerController(
    iterable,
    (value, isCancelled) => {
      const keys = [...subscribers.keys()]
      for (const key of keys) {
        if (isCancelled()) break
        const subscriber = subscribers.get(key)
        if (subscriber !== undefined) {
          subscriber(value)
        }
      }
    },
    () => {
      completed = true
      subscribers.clear()
    }
  )

  return {
    stop: base.stop,
    start: base.start,
    cancel: () => {
      completed = true
      subscribers.clear()
      return base.cancel()
    },
    get running () {
      return base.running
    },
    finished: base.finished,
    subscribe: (subscriber) => {
      assertFunction('publish.subscribe', 'subscriber', subscriber)
      const key = ++sequence
      if (!completed) {
        subscribers.set(key, subscriber)
      }
      return key
    },
    unsubscribe: (key) => {
      subscribers.delete(key)
    }
  }
}

/**
 * Executes a reducer function `fn(accumulator, item, index)` on each element of
 * the input iterable, resulting in a single output value.
 *
 * @type {<T = any, R = any>(fn: (accumulator: R extends never[] ? any[] : Awaited<R>, item: Awaited<T>, index: number) => (R extends never[] ? any[] : Awaited<R>) | PromiseLike<R extends never[] ? any[] : Awaited<R>>, accumulator: R, iterable: AsyncIterable<T> | Iterable<T>) => Promise<R extends never[] ? any[] : Awaited<R>>}
 * @param {(accumulator: any, item: any, index: number) => any} fn - fn(accumulator, item, index) that returns (or resolves to)
 * the new accumulator value.
 * @param {any} accumulator - the initial accumulator value (or Promise resolving to it)
 * @param {AsyncIterable<any> | Iterable<any>} iterable - the sequence to execute fn over.
 * @returns {Promise<any>} - Promise resolving to the final accumulator value
 * @throws {TypeError} rejects with TypeError if fn is not a function or iterable is not iterable
 * @example
 * const add = (a, b) => a + b
 * const sum = await reduce(add, 0, [0, 1, 2, 3, 4]) // sum === 10
 */
export const reduce = async (fn, accumulator, iterable) => {
  assertFunction('reduce', 'fn', fn)
  assertIterable('reduce', iterable)
  let acc = /** @type {any} */ (await accumulator)
  let index = 0
  for await (const value of iterable) {
    acc = /** @type {any} */ (await fn(acc, value, index++))
  }
  return acc
}

/**
 * Iterates over an iterable asynchronously in the background, returning a controller
 * to pause (`stop`), resume (`start`), permanently terminate (`cancel`), inspect (`running`),
 * and await completion or errors (`finished`).
 *
 * @type {(iterable: AsyncIterable<any> | Iterable<any>) => RunController}
 * @param {AsyncIterable<any> | Iterable<any>} iterable - input iterable
 * @returns {RunController} controller with start, stop, cancel, running, and finished
 * @throws {TypeError} throws synchronously if iterable is not iterable
 * @example
 * const control = run(longRunningIterable)
 * if (control.running) control.stop()
 * control.start()
 * await control.finished
 */
export const run = (iterable) => {
  assertIterable('run', iterable)
  return createRunnerController(iterable, null, null)
}

/**
 * Drives an iterable asynchronously until completion and returns a Promise
 * that resolves when all items have been consumed.
 *
 * @type {(iterable: AsyncIterable<any> | Iterable<any>) => Promise<void>}
 * @param {AsyncIterable<any> | Iterable<any>} iterable - iterable to iterate over
 * @returns {Promise<void>}
 * @throws {TypeError} rejects with TypeError if iterable is not iterable
 * @example
 * await runAwait([0, 1, 2, 3, 4])
 */
export const runAwait = async (iterable) => {
  assertIterable('runAwait', iterable)
  for await (const unused of iterable) { // eslint-disable-line no-unused-vars
    // all work is done by iterable
  }
}

/**
 * Creates an Array from the items in iterable.
 *
 * @type {<T = any>(iterable: AsyncIterable<T> | Iterable<T>) => Promise<Awaited<T>[]>}
 * @param {AsyncIterable<any> | Iterable<any>} iterable - the iterable to create the array from
 * @returns {Promise<Array<any>>} - Promise resolving to the array
 * @throws {TypeError} rejects with TypeError if iterable is not iterable
 * @example
 * const a = await toArray([0, 1, 2, 3, 4]) // a is [0, 1, 2, 3, 4]
 */
export const toArray = async (iterable) => {
  assertIterable('toArray', iterable)
  /** @type {any[]} */
  const array = []
  for await (const value of iterable) {
    array.push(value)
  }
  return array
}
