import test from 'node:test'
import assert from 'node:assert/strict'
import { chainable as sync } from 'iterablefu'
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

test('chunk', async () => {
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

  assert.throws(
    () => chainable([0, 1, 2]).chunk(3, /** @type {any} */ ([])),
    RangeError,
    'throws range error with incorrect parameter'
  )
})

class TestError extends Error {}

test('chunk: passes iterable exceptions to iterator', async () => {
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
      assert.equal(error, theError, 'chunk rethrows the error from throwingIterable')
      caughtException = true
    })
    .runAwait()
  assert.ok(caughtException, 'chunk threw exception')
})

test('chunk: rejected promises from iterable are passed to iterator', async () => {
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
      assert.equal(error, theError, 'chunk rethrows the error from rejected promise')
      caughtException = true
    })
    .toArray()
  assert.ok(caughtException, 'chunk threw exception')
})

test('chunk: iterator called faster than one-at-a-time', async () => {
  // chunk timeout is slower than throttle to make sure chunk is filled each time
  const values = 50
  const makeDataSource = () => sync.range(values).toArray()
  const slowIterable = randomlySlowIterator(5, 5, makeDataSource())
  const iterable = transforms.chunk(2, 4, slowIterable)
  const actual = await runTest(iterable, values)
  assert.deepEqual(sync(actual).flatten().toArray(), makeDataSource(), 'all values yielded and provided in order')
})

test('chunk: parameter validation throws appropriate errors', async () => {
  // Invalid n values
  for (const badN of [0, -1, -0.5, 2.5, '3', null, NaN]) {
    await assert.rejects(
      async () => {
        const it = transforms.chunk(/** @type {any} */ (badN), 100, [1, 2, 3])
        await it.next()
      },
      RangeError,
      `n=${badN} should throw RangeError`
    )
  }

  // Invalid timeout values
  for (const badTimeout of [-1, -0.5, '100', NaN]) {
    await assert.rejects(
      async () => {
        const it = transforms.chunk(3, /** @type {any} */ (badTimeout), [1, 2, 3])
        await it.next()
      },
      RangeError,
      `timeout=${badTimeout} should throw RangeError`
    )
  }

  // Invalid iterable values
  for (const badIterable of [null, undefined, 123, {}]) {
    await assert.rejects(
      async () => {
        const it = transforms.chunk(3, 100, /** @type {any} */ (badIterable))
        await it.next()
      },
      TypeError,
      `iterable=${badIterable} should throw TypeError`
    )
  }
})

test('chunk: empty iterable produces no chunks', async () => {
  const result = await chainable([]).chunk(3, 100).toArray()
  assert.deepEqual(result, [])
})

test('chunk: yields buffered item after timeout even if subsequent item is slow', async () => {
  // When chunk 1 times out, item 2 is in-flight. When item 2 lands in the buffer,
  // chunk 2 must yield [2] after timeout even if item 3 takes much longer.
  async function * source () {
    yield 1
    // Item 2 arrives at 120ms (chunk 1 times out at 100ms)
    yield await new Promise(resolve => setTimeout(() => resolve(2), 120))
    // Item 3 takes 2000ms
    yield await new Promise(resolve => setTimeout(() => resolve(3), 2000))
  }

  const startTime = Date.now()
  const it = transforms.chunk(2, 100, source())

  const c1 = await it.next()
  assert.deepEqual(c1.value, [1], 'chunk 1 yields item 1 on timeout')

  // Allow item 2 to resolve and land in the buffer before asking for chunk 2
  await new Promise(resolve => setTimeout(resolve, 50))

  const c2 = await it.next()
  const elapsed = Date.now() - startTime
  assert.deepEqual(c2.value, [2], 'chunk 2 yields item 2 on timeout without waiting for item 3')
  assert.ok(elapsed < 1000, `chunk 2 should not wait for slow item 3 (took ${elapsed}ms)`)
})

test('chunk: does not deadlock when buffered item is waiting and subsequent item never arrives', async () => {
  async function * source () {
    yield 1
    yield await new Promise(resolve => setTimeout(() => resolve(2), 120))
    // Item 3 never arrives
    await new Promise(() => {})
  }

  const it = transforms.chunk(2, 100, source())
  const c1 = await it.next()
  assert.deepEqual(c1.value, [1])

  // Allow item 2 to land in buffer
  await new Promise(resolve => setTimeout(resolve, 50))

  // Must yield [2] after timeout rather than hanging indefinitely
  const c2Promise = it.next()
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Deadlock: chunk did not yield buffered item')), 500)
  )
  const c2 = await Promise.race([c2Promise, timeoutPromise])
  assert.deepEqual(c2.value, [2])
})

test('chunk: closes upstream iterable on early termination', async () => {
  let sourceClosed = false
  async function * source () {
    try {
      yield 1
      yield 2
      yield 3
      yield 4
    } finally {
      sourceClosed = true
    }
  }

  for await (const ch of transforms.chunk(2, 100, source())) {
    assert.deepEqual(ch, [1, 2])
    break
  }

  assert.equal(sourceClosed, true, 'source iterable return() was called on early break')
})

test('chunk: clears timers so completed iteration does not keep event loop open', async () => {
  // If timer is not cleared, a 60-second timeout would remain active in the event loop
  const it = transforms.chunk(2, 60000, [1, 2, 3, 4])
  const result = await chainable(it).toArray()
  assert.deepEqual(result, [[1, 2], [3, 4]])
})

test('chunk: late rejection while paused between chunks does not cause unhandledRejection', async () => {
  let unhandled = false
  const onUnhandled = () => { unhandled = true }
  process.on('unhandledRejection', onUnhandled)

  try {
    const theError = new TestError('LATE_REJECT')
    async function * source () {
      yield 1
      // Rejection happens at 120ms, after chunk 1 times out at 100ms
      yield await new Promise((_, reject) => setTimeout(() => reject(theError), 120))
    }

    const it = transforms.chunk(3, 100, source())
    const c1 = await it.next()
    assert.deepEqual(c1.value, [1])

    // Wait for the rejection to occur while paused between chunks
    await new Promise(resolve => setTimeout(resolve, 50))
    assert.equal(unhandled, false, 'no unhandledRejection while in-flight promise rejected between chunks')

    // Next chunk call must propagate the rejection
    await assert.rejects(async () => it.next(), theError)
  } finally {
    process.off('unhandledRejection', onUnhandled)
  }
})
