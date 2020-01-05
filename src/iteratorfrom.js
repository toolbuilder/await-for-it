import { isSyncIterable } from './is.js'

export const iteratorFrom = iterable => isSyncIterable(iterable) ? iterable[Symbol.iterator]() : iterable[Symbol.asyncIterator]()
