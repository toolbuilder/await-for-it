import { Semaphore } from './semaphore.js'

export const forEach = async (fn, iterable) => {
  for await (const value of iterable) {
    await fn(value)
  }
}

export const reduce = async (fn, accumulator, iterable) => {
  for await (const value of iterable) {
    accumulator = fn(accumulator, value)
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

export const runAwait = async (iterable) => {
  for await (const value of iterable) { // eslint-disable-line
  }
}

export const toArray = (iterable) => {
  return reduce((a, v) => { a.push(v); return a }, [], iterable)
}
