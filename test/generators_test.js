import tape from 'tape'
import { race, toAsync, mapSyncToAsync } from '../src/generators.js'
import { toArray } from '../src/reducers.js'

const toLongAsync = async function * (period, iterable) {
  for (const value of iterable) {
    yield new Promise(resolve => setTimeout(() => resolve(value), period))
  }
}

tape('mapSyncToAsync', async test => {
  const asyncFunction = value => new Promise(resolve => setTimeout(() => resolve(value), 0))
  const actual = await toArray(mapSyncToAsync(asyncFunction, [0, 1, 2, 3, 4, 5]))
  test.deepEqual(actual, [0, 1, 2, 3, 4, 5], 'mapped sync iterable to async iterable via async function')
  test.end()
})

// Queue
// Push multiple times in same tick
// Push in other ticks

tape('race', async subtest => {
  const iterators = [['A', 'B', 'C', 'D'], ['h', 'i', 'j', 'k', 'l']]
  const asyncIterators = [toLongAsync(50, iterators[0]), toLongAsync(80, iterators[1])]
  const interleaved = await toArray(race(...asyncIterators))
  // separate elements of interleaved back out into two arrays by letter case
  const actual = [interleaved.filter(s => s === s.toUpperCase()), interleaved.filter(s => s !== s.toUpperCase())]
  subtest.deepEqual(actual, iterators, 'both iterators were exhausted in order')
  const isInterleaved = interleaved.findIndex(x => x === 'A') < 3 && interleaved.findIndex(x => x === 'h') < 3
  subtest.true(isInterleaved, 'elements are interleaved, so not simply concatenating sequences')

  const output = await toArray(race(toAsync([]), toAsync(['A', 'B', 'C'])))
  subtest.deepEqual(output, ['A', 'B', 'C'], 'done iterator is handled correctly')

  subtest.end()
})
