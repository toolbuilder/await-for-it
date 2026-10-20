/**
 * Test if an object is a function.
 *
 * @param {any} object - value to test
 * @returns {object is (...args: any[]) => any} - true if object is a function
 */
export const isFunction = object => Boolean(object && typeof (object) === 'function')

/**
 * Test if an item is a string.
 *
 * @param {any} item - value to test
 * @returns {item is string | globalThis.String} - true if item is a string
 */
export const isString = (item) => typeof item === 'string' || item instanceof String

/**
 * Test if an item supports synchronous iteration.
 *
 * @template [T=any]
 * @param {any} item - value to test
 * @returns {item is Iterable<T>} - true if item is a synchronous iterable
 */
export const isSyncIterable = (item) => Boolean(item && typeof item[Symbol.iterator] === 'function')

/**
 * Test if an item supports asynchronous iteration.
 *
 * @template [T=any]
 * @param {any} item - value to test
 * @returns {item is AsyncIterable<T>} - true if item is an asynchronous iterable
 */
export const isAsyncIterable = (item) => Boolean(item && typeof item[Symbol.asyncIterator] === 'function')
