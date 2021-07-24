import { chainable as sync } from 'iterablefu'
import { chainable, iteratorFrom, waitToCall } from '../src/await-for-it.js'

/*
  Almost always you want to iterate an async iterable one-at-a-time so that the prior iterator.next() call
  resolves before iterator.next() is called again. This is how the for...await loop works.

  However, you don't have to wait, and can call as many times as memory permits. JavaScript creates iterators
  that support this use case for all generator functions. However, I wanted to verify that some of the more
  complex generators in this package behave properly for this use case.

  This file provides support functions for testing this use case.
*/

export const randomInt = (n, plusOrMinus) => {
  const variance = Math.floor(Math.random() * Math.floor(2 * plusOrMinus))
  return n - plusOrMinus + variance
}

export const waitRandomlyToCall = async (n, plusOrMinus, fn) => {
  return waitToCall(randomInt(n, plusOrMinus), fn)
}

export const randomlySlowIterator = (n, plusOrMinus, iterable) => {
  return chainable(iterable).map(x => waitRandomlyToCall(n, plusOrMinus, () => x))
}

export const runTest = async (iterable, values) => {
  const iterator = iteratorFrom(iterable)
  // Call next() more times than expected number of values in this tick - way before the first one will yield
  const iteratorPromises = sync.range(0, values + 10).map(() => iterator.next()).toArray()
  // Iterate the promises, waiting for each one to resolve.
  const iteratorResults = await chainable(iteratorPromises).toArray()
  const actual = sync(iteratorResults)
    .takeWhile(result => result.done !== true) // if done too early, don't want the remainder anyway
    .map(result => result.value) // now we have just arrays
    .toArray()
  return actual
}
