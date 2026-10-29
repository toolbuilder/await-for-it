import { concatenate } from 'iterablefu/src/generators.js'
import { isAsyncIterable, isFunction, isSyncIterable } from './is.js'
import { iteratorFrom } from './iteratorfrom.js'

/**
 * @template [T=any]
 * @typedef {T extends (...args: any[]) => infer R ? Awaited<R> : Awaited<T>} PoolResult
 */

// Alternative to wrapping a single promise in an Array to get an iterable
const valueToIterator = function * (value) {
  yield value
}

/**
 * Helper async generator for pool.
 *
 * @template [T=any]
 * @param {number} maxPoolSize
 * @param {AsyncIterable<T> | Iterable<T>} iterable
 * @returns {AsyncGenerator<PoolResult<T>, void, unknown>}
 */
const poolGenerator = async function * (maxPoolSize, iterable) {
  let idSequence = 31 // generates unique keys for promisePool, no reason it has to start with 31
  /** @type {Map<number, Promise<{ done?: boolean, value?: any, id: number }>>} */
  const promisePool = new Map() // key is id, value is a promise for the function result
  const iterator = iteratorFrom(iterable)
  /** @type {Promise<{ done?: boolean, value?: any, id?: number }> | null} */
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
    return /** @type {{ done?: boolean, value?: any, id?: number }} */ ({ done })
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

/**
 * Execute functions provided by input iterable. Returns results as they resolve, with
 * no more than maxPoolSize promises pending at any time. Results may be out of order with
 * respect to the input order.
 *
 * The input iterable can yield anything but constructor functions. However, async and sync
 * functions are handled specially. Each function will be called, and the result placed into
 * the pool to be yielded when resolved. Promises will remain in the pool until they resolve,
 * other values will resolve immediately as you would expect. Consider using callWithTimeout,
 * or your own favorite timeout promise.
 *
 * As always with async iterables, if the input iterable yields a Promise, pool must wait
 * until the Promise resolves before advancing the input iterable. This
 * defeats the purpose of pool. So if you need to yield a promise from input iterator,
 * wrap it with a function like so: `() => promise`. Pool will call the function to get
 * the Promise, then advance the input iterable to get the next value.
 *
 * The iteration rate is governed by backpressure from the consumer awaiting the iterator:
 * new tasks are only pulled from the input iterable as earlier tasks resolve and are consumed.
 * Stopping iteration prevents further function calls and cleanly closes the input stream.
 *
 * @type {<T = any>(maxPoolSize: number, iterable: AsyncIterable<T> | Iterable<T>) => AsyncGenerator<PoolResult<T>, void, unknown>}
 * @param {number} maxPoolSize - maximum number of pending promises at any given time
 * @param {AsyncIterable<any> | Iterable<any>} iterable - input iterable, should yield functions for pool
 * to work as intended.
 * @returns {AsyncGenerator<any, void, unknown>} - a generator that provides the output values as they occur
 * @throws {RangeError} if maxPoolSize is not an integer >= 1
 * @throws {TypeError} if iterable is not iterable
 * @throws - if iterable throws, or if any functions yielded by iterable throws, or if any
 * Promise in the pool rejects, the exception will be caught and rethrown by pool, so that the
 * consumer awaiting the iterator can handle it. Once an exception is thrown, the iterator is done.
 */
export const pool = (maxPoolSize, iterable) => {
  if (!Number.isInteger(maxPoolSize) || maxPoolSize < 1) {
    throw new RangeError(`pool parameter 'maxPoolSize' must be an integer >= 1: ${maxPoolSize}`)
  }
  if (!(isAsyncIterable(iterable) || isSyncIterable(iterable))) {
    throw new TypeError(`pool parameter 'iterable' must be iterable: ${iterable}`)
  }

  return poolGenerator(maxPoolSize, iterable)
}
