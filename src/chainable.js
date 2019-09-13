import { makeFactory } from '@toolbuilder/make-factory/src/factory.js'
import { makeChainableFactory, makeChainableClass } from './makechainable.js'
import { isAsyncIterable, isSyncIterable } from './is.js'
import * as generators from './generators.js'
import * as transforms from './transforms.js'
import * as reducers from './reducers.js'

// Create an easy default chainable iterator builder for common use case
const ChainableClass = makeChainableClass(generators, transforms, reducers)
const chainable = makeFactory(ChainableClass)

export { Poll } from './poll.js'
export { Queue } from './queue.js'

// everything has been imported and used (visibly or not) to build chainable
// No unnecessary dependencies are created by exporting everything, and it is
// convenient for users.
export {
  chainable,
  ChainableClass,
  isAsyncIterable,
  isSyncIterable,
  makeChainableClass,
  makeChainableFactory,
  makeFactory,
  generators,
  transforms,
  reducers
}
