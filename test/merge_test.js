import { test } from 'zora'
import { chainable } from '../src/await-for-it'

const toLongAsync = (period, iterable) => chainable(iterable).throttle(period, 0)

const splitByCase = interleaved => {
  return [
    interleaved.filter(s => s === s.toUpperCase()),
    interleaved.filter(s => s !== s.toUpperCase())
  ]
}

const mergeTest = async (iterators, asyncIterables, assert) => {
  const interleaved = await chainable.merge(...asyncIterables).toArray()
  // separate elements of interleaved back out into two arrays by letter case
  const actual = splitByCase(interleaved)
  assert.deepEqual(actual, iterators, 'both iterators were exhausted in order')

  // test that first part of interleaved is truly interleaved
  const interleavedSlice = interleaved.slice(0, iterators[0].length)
  const separated = splitByCase(interleavedSlice)
  const isInterleaved = separated.filter(byCase => byCase.length > 0).length === separated.length
  assert.ok(isInterleaved, 'elements are interleaved, so not simply concatenating sequences')
}

test('merge: fast iterables', async assert => {
  const iterators = [['A', 'B', 'C', 'D'], ['h', 'i', 'j', 'k', 'l']]
  const asyncIterables = [chainable(iterators[0]), chainable(iterators[1])]
  await mergeTest(iterators, asyncIterables, assert)
})

test('merge: slow iterables', async assert => {
  const iterators = [['A', 'B', 'C', 'D'], ['h', 'i', 'j', 'k', 'l']]
  const asyncIterables = [toLongAsync(50, iterators[0]), toLongAsync(80, iterators[1])]
  await mergeTest(iterators, asyncIterables, assert)
})

test('merge: async and sync iterables', async assert => {
  const iterators = [['A', 'B', 'C', 'D'], ['h', 'i', 'j', 'k', 'l']]
  // if it was throttle(50, false), the first value, 'h', would be delayed
  // and all of iterator[0] would come out first - mergeTest would then fail.
  const asyncIterables = [iterators[0], chainable(iterators[1]).throttle(50, 0)]
  await mergeTest(iterators, asyncIterables, assert)
})

class TestError extends Error {}

test('merge: iterable exception is propagated to iterator', async assert => {
  const theError = new TestError('test error')
  const throwingAsyncIterable = async function * () {
    yield 5
    yield 6
    throw theError
  }
  const iterables = [[0, 1, 2, 3, 4], throwingAsyncIterable()]
  let finallyCalled = false
  await chainable
    .merge(...iterables)
    .catch(error => assert.is(error, theError, 'exception thrown from iterable caught directly'))
    .finally(() => { finallyCalled = true })
    .runAwait()
  assert.ok(finallyCalled, 'iteration complete')
})

test('merge: promise rejection is propagated to iterator', async assert => {
  const theError = new TestError('test error')
  const throwingAsyncIterable = async function * () {
    yield 5
    yield 6
    yield new Promise((resolve, reject) => setTimeout(() => reject(theError), 100))
  }
  const iterables = [[0, 1, 2, 3, 4], throwingAsyncIterable()]
  await chainable
    .merge(...iterables)
    .catch(error => assert.is(error, theError, 'merge throws exact error caught'))
    .runAwait()
})
