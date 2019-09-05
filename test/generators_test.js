import tape from 'tape'
import { range } from 'iterablefu/src/generators.js'
import { chainable } from '../src/chainable.js'

const waitTimeGood = (n, reference) => (n > reference - 15) && (n < reference + 15)
const toLongAsync = (period, iterable) => chainable(iterable).throttle(period, 0)

tape('from', async test => {
  const output = await chainable.from([0, 1, 2, 3, 4]).toArray()
  test.deepEqual(output, [0, 1, 2, 3, 4], 'output matches input iterable')
  test.end()
})

tape('poll: function results are output in order', async test => {
  let count = 0
  const pollingPeriod = 50
  const pollCount = 5
  const output = await chainable
    .poll(async () => count++, pollingPeriod)
    .take(pollCount)
    .toArray()
  test.deepEqual(output, [...range(5)], 'function results are output in order')
  test.end()
})

tape('poll: slow iteration controls polling period', async test => {
  const iterationPeriod = 100
  const pollingPeriod = 50
  const durationCount = 5
  const output = await chainable
    .poll(() => Date.now(), pollingPeriod, 0)
    .throttle(iterationPeriod, 0)
    .diff((previous, current) => current - previous)
    .take(durationCount)
    .filter(duration => waitTimeGood(duration, iterationPeriod))
    .toArray()
  test.equals(output.length, durationCount, 'iteration period controls polling rate')
  test.end()
})

tape('poll: poller controls polling period with fast iteration', async test => {
  const pollingPeriod = 50
  const durationCount = 5
  const output = await chainable
    .poll(() => Date.now(), pollingPeriod, 0)
    .diff((previous, current) => current - previous)
    .take(durationCount)
    .filter(duration => waitTimeGood(duration, pollingPeriod))
    .toArray()
  test.equal(output.length, durationCount, 'slower polling rate controls faster iterators')
  test.end()
})

tape('poll: slow async function controls polling period', async test => {
  const pollingPeriod = 50
  const durationCount = 5
  const fn = () => new Promise(resolve => setTimeout(() => resolve(Date.now()), 2 * pollingPeriod))
  const output = await chainable
    .poll(fn, pollingPeriod, 0)
    .diff((previous, current) => current - previous)
    .take(durationCount)
    .filter(duration => waitTimeGood(duration, 2 * pollingPeriod))
    .toArray()
  test.equal(output.length, durationCount, 'slow async function controls polling rate')
  test.end()
})

tape('poll: can wait before first call', async test => {
  const waitTime = 100
  const startTime = Date.now()
  const output = await chainable.poll(async () => Date.now(), waitTime, waitTime).take(2).toArray()
  const timeToFirstCall = output[0] - startTime
  test.true(waitTimeGood(timeToFirstCall, waitTime), 'polling waited to start')
  test.end()
})

tape('poll works with synchronous functions', async test => {
  let count = 0
  const syncFunction = () => count++
  const waitTime = 100
  const output = await chainable.poll(syncFunction, waitTime).take(5).toArray()
  test.deepEqual(output, [0, 1, 2, 3, 4], 'poll called synchronous function correctly')
  test.end()
})

tape('poll: exception thrown by function propagates to iterator', async test => {
  const theError = new Error('poll exception')
  const fn = () => new Promise((resolve, reject) => setTimeout(() => reject(theError), 50))
  try {
    await chainable.poll(fn, 50).toArray()
  } catch (error) {
    test.is(error, theError, 'caught the thrown exception')
    test.end()
  }
})

const mergeTest = async (iterators, asyncIterables, test) => {
  const interleaved = await chainable.merge(...asyncIterables).toArray()
  // separate elements of interleaved back out into two arrays by letter case
  const actual = [interleaved.filter(s => s === s.toUpperCase()), interleaved.filter(s => s !== s.toUpperCase())]
  test.deepEqual(actual, iterators, 'both iterators were exhausted in order')
  const interleavedSlice = interleaved.slice(0, iterators[0].length)
  const separated = [interleavedSlice.filter(s => s === s.toUpperCase()), interleavedSlice.filter(s => s !== s.toUpperCase())]
  // test that first part of interleaved is neither all upperCase or all lowerCase
  const isInterleaved = separated.filter(a => a.length > 0).length === separated.length
  test.true(isInterleaved, 'elements are interleaved, so not simply concatenating sequences')
}

tape('merge: fast iterables', async test => {
  const iterators = [['A', 'B', 'C', 'D'], ['h', 'i', 'j', 'k', 'l']]
  const asyncIterables = [chainable(iterators[0]), chainable(iterators[1])]
  await mergeTest(iterators, asyncIterables, test)
  test.end()
})

tape('merge: slow iterables', async test => {
  const iterators = [['A', 'B', 'C', 'D'], ['h', 'i', 'j', 'k', 'l']]
  const asyncIterables = [toLongAsync(50, iterators[0]), toLongAsync(80, iterators[1])]
  await mergeTest(iterators, asyncIterables, test)
  test.end()
})

tape('merge: async and sync iterables', async test => {
  const iterators = [['A', 'B', 'C', 'D'], ['h', 'i', 'j', 'k', 'l']]
  // if it was throttle(50, false), the first value, 'h', would be delayed
  // and all of iterator[0] would come out first - mergeTest would then fail.
  const asyncIterables = [iterators[0], chainable(iterators[1]).throttle(50, 0)]
  await mergeTest(iterators, asyncIterables, test)
  test.end()
})

class TestError extends Error {}

tape('merge: iterable exception is propagated to iterator', async test => {
  const theError = new TestError('test error')
  const throwingAsyncIterable = async function * () {
    yield 5
    yield 6
    throw theError
  }
  const iterables = [[0, 1, 2, 3, 4], throwingAsyncIterable()]
  try {
    await chainable.merge(...iterables).toArray()
  } catch (error) {
    test.is(error, theError, 'exception thrown from iterable caught directly')
    test.end()
  }
})

tape('merge: promise rejection is propagated to iterator', async test => {
  const theError = new TestError('test error')
  const throwingAsyncIterable = async function * () {
    yield 5
    yield 6
    yield new Promise((resolve, reject) => setTimeout(() => reject(theError), 100))
  }
  const iterables = [[0, 1, 2, 3, 4], throwingAsyncIterable()]
  try {
    await chainable.merge(...iterables).toArray()
  } catch (error) {
    test.is(error, theError, 'merge throws exact error caught')
    test.end()
  }
})
