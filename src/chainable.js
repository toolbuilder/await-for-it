import { makeFactory } from '@toolbuilder/make-factory'
import { makeChainableClass } from './makechainable.js'
import * as generators from './generators.js'
import * as transforms from './transforms.js'
import * as reducers from './reducers.js'

const ChainableClass = makeChainableClass(generators, transforms, reducers)
const chainable = makeFactory(ChainableClass)

export {
  chainable,
  ChainableClass
}
