import { test } from 'zora'
import { chainable, Poll } from '../src/await-for-it'
import { generators } from 'iterablefu'

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
