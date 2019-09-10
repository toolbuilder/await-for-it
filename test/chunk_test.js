import tape from 'tape'
import { chainable } from '../src/chainable.js'

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

tape('chunk', async test => {
  let output = await chainable([0, 1, 2, 3, 4, 5, 6, 7, 8]).chunk(3, 100).toArray()
  test.deepEqual(output, [[0, 1, 2], [3, 4, 5], [6, 7, 8]], 'can generate all full length chunks')

  output = await chainable([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).chunk(3, 100).toArray()
  test.deepEqual(output, [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10]], 'can generate partial chunks at end')

  output = await chainable(fastSlowFast()).chunk(3, 100).toArray()
  // notice that timeout only runs when there is something in the buffer. That's why even with a long wait
  // between 4 and 5, we don't get an empty buffer where [5, 6, 7] is.
  test.deepEqual(output, [[0, 1, 2], [3, 4], [5, 6, 7], [8, 9]], 'can yield partial chunk if it times out')

  output = await chainable([0, 1, 2, 3, 4, 5, 6]).chunk(3, 100).toArray()
  test.deepEqual(output, [[0, 1, 2], [3, 4, 5], [6]], 'works with sync iterables too')

  let caughtException = false
  await chainable([0, 1, 2])
    .chunk(3, [])
    .catch(error => {
      caughtException = true
      test.true(error instanceof RangeError, 'throws range error with incorrect parameter')
    })
    .runAwait()

  test.true(caughtException, 'range error caught exception')
  test.end()
})

class TestError extends Error {}

tape('chunk: passes iterable exceptions to iterator', async test => {
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
      test.is(error, theError, 'chunk rethrows the error from throwingIterable')
      caughtException = true
    })
    .runAwait()
  test.true(caughtException, 'chunk threw exception')
  test.end()
})

tape('chunk: rejected promises from iterable are passed to iterator', async test => {
  const theError = new TestError('REJECT')
  const throwingIterable = async function * () {
    yield 1
    // Timing ensures chunk timeout will happen, at which point chunk no longer sees
    // the rejected value if a catch method is not appended to the Promise by chunk.
    yield new Promise((resolve, reject) => setTimeout(() => reject(theError), 150))
    yield 2
  }
  let caughtException = false
  await chainable(throwingIterable())
    .chunk(3, 100)
    .catch(error => {
      test.is(error, theError, 'chunk rethrows the error from rejected promise')
      caughtException = true
    })
    .toArray()
  test.true(caughtException, 'chunk threw exception')
  test.end()
})
