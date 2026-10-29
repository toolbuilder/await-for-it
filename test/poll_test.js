import test from 'node:test'
import assert from 'node:assert/strict'
import { chainable as sync, generators } from 'iterablefu'
import { chainable, iteratorFrom, Poll } from '../src/await-for-it.js'
import { runTest } from './toofast.js'

const allowableJitter = 15
const waitTimeGood = (n, reference) => (n > reference - allowableJitter) && (n < reference + allowableJitter)

test('poll: function results are output in order', async () => {
  let count = 0
  const pollingPeriod = 50
  const pollCount = 5
  const poll = new Poll(async () => count++, pollingPeriod)
  const output = await chainable(poll)
    .take(pollCount)
    .toArray()
  poll.done()
  assert.deepEqual(output, [...generators.range(5)], 'function results are output in order')
})

test('poll: slow iteration controls polling period', async () => {
  const iterationPeriod = 100
  const pollingPeriod = 50
  const durationCount = 5
  const poll = new Poll(() => Date.now(), pollingPeriod, 0)
  const output = await chainable(poll)
    .throttle(iterationPeriod, 0)
    .diff((previous, current) => current - previous)
    .take(durationCount)
    // This test seems to take a while to get started so duration can be 130 or more
    .filter(duration => duration > (iterationPeriod - allowableJitter))
    .toArray()
  poll.done()
  assert.equal(output.length, durationCount, 'iteration period controls polling rate')
})

test('poll: poller controls polling period with fast iteration', async () => {
  const pollingPeriod = 50
  const durationCount = 5
  const poll = new Poll(() => Date.now(), pollingPeriod, 0)
  const output = await chainable(poll)
    .diff((previous, current) => current - previous)
    .take(durationCount)
    .filter(duration => duration > (pollingPeriod - allowableJitter))
    .toArray()
  poll.done()
  assert.equal(output.length, durationCount, 'slower polling rate controls faster iterators')
})

test('poll: slow async function controls polling period', async () => {
  const pollingPeriod = 50
  const durationCount = 5
  const fn = () => new Promise(resolve => setTimeout(() => resolve(Date.now()), 2 * pollingPeriod))
  const poll = new Poll(fn, pollingPeriod, 0)
  const output = await chainable(poll)
    .diff((previous, current) => current - previous)
    .take(durationCount)
    .filter(duration => duration > (2 * (pollingPeriod - allowableJitter)))
    .toArray()
  poll.done()
  assert.equal(output.length, durationCount, 'slow async function controls polling rate')
})

test('poll: can wait before first call', async () => {
  const waitTime = 100
  const startTime = Date.now()
  const poll = new Poll(async () => Date.now(), waitTime, waitTime)
  const output = await chainable(poll).take(2).toArray()
  poll.done()
  const timeToFirstCall = output[0] - startTime
  assert.ok(waitTimeGood(timeToFirstCall, waitTime), 'polling waited to start')
})

test('poll works with synchronous functions', async () => {
  let count = 0
  const syncFunction = () => count++
  const waitTime = 100
  const poll = new Poll(syncFunction, waitTime)
  const output = await chainable(poll).take(5).toArray()
  assert.deepEqual(output, [0, 1, 2, 3, 4], 'poll called synchronous function correctly')
})

test('poll: exception thrown by function propagates to iterator', async () => {
  const theError = new Error('poll exception')
  const fn = () => new Promise((resolve, reject) => setTimeout(() => reject(theError), 50))
  const poll = new Poll(fn, 50)
  await chainable(poll)
    .catch(error => assert.equal(error, theError, 'caught the thrown exception'))
    .finally(() => poll.done())
    .toArray()
})

test('poll: calling done stops iteration', async () => {
  let count = 0
  let finallyCalled = false
  const pollingPeriod = 50
  const pollCount = 5
  const poll = new Poll(async () => count++, pollingPeriod)
  await chainable(poll)
    .callAwait((x) => { if (x === pollCount) poll.done() })
    .finally(() => { finallyCalled = true })
    .runAwait()
  assert.equal(finallyCalled, true, 'poll.done completed iteration')
  poll.done()
})

test('poll: iterator called faster than one-at-a-time', async () => {
  const values = 50
  let count = 0
  const poller = new Poll(() => {
    const val = count++
    if (val === values - 1) poller.done()
    return val
  }, 5)
  const actual = await runTest(poller, values)
  assert.deepEqual(actual, sync.range(values).toArray(), 'all values yielded and provided in order')
})

