import { isSyncIterable } from './is.js'

const getIterator = iterable => isSyncIterable(iterable) ? iterable[Symbol.iterator]() : iterable[Symbol.asyncIterator]()
const zipIsDone = nextResults => nextResults.reduce((done, nextResult) => done || nextResult.done, false)
const zipAllIsDone = nextResults => nextResults.reduce((done, nextResult) => done && nextResult.done, true)

// Common implementation for zip and zipAll
const zipIt = async function * (isDone, iterables) {
  const iterators = iterables.map(iterable => getIterator(iterable))
  let nextResults = await Promise.all(iterators.map(i => i.next()))
  while (!isDone(nextResults)) {
    yield nextResults.map(result => (!result.done) ? result.value : undefined)
    nextResults = await Promise.all(iterators.map(i => i.next()))
  }
}

/**
 * Creates a sequence of arrays the same length as the *shortest* iterable provided. The first array contains the first
 * element from each of the iterables provided. The second array contains the second element from each of the
 * iterables provided, and so on. For each array, zip must wait for all iterables to advance. For this reason, zip can be
 * no faster than the slowest iterable. Backpressure is provided by the iterating code.
 *
 * Use zipAll if you want all iterables to be consumed. Use merge if you want to consume iterables as fast as possible, and
 * don't need the elements paired.
 *
 * @param  {...Iterable|...AsyncIterable} iterables - any number of sync or async iterables to be zipped
 * @returns {AsyncGenerator} - merged iterables as async iterable
 * @example
 * const a = [0, 1, 2]
 * const b = ['a', 'b', 'c', 'd'] // this array is longer than a
 * const c = await chainable.zip(a, b).toArray()
 * console.log(c) // prints [[0, 'a'], [1, 'b'], [2, 'c']]
 *
 */
export const zip = (...iterables) => {
  return zipIt(zipIsDone, iterables)
}

/**
 * Creates a sequence of arrays the same length as the *longest* iterable provided. The first array contains the first
 * element from each of the iterables provided. The second array contains the second element from each of the
 * iterables provided, and so on. Missing elements from the shorter iterables are set to undefined. For each array,
 * zip must wait for all iterables to advance. For this reason, zip can be no faster than the slowest iterable.
 * Backpressure is provided by the iterating code.
 *
 * Use zip if you want iteration to stop when any iterable is consumed. Use merge if you want to consume iterables as
 * fast as possible, and don't need the elements paired.
 *
 * @param  {...Iterable|...AsyncIterable} iterables - any number of sync or async iterables to be zipped
 * @returns {AsyncGenerator} - merged iterables as async iterable
 * @example
 * const a = [0, 1, 2]
 * const b = ['a', 'b', 'c', 'd'] // this array is longer than a
 * const c = await chainable.zipAll(a, b).toArray()
 * console.log(c) // prints [[0, 'a'], [1, 'b'], [2, 'c'], [undefined, 'd']]
 *
 */
export const zipAll = (...iterables) => {
  return zipIt(zipAllIsDone, iterables)
}
