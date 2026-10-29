import { iteratorFrom } from './iteratorfrom.js'

/**
 * @template [I=any]
 * @typedef {I extends AsyncIterable<infer U> ? U : I extends Iterable<infer U> ? U : any} ZipElement
 */

/**
 * @template {(Iterable<any> | AsyncIterable<any>)[]} [T=(Iterable<any> | AsyncIterable<any>)[]]
 * @typedef {T extends [] ? any[] : { -readonly [K in keyof T]: ZipElement<T[K]> }} ZipTuple
 */

/**
 * @template {(Iterable<any> | AsyncIterable<any>)[]} [T=(Iterable<any> | AsyncIterable<any>)[]]
 * @typedef {T extends [] ? any[] : T extends [any] ? { -readonly [K in keyof T]: ZipElement<T[K]> } : { -readonly [K in keyof T]: ZipElement<T[K]> | undefined }} ZipAllTuple
 */

/**
 * Safely calls return() on an iterator if available.
 *
 * @param {Iterator<any> | AsyncIterator<any>} iterator
 * @returns {Promise<void>}
 */
const closeIterator = async (iterator) => {
  try {
    if (typeof iterator?.return === 'function') {
      await iterator.return()
    }
  } catch {}
}

/**
 * Common implementation for zip and zipAll.
 *
 * @param {boolean} stopOnFirst - true for zip (stops when any iterable ends), false for zipAll (continues until all end)
 * @param {Array<Iterable<any> | AsyncIterable<any>>} iterables - any number of sync or async iterables to be zipped
 * @returns {AsyncGenerator<any, void, unknown>} - each element of the AsyncGenerator is an Array containing the zip results.
 */
const zipIt = async function * (stopOnFirst, iterables) {
  if (iterables.length === 0) {
    return
  }

  // Obtain iterators; if obtaining any iterator fails, clean up those already created
  const iterators = []
  try {
    for (const iterable of iterables) {
      iterators.push(iteratorFrom(iterable))
    }
  } catch (err) {
    await Promise.allSettled(iterators.map(closeIterator))
    throw err
  }

  // Track completion state per iterator
  const isDone = new Array(iterators.length).fill(false)

  // Safe next helper that guards against unhandled rejections if sibling rejects first
  const safeNext = (iterator, index) => {
    if (isDone[index]) {
      return Promise.resolve({ done: true, value: undefined })
    }
    const promise = Promise.resolve()
      .then(() => iterator.next())
      .catch((err) => {
        isDone[index] = true
        throw err
      })
    promise.catch(() => {}) // prevent unhandledRejection if sibling rejects first
    return promise
  }

  try {
    while (true) {
      // Advance active iterators concurrently
      const nextResults = await Promise.all(iterators.map((it, idx) => safeNext(it, idx)))

      for (let i = 0; i < nextResults.length; i++) {
        if (nextResults[i].done) {
          isDone[i] = true
        }
      }

      const anyDone = isDone.some(Boolean)
      const allDone = isDone.every(Boolean)

      if (stopOnFirst ? anyDone : allDone) {
        break
      }

      yield nextResults.map(result => (!result.done ? result.value : undefined))
    }
  } finally {
    await Promise.allSettled(iterators.map(closeIterator))
  }
}

/**
 * Creates a sequence of arrays the same length as the *shortest* iterable provided. The first array contains the first
 * element from each of the iterables provided. The second array contains the second element from each of the
 * iterables provided, and so on. For each array, zip must wait for all iterables to advance. For this reason, zip can be
 * no faster than the slowest iterable. The iteration rate is governed by backpressure from the consumer awaiting the iterator.
 *
 * Use zipAll if you want all iterables to be consumed. Use merge if you want to consume iterables as fast as possible, and
 * don't need the elements paired.
 *
 * @type {<T extends (Iterable<any> | AsyncIterable<any>)[]>(...iterables: T) => AsyncGenerator<ZipTuple<T>, void, unknown>}
 * @param  {...(Iterable<any> | AsyncIterable<any>)} iterables - any number of sync or async iterables to be zipped
 * @returns {AsyncGenerator<any, void, unknown>} - zipped iterables as async iterable
 * @throws {any} - if any iterable throws an exception or rejects, it will be rethrown
 * @example
 * const a = [0, 1, 2]
 * const b = ['a', 'b', 'c', 'd'] // this array is longer than a
 * const c = await chainable.zip(a, b).toArray()
 * console.log(c) // prints [[0, 'a'], [1, 'b'], [2, 'c']]
 *
 */
export const zip = (...iterables) => zipIt(true, iterables)

/**
 * Creates a sequence of arrays the same length as the *longest* iterable provided. The first array contains the first
 * element from each of the iterables provided. The second array contains the second element from each of the
 * iterables provided, and so on. Missing elements from the shorter iterables are set to undefined. For each array,
 * zipAll must wait for all active iterables to advance. For this reason, zipAll can be no faster than the slowest iterable.
 * The iteration rate is governed by backpressure from the consumer awaiting the iterator.
 *
 * Use zip if you want iteration to stop when any iterable is consumed. Use merge if you want to consume iterables as
 * fast as possible, and don't need the elements paired.
 *
 * @type {<T extends (Iterable<any> | AsyncIterable<any>)[]>(...iterables: T) => AsyncGenerator<ZipAllTuple<T>, void, unknown>}
 * @param  {...(Iterable<any> | AsyncIterable<any>)} iterables - any number of sync or async iterables to be zipped
 * @returns {AsyncGenerator<any, void, unknown>} - zipped iterables as async iterable
 * @throws {any} - if any iterable throws an exception or rejects, it will be rethrown
 * @example
 * const a = [0, 1, 2]
 * const b = ['a', 'b', 'c', 'd'] // this array is longer than a
 * const c = await chainable.zipAll(a, b).toArray()
 * console.log(c) // prints [[0, 'a'], [1, 'b'], [2, 'c'], [undefined, 'd']]
 *
 */
export const zipAll = (...iterables) => zipIt(false, iterables)