test('poll: validates constructor parameters', () => {
  // @ts-ignore
  assert.throws(() => new Poll(null, 100), TypeError)
  // @ts-ignore
  assert.throws(() => new Poll('not a function', 100), TypeError)
  // @ts-ignore
  assert.throws(() => new Poll(() => 1, 0), RangeError)
  // @ts-ignore
  assert.throws(() => new Poll(() => 1, -10), RangeError)
  // @ts-ignore
  assert.throws(() => new Poll(() => 1, NaN), RangeError)
  // @ts-ignore
  assert.throws(() => new Poll(() => 1, '100'), RangeError)
  // @ts-ignore
  assert.throws(() => new Poll(() => 1, 100, -1), RangeError)
  // @ts-ignore
  assert.throws(() => new Poll(() => 1, 100, NaN), RangeError)
})

test('poll: fn is invoked as detached callback (not bound to Poll)', async () => {
  let capturedThis = null
  /** @this {any} */
  function regularFunction () {
    capturedThis = this // eslint-disable-line
    return 42
  }
  const poll = new Poll(regularFunction, 50)
  for await (const val of poll) {
    assert.equal(val, 42)
    poll.done()
  }
  assert.notEqual(capturedThis, poll, 'fn is not bound to Poll instance')
  assert.equal(capturedThis, undefined, 'in strict ESM detached callback this is undefined')
})

test('poll: single-use - subsequent iteration returns done immediately', async () => {
  let count = 0
  const poll = new Poll(() => ++count, 50)
  for await (const val of poll) {
    if (val === 2) {
      poll.done()
    }
  }
  assert.equal(poll.isDone, true)

  // Iterating again should produce zero items
  const secondOutput = []
  for await (const val of poll) {
    secondOutput.push(val)
  }
  assert.deepEqual(secondOutput, [], 'subsequent iteration yields nothing')
})

test('poll: calling done while sleeping between ticks aborts sleep immediately', async () => {
  const poll = new Poll(() => 'data', 5000)
  const it = poll[Symbol.asyncIterator]()
  const first = await it.next()
  assert.equal(first.value, 'data')

  const start = performance.now()
  const nextPromise = it.next()

  // Poller is now sleeping for 5000ms. Abort after 50ms.
  setTimeout(() => poll.done(), 50)

  const second = await nextPromise
  const elapsed = performance.now() - start
  assert.equal(second.done, true, 'iterator completed')
  assert.ok(elapsed < 500, `aborted promptly: took ${elapsed}ms instead of 5000ms`)
})

test('poll: calling done during initialWait aborts sleep immediately', async () => {
  const poll = new Poll(() => 'data', 100, 5000)
  const it = poll[Symbol.asyncIterator]()

  const start = performance.now()
  const nextPromise = it.next()

  setTimeout(() => poll.done(), 50)

  const result = await nextPromise
  const elapsed = performance.now() - start
  assert.equal(result.done, true, 'aborted initialWait')
  assert.ok(elapsed < 500, `aborted initialWait promptly: took ${elapsed}ms instead of 5000ms`)
})

test('poll: calling done during consumer iteration exits without starting next sleep', async () => {
  const poll = new Poll(() => 1, 5000)
  const start = performance.now()
  for await (const val of poll) {
    assert.equal(val, 1)
    poll.done()
  }
  const elapsed = performance.now() - start
  assert.ok(elapsed < 500, `loop exited immediately without sleeping for 5000ms: took ${elapsed}ms`)
})

test('poll: in-flight async fn completes and yields before done stops polling', async () => {
  let callCount = 0
  const poll = new Poll(async () => {
    callCount++
    await new Promise(r => setTimeout(r, 100))
    return 'settled'
  }, 1000)

  const it = poll[Symbol.asyncIterator]()
  const nextPromise = it.next()

  // Call done while fn is in-flight
  setTimeout(() => poll.done(), 30)

  const first = await nextPromise
  assert.equal(first.value, 'settled', 'in-flight fn result yielded')
  assert.equal(first.done, false)

  const second = await it.next()
  assert.equal(second.done, true, 'polling stops after in-flight fn completes')
  assert.equal(callCount, 1, 'fn was only called once')
})

