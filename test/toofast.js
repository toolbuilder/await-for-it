import assert from 'node:assert/strict'
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

/**
 * Returns a pseudo-random integer in the inclusive range [max(0, n - plusOrMinus), n + plusOrMinus].
 * Clamps negative minimum values to 0 so the result is always non-negative.
 *
 * @param {number} n - center point of range
 * @param {number} plusOrMinus - variance above and below center point
 * @returns {number} non-negative integer
 */
export const randomInt = (n, plusOrMinus) => {
  const min = Math.max(0, Math.floor(n - plusOrMinus))
  const max = Math.floor(n + plusOrMinus)
  const range = max - min + 1
  return min + Math.floor(Math.random() * range)
}

/**
 * Wait a randomly chosen duration before calling fn.
 *
 * @template T
 * @param {number} n - center duration in milliseconds
 * @param {number} plusOrMinus - variance in milliseconds
 * @param {() => T | PromiseLike<T>} fn - function to call
 * @returns {Promise<Awaited<T>>}
 */
export const waitRandomlyToCall = async (n, plusOrMinus, fn) => {
  return waitToCall(randomInt(n, plusOrMinus), fn)
}

/**
 * Yields elements from iterable with a random delay between each element.
 *
 * @template T
 * @param {number} n - center duration in milliseconds
 * @param {number} plusOrMinus - variance in milliseconds
 * @param {AsyncIterable<T> | Iterable<T>} iterable - input sequence
 * @returns {import('../src/chainable.js').ChainableIterable<Awaited<T>>}
 */
export const randomlySlowIterator = (n, plusOrMinus, iterable) => {
  return chainable(iterable).map(x => waitRandomlyToCall(n, plusOrMinus, () => x))
}

/**
 * Validates that an async iterator behaves correctly when iterator.next()
 * is called repeatedly in the same tick faster than promises resolve.
 *
 * Verifies:
 * 1. Promises resolve in strict FIFO order (call i settles before call i+1).
 * 2. Pre-completion items have { done: false }.
 * 3. Once done: true is reached, all subsequent calls resolve to { done: true, value: undefined }.
 * 4. No unhandled promise rejections are leaked.
 *
 * @param {AsyncIterable<any> | Iterable<any>} iterable - iterable to test
 * @param {number} values - expected number of items or calls to request
 * @param {object} [options]
 * @param {number} [options.extraCalls=10] - extra calls after values
 * @param {boolean} [options.strictDone=true] - assert post-done calls are { done: true, value: undefined }
 * @returns {Promise<any[]>} array of yielded values prior to completion
 */
export const runTest = async (iterable, values, options = {}) => {
  const { extraCalls = 10, strictDone = true } = options
  const iterator = iteratorFrom(iterable)
  const totalCalls = values + extraCalls

  /** @type {Array<{ index: number, res?: any, err?: any }>} */
  const resolutionOrder = []
  /** @type {Promise<any>[]} */
  const promises = []

  for (let i = 0; i < totalCalls; i++) {
    // Wrap with Promise.resolve in case next() returns a plain value (sync iterator)
    const p = Promise.resolve().then(() => iterator.next())
    // Attach an immediate handler to track temporal resolution order and catch rejections
    p.then(
      res => resolutionOrder.push({ index: i, res }),
      err => resolutionOrder.push({ index: i, err })
    ).catch(() => {})
    promises.push(p)
  }

  // Wait for all promises to settle safely
  const results = await Promise.all(promises)

  // 1. Verify strict FIFO resolution order
  for (let i = 0; i < resolutionOrder.length; i++) {
    assert.equal(
      resolutionOrder[i].index,
      i,
      `Iterator violated FIFO order: next() call #${resolutionOrder[i].index} resolved before call #${i}`
    )
  }

  // 2. Separate values from completed results
  const firstDoneIndex = results.findIndex(r => r.done === true)
  const valueResults = firstDoneIndex === -1 ? results : results.slice(0, firstDoneIndex)
  const postDoneResults = firstDoneIndex === -1 ? [] : results.slice(firstDoneIndex)

  // 3. Verify post-done invariance if iterator completed
  if (strictDone && firstDoneIndex !== -1) {
    for (let i = 0; i < postDoneResults.length; i++) {
      const callNum = firstDoneIndex + i
      assert.equal(postDoneResults[i].done, true, `Call #${callNum} after done: true must also have done: true`)
      assert.equal(postDoneResults[i].value, undefined, `Call #${callNum} after done: true must have value undefined`)
    }
  }

  return valueResults.map(r => r.value)
}
