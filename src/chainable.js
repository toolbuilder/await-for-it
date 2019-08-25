import { makeChainableIterable, makeChainableClass } from './makechainable.js'
import * as generators from './generators.js'
import * as transforms from './transforms.js'
import * as reducers from './reducers.js'

// Create an easy default chainable iterator builder for common use case
const chainable = makeChainableIterable(generators, transforms, reducers)
const ChainableIterable = chainable.ChainableIterable

// Other than PromiseWithTimeout,
// everything has been imported and used (visibly or not) to build chainable
// No unnecessary dependencies are created by exporting everything, and it is
// convenient for users.
export {
  chainable,
  ChainableIterable,
  makeChainableClass,
  makeChainableIterable,
  generators,
  transforms,
  reducers
}
