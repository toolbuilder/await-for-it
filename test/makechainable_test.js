import { makeChainableClass } from '../src/makechainable.js'
import * as generators from '../src/generators.js'
import * as transforms from '../src/transforms.js'
import * as reducers from '../src/reducers.js'
import tape from 'tape'

// TODO: make subsets of generators, transforms, and reducers
// TODO: test that those methods are present and function correctly
const Chainable = makeChainableClass(generators, transforms, reducers)

const main = async () => {
  console.log(await Chainable.toAsync([0, 1, 2, 3, 4]).toArray())
}

main()
