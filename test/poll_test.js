import { chainable as sync, generators } from 'iterablefu'
import { test } from 'zora'
import { chainable, iteratorFrom, Poll } from '../src/await-for-it'

const allowableJitter = 15
const waitTimeGood = (n, reference) => (n > reference - allowableJitter) && (n < reference + allowableJitter)

test('poll: function results are output in order', async assert => {
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

test('poll: slow iteration controls polling period', async assert => {
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
  assert.equals(output.length, durationCount, 'iteration period controls polling rate')
})

test('poll: poller controls polling period with fast iteration', async assert => {
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

test('poll: slow async function controls polling period', async assert => {
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

test('poll: can wait before first call', async assert => {
  const waitTime = 100
  const startTime = Date.now()
  const poll = new Poll(async () => Date.now(), waitTime, waitTime)
  const output = await chainable(poll).take(2).toArray()
  poll.done()
  const timeToFirstCall = output[0] - startTime
  assert.ok(waitTimeGood(timeToFirstCall, waitTime), 'polling waited to start')
})

test('poll works with synchronous functions', async assert => {
  let count = 0
  const syncFunction = () => count++
  const waitTime = 100
  const poll = new Poll(syncFunction, waitTime)
  const output = await chainable(poll).take(5).toArray()
  assert.deepEqual(output, [0, 1, 2, 3, 4], 'poll called synchronous function correctly')
})

test('poll: exception thrown by function propagates to iterator', async assert => {
  const theError = new Error('poll exception')
  const fn = () => new Promise((resolve, reject) => setTimeout(() => reject(theError), 50))
  const poll = new Poll(fn, 50)
  await chainable(poll)
    .catch(error => assert.is(error, theError, 'caught the thrown exception'))
    .finally(() => poll.done())
    .toArray()
})

test('poll: calling done stops iteration', async assert => {
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

test('poll: iterator called faster than one-at-a-time', async assert => {
  const values = 50
  let count = 0
  const poller = new Poll(() => count++, 5)
  const iterator = iteratorFrom(poller)
  // Call next() more times than expected number of values in this tick - way before the first one will yield
  const iteratorPromises = sync.range(0, values + 10).map(() => iterator.next()).toArray()
  // Iterate the promises, waiting for each one to resolve.
  const iteratorResults = await chainable(iteratorPromises).toArray()
  const actual = sync(iteratorResults)
    .takeWhile(result => result.done !== true)
    .map(result => result.value) // now we have just arrays
    .take(values) // Poll doesn't end iterator until done is called
    .toArray()
  poller.done()
  assert.deepEqual(actual, sync.range(values).toArray(), 'all values yielded and provided in order')
})
