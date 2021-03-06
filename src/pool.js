import { concatenate } from 'iterablefu/src/generators.js'
import { isFunction } from './is.js'
import { iteratorFrom } from './iteratorfrom.js'

// Alternative to wrapping a single promise in an Array to get an iterable
const valueToIterator = function * (value) {
  yield value
}

/**
 * Execute functions provided by input iterable. Returns results as they resolve, with
 * no more than maxPoolSize promises pending at any time. Results may be out of order with
 * respect to the input order.
 *
 * The input iterable can yield anything but constructor functions. However, async and sync
 * functions are handled specially. Each function will be called, and the result placed into
 * the pool to be yielded when resolved. Promises will remain in the pool until they resolve,
 * other values will resolve immediately as you would expect. Consider using promiseWithTimeout,
 * or your own favorite timeout promise.
 *
 * As always with async iterables, if the input iterable yields a Promise, pool must wait
 * until the Promise resolves before advancing the input iterable. This
 * defeats the purpose of pool. So if you need to yield a promise from input iterator,
 * wrap it with a function like so: `() => promise`. Pool will call the function to get
 * the Promise, then advance the input iterable to get the next value.
 *
 * The iterating code provides backpressure, and can stop function calls by stopping iteration.
 *
 * @param {Number} maxPoolSize - maximum number of pending promises at any given time
 * @param {AsyncIterable|Iterable} iterable - input iterable, should yield functions for pool
 * to work as intended.
 * @returns {AsyncGenerator} - a generator that provides the output values as they occur
 * @throws - if iterable throws, or if any functions yielded by iterable throws, or if any
 * Promise in the pool rejects, the exception will be caught and rethrown by pool, so that the
 * iterating code can handle it. Once an exception is thrown, the iterator is done.
 */
export const pool = async function * (maxPoolSize, iterable) {
  let idSequence = 31 // generates unique keys for promisePool, no reason it has to start with 31
  const promisePool = new Map() // key is id, value is a promise for the function result
  const iterator = iteratorFrom(iterable)
  let nextPromise = null // promise getting next value from iterator

  const getNextValue = async () => {
    const { done, value } = await Promise.resolve(iterator.next())
    if (!done) {
      const id = ++idSequence
      const promise = isFunction(value)
        ? Promise.resolve(value()).then(value => ({ value, id }))
        : Promise.resolve(value).then(value => ({ value, id }))
      promisePool.set(id, promise)
    }
    return { done }
  }

  // Pool should only ask for one value at a time from iterator. When running promise.race, the
  // getNextValue() promise might lose, so we need to keep it around for the next await. This
  // makes sure that backpressure is applied to iterator, and ensures that we see any promise
  // rejections.
  const nextValuePromise = () => {
    if (nextPromise == null) nextPromise = getNextValue().then(result => { nextPromise = null; return result })
    return nextPromise
  }

  // Doing two things here:
  // 1) iterating over the input iterable using nextValuePromise to put things in promisePool
  // 2) yielding results from promisePool
  // Constraints:
  // Cannot iterate faster than we can yield results once promisePool is full.
  // Anytime we get a new value in promisePool, need to run another race on promisePool.
  let { done } = await nextValuePromise()
  while (!done || promisePool.size > 0) {
    if (done || promisePool.size === maxPoolSize) {
      const { value, id } = await Promise.race(promisePool.values())
      promisePool.delete(id)
      yield value
    } else if (promisePool.size === 0) {
      ({ done } = await nextValuePromise())
    } else {
      let value, id
      const promises = concatenate(promisePool.values(), valueToIterator(nextValuePromise()))
      ;({ done, value, id } = await Promise.race(promises))
      if (id) { promisePool.delete(id); yield value }
      // if !id, then iterable.next() resolved, either a new Promise in promisePool or it is done
    }
  }
}
