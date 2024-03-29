import { chainable as sync } from 'iterablefu'
import { test } from 'zora'
import { chainable, transforms } from '../src/await-for-it.js'
import { randomlySlowIterator, runTest } from './toofast.js'

const fastSlowFast = async function * () {
  let i = 0
  for (; i < 5; i++) {
    yield i
  }
  for (; i < 6; i++) {
    yield await new Promise(resolve => setTimeout(() => resolve(i), 250))
  }
  for (; i < 10; i++) {
    yield i
  }
}

test('chunk', async assert => {
  let output = await chainable([0, 1, 2, 3, 4, 5, 6, 7, 8]).chunk(3, 100).toArray()
  assert.deepEqual(output, [[0, 1, 2], [3, 4, 5], [6, 7, 8]], 'can generate all full length chunks')

  output = await chainable([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).chunk(3, 100).toArray()
  assert.deepEqual(output, [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10]], 'can generate partial chunks at end')

  output = await chainable(fastSlowFast()).chunk(3, 100).toArray()
  // notice that timeout only runs when there is something in the buffer. That's why even with a long wait
  // between 4 and 5, we don't get an empty buffer where [5, 6, 7] is.
  assert.deepEqual(output, [[0, 1, 2], [3, 4], [5, 6, 7], [8, 9]], 'can yield partial chunk if it times out')

  output = await chainable([0, 1, 2, 3, 4, 5, 6]).chunk(3, 100).toArray()
  assert.deepEqual(output, [[0, 1, 2], [3, 4, 5], [6]], 'works with sync iterables too')

  let caughtException = false
  await chainable([0, 1, 2])
    .chunk(3, [])
    .catch(error => {
      caughtException = true
      assert.ok(error instanceof RangeError, 'throws range error with incorrect parameter')
    })
    .runAwait()

  assert.ok(caughtException, 'range error caught exception')
})

class TestError extends Error {}

test('chunk: passes iterable exceptions to iterator', async assert => {
  const theError = new TestError('REJECT')
  const throwingIterable = async function * () {
    yield 1
    yield new Promise(resolve => setTimeout(() => resolve(2), 100))
    throw theError
  }
  let caughtException = false
  await chainable(throwingIterable())
    .chunk(3, 100)
    .catch(error => {
      assert.is(error, theError, 'chunk rethrows the error from throwingIterable')
      caughtException = true
    })
    .runAwait()
  assert.ok(caughtException, 'chunk threw exception')
})

test('chunk: rejected promises from iterable are passed to iterator', async assert => {
  const theError = new TestError('REJECT')
  const throwingIterable = async function * () {
    yield 1
    // Timing ensures chunk timeout will happen before exception. The initial implementation
    // would lose the exception in this case
    yield new Promise((resolve, reject) => setTimeout(() => reject(theError), 150))
    yield 2
  }
  let caughtException = false
  await chainable(throwingIterable())
    .chunk(3, 100)
    .catch(error => {
      assert.is(error, theError, 'chunk rethrows the error from rejected promise')
      caughtException = true
    })
    .toArray()
  assert.ok(caughtException, 'chunk threw exception')
})

test('chunk: iterator called faster than one-at-a-time', async assert => {
  // chunk timeout is slower than throttle to make sure chunk is filled each time
  const values = 50
  const makeDataSource = () => sync.range(values).toArray()
  const slowIterable = randomlySlowIterator(5, 5, makeDataSource())
  const iterable = transforms.chunk(2, 4, slowIterable)
  const actual = await runTest(iterable, values)
  assert.deepEqual(sync(actual).flatten().toArray(), makeDataSource(), 'all values yielded and provided in order')
})
