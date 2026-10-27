import { isAsyncIterable, isSyncIterable } from './is.js'

/**
 * Get an iterator from either an asynchronous or synchronous iterable. Since the method call is
 * different for each type of iterable, this hides the difference in a single call. If an iterable
 * supports both asynchronous and synchronous iteration, the asynchronous iterator will be returned
 * (matching JavaScript's `for await...of` semantics).
 *
 * @type {<I extends AsyncIterable<any> | Iterable<any> = any>(iterable: I) => I extends AsyncIterable<infer U> ? AsyncIterator<U> : I extends Iterable<infer U> ? Iterator<U> : never}
 * @param {AsyncIterable<any> | Iterable<any>} iterable - any async or sync iterable
 * @returns {any} iterator created by the iterable
 * @throws {TypeError} if iterable is neither an AsyncIterable nor an Iterable
 */
export const iteratorFrom = (iterable) => {
  if (isAsyncIterable(iterable)) return /** @type {any} */ (iterable[Symbol.asyncIterator]())
  if (isSyncIterable(iterable)) return /** @type {any} */ (iterable[Symbol.iterator]())
  let formatted
  try {
    formatted = String(iterable)
  } catch {
    formatted = Object.prototype.toString.call(iterable)
  }
  throw new TypeError(`iteratorFrom parameter 'iterable' must be iterable: ${formatted}`)
}
