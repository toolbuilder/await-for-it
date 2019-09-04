import tape from 'tape'
import { chainable } from '../src/chainable.js'

const toLongAsync = (period, iterable) => chainable(iterable).throttle(period, true)

tape('from', async test => {
  const output = await chainable.from([0, 1, 2, 3, 4]).toArray()
  test.deepEqual(output, [0, 1, 2, 3, 4], 'output matches input iterable')
  test.end()
})

tape('poll: slow iterator, fast asyncFunction', async test => {
  let count = 0
  const output = await chainable.poll(async () => count++, 50).throttle(100, true).take(5).toArray()
  test.deepEqual(output, [0, 1, 2, 3, 4], 'output of each function call returned in order')
  test.deepEqual(count, 5, 'slow iterator controlled pace of polling')
  test.end()
})

tape('poll: fast iterator, fast asyncFunction', async test => {
  let count = 0
  const output = await chainable.poll(async () => count++, 50).take(5).toArray()
  test.deepEqual(output, [0, 1, 2, 3, 4], 'output of each function call returned in order')
  test.deepEqual(count, 5, 'waitBetweenCalls controlled pace of polling')
  test.end()
})

tape('poll: waits between calls', async test => {
  const waitTime = 100
  const lowerBound = waitTime - 20
  const upperBound = waitTime + 20
  const startTime = Date.now()
  const output = await chainable.poll(async () => Date.now(), waitTime).take(5).toArray()
  const timeDiffs = []
  let previousTime = output[0]
  for (const time of output.slice(1)) {
    timeDiffs.push(time - previousTime)
    previousTime = time
  }
  const inBoundsTimeDiffs = timeDiffs.filter(diff => diff > lowerBound && diff < upperBound)
  test.true(output[0] - startTime < lowerBound, 'polling started immediately')
  test.deepEqual(inBoundsTimeDiffs.length, 4, 'all function calls were spaced correctly')
  test.end()
})

tape('poll: can wait before first call', async test => {
  const waitTime = 100
  const lowerBound = waitTime - 20
  const upperBound = waitTime + 20
  const startTime = Date.now()
  const output = await chainable.poll(async () => Date.now(), waitTime, false).take(2).toArray()
  const timeToFirstCall = output[0] - startTime
  test.true(timeToFirstCall > lowerBound && timeToFirstCall < upperBound, 'polling waited to start')
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

const mergeTest = async (iterators, asyncIterables, test) => {
  const interleaved = await chainable.merge(...asyncIterables).toArray()
  // separate elements of interleaved back out into two arrays by letter case
  const actual = [interleaved.filter(s => s === s.toUpperCase()), interleaved.filter(s => s !== s.toUpperCase())]
  test.deepEqual(actual, iterators, 'both iterators were exhausted in order')
  const interleavedSlice = interleaved.slice(0, iterators[0].length)
  const separated = [interleavedSlice.filter(s => s === s.toUpperCase()), interleavedSlice.filter(s => s !== s.toUpperCase())]
  // test that first part of interleaved is neither all upperCase or all lowerCase
  const isInterleaved = separated[0].length < interleavedSlice.length && separated[1].length < interleavedSlice.length
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
  const asyncIterables = [iterators[0], chainable(iterators[1]).throttle(50, true)]
  await mergeTest(iterators, asyncIterables, test)
  test.end()
})
