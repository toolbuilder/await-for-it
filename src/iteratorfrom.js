import { isSyncIterable } from './is.js'

/**
 * Get an iterator from either synchronous or asynchronous iterators. Since the method call is different for
 * each type of iterable, this hides the difference in a single call. If an iterable supports both
 * synchronous and asynchronous iteration, the synchronous iterator will be returned.
 *
 * @type {<T = any>(iterable: AsyncIterable<T> | Iterable<T>) => AsyncIterator<T> | Iterator<T>}
 * @param {AsyncIterable<any> | Iterable<any>} iterable - any type of iterable
 * @returns {AsyncIterator<any> | Iterator<any>} created by the iterable
 */
export const iteratorFrom = iterable => isSyncIterable(iterable) ? iterable[Symbol.iterator]() : iterable[Symbol.asyncIterator]()
