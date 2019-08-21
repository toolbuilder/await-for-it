import tape from 'tape'
import { merge, poll, toAsync } from '../src/generators.js'
import { take, throttle } from '../src/transforms.js'
import { toArray } from '../src/reducers.js'
import { chainable } from 'iterablefu/src/chainable.js'

const toLongAsync = (period, iterable) => throttle(period, true, toAsync(iterable))

tape('poll: slow iterator, fast asyncFunction', async test => {
  let count = 0
  const output = await toArray(take(5, throttle(100, true, poll(async () => count++, 50))))
  test.deepEqual(output, [0, 1, 2, 3, 4], 'output of each function call returned in order')
  test.deepEqual(count, 5, 'slow iterator controlled pace of polling')
  test.end()
})

tape('poll: fast iterator, fast asyncFunction', async test => {
  let count = 0
  const output = await toArray(take(5, poll(async () => count++, 50)))
  test.deepEqual(output, [0, 1, 2, 3, 4], 'output of each function call returned in order')
  test.deepEqual(count, 5, 'waitBetweenCalls controlled pace of polling')
  test.end()
})

tape('poll: waits between calls', async test => {
  const waitTime = 100
  const lowerBound = waitTime - 20
  const upperBound = waitTime + 20
  const startTime = Date.now()
  const output = await toArray(take(5, poll(async () => Date.now(), waitTime)))
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
  const output = await toArray(take(2, poll(async () => Date.now(), waitTime, false)))
  const timeToFirstCall = output[0] - startTime
  test.true(timeToFirstCall > lowerBound && timeToFirstCall < upperBound, 'polling waited to start')
  test.end()
})

const mergeTest = async (iterators, asyncIterables, test) => {
  const interleaved = await toArray(merge(...asyncIterables))
  // separate elements of interleaved back out into two arrays by letter case
  const actual = [interleaved.filter(s => s === s.toUpperCase()), interleaved.filter(s => s !== s.toUpperCase())]
  test.deepEqual(actual, iterators, 'both iterators were exhausted in order')
  const iterator = iterators[0]
  const matching = chainable(interleaved).take(iterator.length).filter(x => iterator.find(y => y === x) === x).toArray()
  const isInterleaved = matching.length > 0 && matching.length < iterator.length
  test.true(isInterleaved, 'elements are interleaved, so not simply concatenating sequences')
}

tape('merge: fast iterables', async test => {
  const iterators = [['A', 'B', 'C', 'D'], ['h', 'i', 'j', 'k', 'l']]
  const asyncIterables = [toAsync(iterators[0]), toAsync(iterators[1])]
  await mergeTest(iterators, asyncIterables, test)
  test.end()
})

tape('merge: slow iterables', async test => {
  const iterators = [['A', 'B', 'C', 'D'], ['h', 'i', 'j', 'k', 'l']]
  const asyncIterators = [toLongAsync(50, iterators[0]), toLongAsync(80, iterators[1])]
  await mergeTest(iterators, asyncIterators, test)
  test.end()
})

tape('merge: async and sync iterables', async test => {
  const iterators = [['A', 'B', 'C', 'D'], ['h', 'i', 'j', 'k', 'l']]
  const asyncIterables = [iterators[0], toAsync(iterators[1])]
  await mergeTest(iterators, asyncIterables, test)
  test.end()
})

tape('toAsync', async test => {
  const output = await toArray(toAsync([0, 1, 2, 3, 4]))
  test.deepEqual(output, [0, 1, 2, 3, 4], 'toAsync mapped sync iterable to async')
  test.end()
})
