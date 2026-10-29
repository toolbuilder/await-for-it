import test from 'node:test'
import assert from 'node:assert/strict'
import { chainable, ChainableClass, makeChainableClass, makeChainableFactory, makeFactory, generators, transforms, reducers } from '../src/await-for-it.js'

test('customization doc: Basic Customization generator', async () => {
  const simpleRange = function * (length) {
    for (let i = 0; i < length; i++) {
      yield i
    }
  }

  const a = await chainable(simpleRange(5)).toArray()
  assert.deepEqual(a, [0, 1, 2, 3, 4])
})

test('customization doc: Basic Customization mapWith', async () => {
  const fn = async function * (iterable) {
    for await (const x of iterable) {
      yield x * x
    }
  }

  const a = await chainable([0, 1, 2, 3]).mapWith(fn).toArray()
  assert.deepEqual(a, [0, 1, 4, 9])
})

test('customization doc: Subclassing ChainableClass', async () => {
  class ExtendedChainable extends ChainableClass {
    double () {
      return this.map(x => x * 2)
    }
  }

  const customChainable = makeFactory(ExtendedChainable)
  const result = await customChainable([1, 2, 3]).double().toArray()
  assert.deepEqual(result, [2, 4, 6])
})

test('customization doc: makeChainableFactory example', async () => {
  const simpleRange = async function * (length) {
    for (let i = 0; i < length; i++) {
      yield i
    }
  }

  const multiply = (n, iterable) => {
    return {
      async * [Symbol.asyncIterator] () {
        for await (const x of iterable) {
          yield n * x
        }
      }
    }
  }

  const byTwo = function (iterable) {
    return transforms.map(x => 2 * x, iterable)
  }

  const toSet = async function (iterable) {
    const set = new Set()
    for await (const value of iterable) {
      set.add(value)
    }
    return set
  }

  const customSequences = { ...generators, simpleRange }
  const customTransforms = { ...transforms, multiply, byTwo }
  const customReducers = { ...reducers, toSet }

  const customChainable = makeChainableFactory(customSequences, customTransforms, customReducers)

  const set = await customChainable.simpleRange(3).multiply(2).toSet()
  assert.deepEqual(set, new Set([0, 2, 4]))

  const anotherSet = await customChainable([0, 1, 2]).multiply(2).toSet()
  assert.deepEqual(anotherSet, new Set([0, 2, 4]))
})

test('customization doc: Minimal ChainableClass with makeChainableClass', async () => {
  const MinimalChainable = makeChainableClass({}, {}, {})

  class CustomPipeline extends MinimalChainable {
    async toArray () {
      const items = []
      for await (const item of this) {
        items.push(item)
      }
      return items
    }
  }

  const customFactory = makeFactory(CustomPipeline)
  const result = await customFactory([1, 2, 3]).toArray()
  assert.deepEqual(result, [1, 2, 3])
})

