const isClass = (fn) => {
  try {
    return /^class\b/.test(Function.prototype.toString.call(fn).trimStart())
  } catch {
    return false
  }
}

/**
 * Test if an object is a function (excluding ES6 classes).
 *
 * @param {any} object - value to test
 * @returns {object is (...args: any[]) => any} - true if object is a function
 */
export const isFunction = (object) => typeof object === 'function' && !isClass(object)

/**
 * Test if an item is a string.
 *
 * @param {any} item - value to test
 * @returns {item is string | globalThis.String} - true if item is a string
 */
export const isString = (item) => {
  if (typeof item === 'string') return true
  if (typeof item !== 'object' || item === null) return false
  try {
    String.prototype.valueOf.call(item)
    return true
  } catch {
    return false
  }
}

/**
 * Test if an item supports synchronous iteration.
 *
 * @template [T=any]
 * @param {any} item - value to test
 * @returns {item is Iterable<T>} - true if item is a synchronous iterable
 */
export const isSyncIterable = (item) => typeof item?.[Symbol.iterator] === 'function'

/**
 * Test if an item supports asynchronous iteration.
 *
 * @template [T=any]
 * @param {any} item - value to test
 * @returns {item is AsyncIterable<T>} - true if item is an asynchronous iterable
 */
export const isAsyncIterable = (item) => Boolean(item && typeof item[Symbol.asyncIterator] === 'function')

/**
 * Determines whether a value should be flattened by flatten transforms.
 * Returns true for synchronous or asynchronous iterables, excluding primitives
 * (such as strings) and built-in value/dictionary types that implement iteration
 * (such as TypedArrays, Buffer, Map, URLSearchParams, Headers, FormData).
 *
 * Explicit opt-in or opt-out is supported via `Symbol.isConcatSpreadable`.
 *
 * @param {any} value - value to test
 * @returns {boolean} - true if the value should be flattened
 */
export const shouldIterate = (value) => {
  if (typeof value !== 'object' || value === null) return false
  if (!isSyncIterable(value) && !isAsyncIterable(value)) return false

  // @ts-ignore
  const spreadable = value[Symbol.isConcatSpreadable]
  if (spreadable !== undefined) return Boolean(spreadable)

  if (
    isString(value) ||
    ArrayBuffer.isView(value) ||
    value instanceof Map ||
    (typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams) ||
    (typeof Headers !== 'undefined' && value instanceof Headers) ||
    (typeof FormData !== 'undefined' && value instanceof FormData)
  ) {
    return false
  }

  return true
}
