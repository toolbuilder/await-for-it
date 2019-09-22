import { test as tape } from 'zora'
import { chainable } from '../src/chainable.js'
import { range } from 'iterablefu/src/generators.js'
import { Poll } from '../src/poll.js'

const allowableJitter = 40
const waitTimeGood = (n, reference) => (n > reference - allowableJitter) && (n < reference + allowableJitter)

tape('poll: function results are output in order', async test => {
  let count = 0
  const pollingPeriod = 50
  const pollCount = 5
  const poll = new Poll(async () => count++, pollingPeriod)
  const output = await chainable(poll)
    .take(pollCount)
    .toArray()
  poll.done()
  test.deepEqual(output, [...range(5)], 'function results are output in order')
})

tape('poll: slow iteration controls polling period', async test => {
  const iterationPeriod = 100
  const pollingPeriod = 50
  const durationCount = 5
  const poll = new Poll(() => Date.now(), pollingPeriod, 0)
  const output = await chainable(poll)
    .throttle(iterationPeriod, 0)
    .diff((previous, current) => current - previous)
    .take(durationCount)
    .filter(duration => waitTimeGood(duration, iterationPeriod))
    .toArray()
  poll.done()
  test.equals(output.length, durationCount, 'iteration period controls polling rate')
})

tape('poll: poller controls polling period with fast iteration', async test => {
  const pollingPeriod = 50
  const durationCount = 5
  const poll = new Poll(() => Date.now(), pollingPeriod, 0)
  const output = await chainable(poll)
    .diff((previous, current) => current - previous)
    .take(durationCount)
    .filter(duration => waitTimeGood(duration, pollingPeriod))
    .toArray()
  poll.done()
  test.equal(output.length, durationCount, 'slower polling rate controls faster iterators')
})

tape('poll: slow async function controls polling period', async test => {
  const pollingPeriod = 50
  const durationCount = 5
  const fn = () => new Promise(resolve => setTimeout(() => resolve(Date.now()), 2 * pollingPeriod))
  const poll = new Poll(fn, pollingPeriod, 0)
  const output = await chainable(poll)
    .diff((previous, current) => current - previous)
    .take(durationCount)
    .filter(duration => waitTimeGood(duration, 2 * pollingPeriod))
    .toArray()
  poll.done()
  test.equal(output.length, durationCount, 'slow async function controls polling rate')
})

tape('poll: can wait before first call', async test => {
  const waitTime = 100
  const startTime = Date.now()
  const poll = new Poll(async () => Date.now(), waitTime, waitTime)
  const output = await chainable(poll).take(2).toArray()
  poll.done()
  const timeToFirstCall = output[0] - startTime
  test.ok(waitTimeGood(timeToFirstCall, waitTime), 'polling waited to start')
})

tape('poll works with synchronous functions', async test => {
  let count = 0
  const syncFunction = () => count++
  const waitTime = 100
  const poll = new Poll(syncFunction, waitTime)
  const output = await chainable(poll).take(5).toArray()
  test.deepEqual(output, [0, 1, 2, 3, 4], 'poll called synchronous function correctly')
})

tape('poll: exception thrown by function propagates to iterator', async test => {
  const theError = new Error('poll exception')
  const fn = () => new Promise((resolve, reject) => setTimeout(() => reject(theError), 50))
  const poll = new Poll(fn, 50)
  await chainable(poll)
    .catch(error => test.is(error, theError, 'caught the thrown exception'))
    .finally(() => poll.done())
    .toArray()
})

tape('poll: calling done stops iteration', async test => {
  let count = 0
  let finallyCalled = false
  const pollingPeriod = 50
  const pollCount = 5
  const poll = new Poll(async () => count++, pollingPeriod)
  await chainable(poll)
    .callAwait((x) => { if (x === pollCount) poll.done() })
    .finally(() => { finallyCalled = true })
    .runAwait()
  test.equal(finallyCalled, true, 'poll.done completed iteration')
  poll.done()
})
