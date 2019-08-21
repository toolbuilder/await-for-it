export const isString = (item) => typeof item === 'string' || item instanceof String
export const isSyncIterable = (item) => item && typeof item[Symbol.iterator] === 'function'
export const isAsyncIterable = (item) => item && typeof item[Symbol.asyncIterator] === 'function'
