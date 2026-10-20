import { shouldIterate } from './is.js'
import { iteratorFrom } from './iteratorfrom.js'
import { shuffle } from './shuffle.js'

/**
 * Flattens a sequence of items one level deep. Unlike flatten, flattenUnordered attempts
 * to flatten several iterables at the same time, so the output is not in a predictable
 * order. Async and sync iterables within the provided iterable are supported. Does not
 * flatten strings, TypedArrays/Buffers, Maps, or other built-in record/value types even
 * though they are iterable. Supports explicit opt-in or opt-out via `Symbol.isConcatSpreadable`.
 *
 * The number of iterables being flattened at the same time is limited by maxPoolSize. When
 * this number is reached, flattenUnordered will begin to apply backpressure if it is being
 * iterated more slowly than the input iterables can supply data. In other words, no more
 * than maxPoolSize Promises will be pending at any given time.
 *
 * @type {(maxPoolSize: number, inputIterable: AsyncIterable<any> | Iterable<any>) => AsyncGenerator<any, void, unknown>}
 * @param {number} maxPoolSize - maximum number of iterables that can be flattened at the same time.
 * @param {AsyncIterable<any> | Iterable<any>} inputIterable - the iterable sequence to flatten
 * @returns {AsyncGenerator<any, void, unknown>} for the flattened sequence
 * @example
 * const array = await chainable([[1, 2, 3], [4, 5], 6, [7, 8]]).flattenUnordered(5).toArray()
 * console.log(array.sort()) // prints [1, 2, 3, 4, 5, 6, 7, 8].
 */
export const flattenUnordered = async function * (maxPoolSize, inputIterable) {
  if (!Number.isInteger(maxPoolSize) || maxPoolSize < 1) {
    throw new RangeError(`flattenUnordered parameter 'maxPoolSize' must be an integer >= 1: ${maxPoolSize}`)
  }

  // get Promise for iterator.next(), then augment with id to find associated iterator in pool
  const nextPromise = (id, iterator) => {
    // use Promise.resolve in case iterator is NOT async
    // add id to result so we can tell which iterator it came from
    return Promise.resolve(iterator.next()).then(iterResult => ({ ...iterResult, id }))
  }

  let idSequence = 31 // generates unique keys for promisePool, no reason it has to start with 31

  // state for iterating over inputIterable
  const inputIteratorId = 30
  /** @type {any} */
  const inputIteratorState = {}
  inputIteratorState.iterator = iteratorFrom(inputIterable)
  inputIteratorState.promise = nextPromise(inputIteratorId, inputIteratorState.iterator)
  inputIteratorState.done = false

  // iteratorPool contains state for all iterables to be flattened,
  // AND only when waitingForInput(), iteratorPool contains inputIterableState
  const iteratorPool = new Map() // map key: id, map value: { iterator, promise, done }
  iteratorPool.set(inputIteratorId, inputIteratorState)

  // returns true when we are waiting for a value from the inputIterable
  const waitingForInput = () => iteratorPool.has(inputIteratorId)

  const closeIterator = async (iterator) => {
    try {
      if (typeof iterator?.return === 'function') {
        await iterator.return()
      }
    } catch {}
  }

  const closeAll = async () => {
    const iterators = new Set()
    if (!inputIteratorState.done && inputIteratorState.iterator) {
      iterators.add(inputIteratorState.iterator)
    }
    for (const state of iteratorPool.values()) {
      if (state.iterator) {
        iterators.add(state.iterator)
      }
    }
    await Promise.allSettled(Array.from(iterators).map(closeIterator))
  }

  // iteratorPool.size === 0 indicates inputIterable is done, and that all flattening of value from
  // inputIterable is also done.
  try {
    while (iteratorPool.size > 0) {
      // collect the iterator promises from the iteratorPool
      const promises = Array.from(iteratorPool.values()).map(state => state.promise)
      // `Promise.race` picks the first resolved promise in `promises`. Since the order
      // of `promises` does not change, a fast iterable near the front could prevent an
      // iterable at the back from advancing. In testing, I don't see this, but to be
      // safe, we'll shuffle the promises with a tested algorithm so you don't see weirdness.
      const { value, done, id } = await Promise.race(shuffle(promises))
      if (done) {
        iteratorPool.delete(id) // iteration done, so remove iterator from pool
        if (id === inputIteratorId) inputIteratorState.done = true
      } else {
        if (id === inputIteratorId) {
          iteratorPool.delete(inputIteratorId) // will insert again when another value is needed from inputIterable
          if (shouldIterate(value)) {
            const iterableId = idSequence++
            const iterator = iteratorFrom(value)
            iteratorPool.set(iterableId, { iterator, promise: nextPromise(iterableId, iterator) })
          } else {
            yield value
          }
        } else { // we have a result from an iterable we are flattening
          yield value // yield before asking for next value to apply backpressure to iteration
          const winner = iteratorPool.get(id)
          winner.promise = nextPromise(id, winner.iterator)
        }
      }

      // Now that we've dealt with the Promise result...
      // Check to see if another value from inputIterable is required.
      // If pool is full, then enough flattening is already going on.
      // Only want at most one inputIterable promise pending, to adhere to one-at-a-time
      // iterating convention, so need to check waitingForInput().
      // Pool size is correct if !waitingForInput()
      if (iteratorPool.size < maxPoolSize && !waitingForInput() && !inputIteratorState.done) {
        inputIteratorState.promise = nextPromise(inputIteratorId, inputIteratorState.iterator)
        iteratorPool.set(inputIteratorId, inputIteratorState) // add inputIteratorState back into pool to pick up next value
      }
    }
  } finally {
    await closeAll()
  }
}
