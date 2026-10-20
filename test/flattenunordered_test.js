import test from 'node:test'
import assert from 'node:assert/strict'
import { chainable as sync } from 'iterablefu'
import { chainable, transforms } from '../src/await-for-it.js'
import { randomlySlowIterator, runTest } from './toofast.js'

test('empty iterable', async () => {
  const actual = []
  for await (const value of transforms.flattenUnordered(10, [])) { // eslint-disable-line
    actual.push(value)
    assert.fail('Should not iterate empty iterable')
  }
  assert.deepEqual(actual, [], 'empty iterable is not iterated')
})

test('strings are not flattened even though iterable', async () => {
  const input = ['alpha', 'beta', 'gamma']
  const actual = await chainable(input).flattenUnordered(10).toArray()
  assert.deepEqual(actual, input, 'strings are not flattened')
})

test('TypedArrays and Maps are not flattened even though iterable', async () => {
  const bytes = new Uint8Array([1, 2, 3])
  const map = new Map([['a', 1]])
  const input = [bytes, map]
  const actual = await chainable(input).flattenUnordered(10).toArray()
  assert.deepEqual(actual, [bytes, map], 'TypedArray and Map are not flattened')
})

test('flattenUnordered respects Symbol.isConcatSpreadable', async () => {
  const nonSpreadable = [1, 2]
  nonSpreadable[Symbol.isConcatSpreadable] = false

  const spreadableBytes = new Uint8Array([3, 4])
  // @ts-ignore
  spreadableBytes[Symbol.isConcatSpreadable] = true

  const input = [nonSpreadable, spreadableBytes]
  const actual = await chainable(input).flattenUnordered(10).toArray()
  assert.equal(actual.includes(nonSpreadable), true, 'opt-out preserved array')
  assert.equal(actual.includes(3), true, 'opt-in flattened byte 3')
  assert.equal(actual.includes(4), true, 'opt-in flattened byte 4')
  assert.equal(actual.length, 3, 'yielded 3 items')
})

test('non-iterables are passed as-is', async () => {
  const input = [1, 2, {}]
  const actual = await chainable(input).flattenUnordered(10).toArray()
  assert.deepEqual(actual, input, 'non-iterables passed as-is')
})

test('sync iterables are flattened', async () => {
  const input = [[1, 2, 3], [4, 5], 6, [7, 8]]
  const actual = await chainable(input).flattenUnordered(10).toArray()
  assert.deepEqual(actual.sort(), [1, 2, 3, 4, 5, 6, 7, 8], 'sync iterables were flattened')
})

test('async iterables are flattened and merged', async () => {
  const input = [
    chainable([1, 2, 3]).throttle(50, 100), // slow it down so guaranteed out of order
    chainable([4, 5]),
    6, // should pass right through
    chainable([7, 8]).throttle(25, 0) // slow this one less
  ]
  const actual = await chainable(input).flattenUnordered(5).toArray()
  const expected = [1, 2, 3, 4, 5, 6, 7, 8]
  assert.notDeepEqual(actual, expected, 'iteration was out of order')
  assert.deepEqual(actual.sort(), expected, 'async iterables were completely iterated')
})

test('flattening is not recursive', async () => {
  const input = [[1, 2, [3, 4]], [5], 6, [7, 8]]
  const actual = await chainable(input).flattenUnordered(10).toArray()
  assert.deepEqual(actual.sort(), [1, 2, [3, 4], 5, 6, 7, 8], 'sync iterables were flattened')
})

class TestError extends Error {}

test('flattenUnordered: passes iterable exceptions to iterator', async () => {
  const theError = new TestError('REJECT')
  const throwingIterable = async function * () {
    yield 1
    yield new Promise(resolve => setTimeout(() => resolve(2), 100))
    throw theError
  }
  let caughtException = false
  await chainable(throwingIterable())
    .flattenUnordered(10)
    .catch(error => {
      assert.equal(error, theError, 'flattenUnordered rethrows the error from throwingIterable')
      caughtException = true
    })
    .runAwait()
  assert.ok(caughtException, 'flattenUnordered threw exception')
})

test('flattenUnordered: rejected promises from iterable are passed to iterator', async () => {
  const theError = new TestError('REJECT')
  const throwingIterable = async function * () {
    yield 1
    yield new Promise((resolve, reject) => setTimeout(() => reject(theError), 150))
    yield 2
  }
  let caughtException = false
  await chainable(throwingIterable())
    .flattenUnordered(10)
    .catch(error => {
      assert.equal(error, theError, 'flattenUnordered rethrows the error from rejected promise')
      caughtException = true
    })
    .toArray()
  assert.ok(caughtException, 'flattenUnordered threw exception')
})

test('flattenUnordered: iterator called faster than one-at-a-time', async () => {
  const values = 50
  const makeDataSource = () => sync.range(values).toArray()
  const slowIterable = randomlySlowIterator(5, 5, makeDataSource())
  const iterable = transforms.flattenUnordered(3, slowIterable)
  const actual = await runTest(iterable, values)
  assert.deepEqual(sync(actual).flatten().toArray(), makeDataSource(), 'all values yielded and provided in order')
})
