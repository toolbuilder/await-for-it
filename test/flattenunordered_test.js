import { chainable as sync } from 'iterablefu'
import { test } from 'zora'
import { chainable, transforms } from '../src/await-for-it.js'
import { randomlySlowIterator, runTest } from './toofast'

test('empty iterable', async assert => {
  const actual = []
  for await (const value of transforms.flattenUnordered(10, [])) { // eslint-disable-line
    actual.push(value)
    assert.fail('Should not iterate empty iterable')
  }
  assert.deepEqual(actual, [], 'empty iterable is not iterated')
})

test('strings are not flattened even though iterable', async assert => {
  const input = ['alpha', 'beta', 'gamma']
  const actual = await chainable(input).flattenUnordered(10).toArray()
  assert.deepEqual(actual, input, 'strings are not flattened')
})

test('non-iterables are passed as-is', async assert => {
  const input = [1, 2, {}]
  const actual = await chainable(input).flattenUnordered(10).toArray()
  assert.deepEqual(actual, input, 'non-iterables passed as-is')
})

test('sync iterables are flattened', async assert => {
  const input = [[1, 2, 3], [4, 5], 6, [7, 8]]
  const actual = await chainable(input).flattenUnordered(10).toArray()
  assert.deepEqual(actual.sort(), [1, 2, 3, 4, 5, 6, 7, 8], 'sync iterables were flattened')
})

test('async iterables are flattened and merged', async assert => {
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

test('flattening is not recursive', async assert => {
  const input = [[1, 2, [3, 4]], [5], 6, [7, 8]]
  const actual = await chainable(input).flattenUnordered(10).toArray()
  assert.deepEqual(actual.sort(), [1, 2, [3, 4], 5, 6, 7, 8], 'sync iterables were flattened')
})

class TestError extends Error {}

test('flattenUnordered: passes iterable exceptions to iterator', async assert => {
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
      assert.is(error, theError, 'flattenUnordered rethrows the error from throwingIterable')
      caughtException = true
    })
    .runAwait()
  assert.ok(caughtException, 'flattenUnordered threw exception')
})

test('flattenUnordered: rejected promises from iterable are passed to iterator', async assert => {
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
      assert.is(error, theError, 'flattenUnordered rethrows the error from rejected promise')
      caughtException = true
    })
    .toArray()
  assert.ok(caughtException, 'flattenUnordered threw exception')
})

test('flattenUnordered: iterator called faster than one-at-a-time', async assert => {
  const values = 50
  const makeDataSource = () => sync.range(values).toArray()
  const slowIterable = randomlySlowIterator(5, 5, makeDataSource())
  const iterable = transforms.flattenUnordered(3, slowIterable)
  const actual = await runTest(iterable, values)
  assert.deepEqual(sync(actual).flatten().toArray(), makeDataSource(), 'all values yielded and provided in order')
})
