import { shuffle } from './shuffle.js'
import { iteratorFrom } from './iteratorfrom.js'

/**
 * @template [I=any]
 * @typedef {I extends Iterable<infer U> ? Awaited<U> : I extends AsyncIterable<infer U> ? Awaited<U> : any} MergedElement
 */

/**
 * Merge the output of one or more async (or sync) iterables into a single async iterable. Each
 * async iterable is advanced as fast as possible, so that slow iterators do not hold
 * up faster ones. Equal speed iterables are advanced at roughly the same pace.
 *
 * Backpressure is provided by the iterating code. Iteration can be stopped by stopping
 * the iterating code. Note that each merged stream can buffer up to 1 resolved item
 * while downstream work is taking place.
 *
 * If any iterable throws an exception or rejects a promise, the error is propagated to the
 * iterator and all remaining active iterables are closed by calling their `return()` methods.
 * Similarly, if iteration is terminated early (such as via a `break` statement in a `for await...of`
 * loop, or calling `return()` on the generator), all active iterables are cleanly closed.
 * In-flight background rejections are handled safely to prevent unhandled promise rejections.
 *
 * @type {<T extends (Iterable<any> | AsyncIterable<any>)[]>(...iterables: T) => AsyncGenerator<T extends [] ? any : MergedElement<T[number]>, void, unknown>}
 * @param  {...(Iterable<any> | AsyncIterable<any>)} iterables - any number of sync or async iterables to be merged
 * @returns {AsyncGenerator<any, void, unknown>} - merged iterables as async iterable
 * @throws {any} - if any iterable throws an exception or rejects, it will be rethrown
 */
export const merge = async function * (...iterables) {
  // Safe helper to call next() and convert to a promise resolving to { value, done, id }
  // 1. Invokes iterator.next() inside a promise microtask so synchronous throws become rejections
  // 2. Attaches a no-op catch handler to prevent unhandled promise rejections if the race is abandoned
  const nextPromise = (id, iterator) => {
    const promise = Promise.resolve()
      .then(() => iterator.next())
      .then(iterResult => ({ ...iterResult, id }))
    promise.catch(() => {})
    return promise
  }

  const closeIterator = async (iterator) => {
    try {
      if (typeof iterator?.return === 'function') {
        await iterator.return()
      }
    } catch {}
  }

  const states = new Map()

  const closeAll = async () => {
    const iterators = new Set()
    for (const state of states.values()) {
      if (state.iterator) {
        iterators.add(state.iterator)
      }
    }
    await Promise.allSettled(Array.from(iterators).map(closeIterator))
  }

  try {
    // initialize states
    iterables.forEach((iterable, id) => { // using iterables index provided by forEach function as id
      const iterator = iteratorFrom(iterable)
      const promise = nextPromise(id, iterator)
      states.set(id, { iterator, promise })
    })

    // iterables are removed when done, so states.size === 0 indicates all iterables done
    while (states.size > 0) {
      const promises = Array.from(states.values(), state => state.promise)
      // `Promise.race` picks the first resolved promise in `promises`. Since the order
      // of `promises` does not change, a fast iterable near the front could prevent an
      // iterable at the back from advancing. To prevent starvation of equal-speed iterables,
      // shuffle when multiple promises are racing.
      const orderedPromises = promises.length > 1 ? shuffle(promises) : promises
      const { value, done, id } = await Promise.race(orderedPromises)
      if (done) {
        states.delete(id) // remove completed iterable
      } else {
        yield value // yield before advancing to keep iteration synchronized
        const winner = states.get(id)
        if (winner) {
          // advance the iterable that won the race, leave the others untouched for next race
          winner.promise = nextPromise(id, winner.iterator)
        }
      }
    }
  } finally {
    await closeAll()
  }
}
