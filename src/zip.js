import { isSyncIterable } from './is.js'

const zipIt = async function * (isDone, iterables) {
  const iterators = iterables.map(iterable => isSyncIterable(iterable) ? iterable[Symbol.iterator]() : iterable[Symbol.asyncIterator]())
  // TODO: use reduce to get results and isDone in one pass
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
 * Use zipAll if you want all iterables to be consumed. Use merge if you want to consume iterables as fast as possible.
 *
 * @param  {...Iterable|...AsyncIterable} iterables - any number of sync or async iterables to be zipped
 * @returns {AsyncGenerator} - merged iterables as async iterable
 *
 */
export const zip = (...iterables) => {
  const isDone = (nextResults) => nextResults.reduce((done, nextResult) => done || nextResult.done, false)
  return zipIt(isDone, iterables)
}

export const zipAll = (...iterables) => {
  const isDone = (nextResults) => nextResults.reduce((done, nextResult) => done && nextResult.done, true)
  return zipIt(isDone, iterables)
}
