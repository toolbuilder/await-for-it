import { makeFactory } from '@toolbuilder/make-factory/src/factory.js'
import { makeChainableClass } from './makechainable.js'
import * as generators from './generators.js'
import * as transforms from './transforms.js'
import * as reducers from './reducers.js'

// Create an easy default chainable iterator builder for common use case
const ChainableClass = makeChainableClass(generators, transforms, reducers)
const chainable = makeFactory(ChainableClass)

export {
  chainable,
  ChainableClass
}
