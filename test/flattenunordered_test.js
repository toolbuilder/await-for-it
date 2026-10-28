import test from 'node:test'
import assert from 'node:assert/strict'
import { chainable as sync } from 'iterablefu'
import { chainable, transforms } from '../src/await-for-it.js'
import { randomlySlowIterator, runTest } from './toofast.js'

test('empty iterable', async () => {
  const actual = []
  for await (const value of transforms.flattenUnordered(10, [])) { // eslint-disable-line
    actual.push(value)
    assert.fail('Should not iterate empty iterable')
  }
  assert.deepEqual(actual, [], 'empty iterable is not iterated')
})

test('strings are not flattened even though iterable', async () => {
  const input = ['alpha', 'beta', 'gamma']
  const actual = await chainable(input).flattenUnordered(10).toArray()
  assert.deepEqual(actual, input, 'strings are not flattened')
})

test('TypedArrays and Maps are not flattened even though iterable', async () => {
  const bytes = new Uint8Array([1, 2, 3])
  const map = new Map([['a', 1]])
  const input = [bytes, map]
  const actual = await chainable(input).flattenUnordered(10).toArray()
  assert.deepEqual(actual, [bytes, map], 'TypedArray and Map are not flattened')
})

test('flattenUnordered respects Symbol.isConcatSpreadable', async () => {
  const nonSpreadable = [1, 2]
  nonSpreadable[Symbol.isConcatSpreadable] = false

  const spreadableBytes = new Uint8Array([3, 4])
  // @ts-ignore
  spreadableBytes[Symbol.isConcatSpreadable] = true

  const input = [nonSpreadable, spreadableBytes]
  const actual = await chainable(input).flattenUnordered(10).toArray()
  assert.equal(actual.includes(nonSpreadable), true, 'opt-out preserved array')
  assert.equal(actual.includes(3), true, 'opt-in flattened byte 3')
  assert.equal(actual.includes(4), true, 'opt-in flattened byte 4')
  assert.equal(actual.length, 3, 'yielded 3 items')
})

test('non-iterables are passed as-is', async () => {
  const input = [1, 2, {}]
  const actual = await chainable(input).flattenUnordered(10).toArray()
  assert.deepEqual(actual, input, 'non-iterables passed as-is')
})

test('sync iterables are flattened', async () => {
  const input = [[1, 2, 3], [4, 5], 6, [7, 8]]
  const actual = await chainable(input).flattenUnordered(10).toArray()
  assert.deepEqual(actual.sort(), [1, 2, 3, 4, 5, 6, 7, 8], 'sync iterables were flattened')
})

test('async iterables are flattened and merged', async () => {
  const input = [
    chainable([1, 2, 3]).throttle(50, 100), // slow it down so guaranteed out of order
    chainable([4, 5]),
    6, // should pass right through
    chainable([7, 8]).throttle(25, 0) // slow this one less
  ]
  const actual = await chainable(input).flattenUnordered(5).toArray()
  const expected = [1, 2, 3, 4, 5, 6, 7, 8]
  assert.notDeepEqual(actual, expected, 'iteration was out of order')
  assert.deepEqual(actual.sort(), expected, 'async iterables were completely iterated')
})

test('flattening is not recursive', async () => {
  const input = [[1, 2, [3, 4]], [5], 6, [7, 8]]
  const actual = await chainable(input).flattenUnordered(10).toArray()
  assert.deepEqual(actual.sort(), [1, 2, [3, 4], 5, 6, 7, 8], 'sync iterables were flattened')
})

class TestError extends Error {}

test('flattenUnordered: passes iterable exceptions to iterator', async () => {
  const theError = new TestError('REJECT')
  const throwingIterable = async function * () {
    yield 1
    yield new Promise(resolve => setTimeout(() => resolve(2), 100))
    throw theError
  }
  let caughtException = false
  await chainable(throwingIterable())
    .flattenUnordered(10)
    .catch(error => {
      assert.equal(error, theError, 'flattenUnordered rethrows the error from throwingIterable')
      caughtException = true
    })
    .runAwait()
  assert.ok(caughtException, 'flattenUnordered threw exception')
})

test('flattenUnordered: rejected promises from iterable are passed to iterator', async () => {
  const theError = new TestError('REJECT')
  const throwingIterable = async function * () {
    yield 1
    yield new Promise((resolve, reject) => setTimeout(() => reject(theError), 150))
    yield 2
  }
  let caughtException = false
  await chainable(throwingIterable())
    .flattenUnordered(10)
    .catch(error => {
      assert.equal(error, theError, 'flattenUnordered rethrows the error from rejected promise')
      caughtException = true
    })
    .toArray()
  assert.ok(caughtException, 'flattenUnordered threw exception')
})

test('flattenUnordered: nested iterable exception is propagated to iterator', async () => {
  const theError = new TestError('CHILD_ERROR')
  const throwingChild = async function * () {
    yield 10
    yield 20
    throw theError
  }
  const input = [[1, 2], throwingChild(), [3, 4]]
  let caughtException = false
  await chainable(input)
    .flattenUnordered(5)
    .catch(error => {
      assert.equal(error, theError, 'flattenUnordered rethrows the error from nested iterable')
      caughtException = true
    })
    .runAwait()
  assert.ok(caughtException, 'flattenUnordered caught child exception')
})

test('flattenUnordered: rejected promises from nested iterable are passed to iterator', async () => {
  const theError = new TestError('CHILD_REJECT')
  const throwingChild = async function * () {
    yield 10
    yield new Promise((resolve, reject) => setTimeout(() => reject(theError), 100))
    yield 20
  }
  const input = [[1, 2], throwingChild(), [3, 4]]
  let caughtException = false
  await chainable(input)
    .flattenUnordered(5)
    .catch(error => {
      assert.equal(error, theError, 'flattenUnordered rethrows the error from nested rejected promise')
      caughtException = true
    })
    .toArray()
  assert.ok(caughtException, 'flattenUnordered caught child rejected promise')
})

test('flattenUnordered: respects maxPoolSize concurrency limit', async () => {
  let activeCount = 0
  let maxObservedActive = 0
  const maxPoolSize = 3

  const makeChild = (id) => async function * () {
    activeCount++
    maxObservedActive = Math.max(maxObservedActive, activeCount)
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 20))
      yield `${id}-${i}`
    }
    activeCount--
  }

  const input = Array.from({ length: 9 }, (_, i) => makeChild(i)())
  const actual = await chainable(input).flattenUnordered(maxPoolSize).toArray()
  assert.equal(actual.length, 27, 'all items were yielded')
  assert.ok(maxObservedActive <= maxPoolSize, `active iterables (${maxObservedActive}) did not exceed maxPoolSize (${maxPoolSize})`)
})

test('flattenUnordered: maxPoolSize = 1 flattens sequentially', async () => {
  let activeCount = 0
  let maxObservedActive = 0

  const makeChild = (id) => async function * () {
    activeCount++
    maxObservedActive = Math.max(maxObservedActive, activeCount)
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 10))
      yield id * 10 + i
    }
    activeCount--
  }

  const input = Array.from({ length: 4 }, (_, i) => makeChild(i)())
  const actual = await chainable(input).flattenUnordered(1).toArray()
  assert.equal(actual.length, 12, 'all items yielded')
  assert.equal(maxObservedActive, 1, 'never flattened more than 1 iterable at a time')
  assert.deepEqual(actual, [0, 1, 2, 10, 11, 12, 20, 21, 22, 30, 31, 32], 'with pool size 1, iterables are flattened in sequence')
})

test('flattenUnordered: handles empty child iterables mixed with non-empty', async () => {
  const input = [[], [1, 2], [], [3], [], [4, 5], []]
  const actual = await chainable(input).flattenUnordered(3).toArray()
  assert.deepEqual(actual.sort(), [1, 2, 3, 4, 5], 'empty child iterables are skipped without issue')
})

test('flattenUnordered: throws RangeError for invalid maxPoolSize and TypeError for invalid inputIterable', () => {
  const invalidSizes = [0, -1, 1.5, NaN, undefined, null, '3']

  for (const maxPoolSize of invalidSizes) {
    // @ts-ignore
    assert.throws(() => transforms.flattenUnordered(maxPoolSize, [[1, 2]]), RangeError)
    // @ts-ignore
    assert.throws(() => chainable([[1, 2]]).flattenUnordered(maxPoolSize), RangeError)
  }

  // @ts-ignore
  assert.throws(() => transforms.flattenUnordered(2, null), TypeError)
  // @ts-ignore
  assert.throws(() => transforms.flattenUnordered(2, 123), TypeError)
})

test('flattenUnordered: iterator called faster than one-at-a-time', async () => {
  const values = 50
  const expected = sync.range(values).toArray()
  // Group into chunks of 5 so inputIterable actually provides child iterables to flatten
  const nestedData = sync(expected).chunk(5).toArray()
  const slowIterable = randomlySlowIterator(5, 5, nestedData)
  const iterable = transforms.flattenUnordered(3, slowIterable)
  const actual = await runTest(iterable, values)
  assert.deepEqual(actual.sort((a, b) => a - b), expected, 'all values yielded from flattened iterables')
})

test('flattenUnordered: closes active child iterators and input iterator on early break', async () => {
  let child1Cleaned = false
  let child2Cleaned = false
  let inputCleaned = false

  const child1 = async function * () {
    try {
      await new Promise(resolve => setTimeout(resolve, 20))
      yield 1
      yield 2
    } finally {
      child1Cleaned = true
    }
  }

  const child2 = async function * () {
    try {
      await new Promise(resolve => setTimeout(resolve, 20))
      yield 10
      yield 20
    } finally {
      child2Cleaned = true
    }
  }

  const input = async function * () {
    try {
      yield child1()
      yield child2()
    } finally {
      inputCleaned = true
    }
  }

  const values = []
  for await (const val of chainable(input()).flattenUnordered(5)) {
    values.push(val)
    break // early termination
  }

  assert.equal(values.length, 1, 'yielded first item before break')
  assert.ok(child1Cleaned, 'child1 had return() called via finally')
  assert.ok(child2Cleaned, 'child2 had return() called via finally')
  assert.ok(inputCleaned, 'input iterable had return() called via finally')
})

test('flattenUnordered: closes remaining active child iterators when one child throws', async () => {
  let child2Cleaned = false
  const theError = new TestError('BOOM')

  const child1 = async function * () {
    yield 1
    throw theError
  }

  const child2 = async function * () {
    try {
      yield 10
      yield 20
    } finally {
      child2Cleaned = true
    }
  }

  let caught = false
  await chainable([child1(), child2()])
    .flattenUnordered(5)
    .catch(err => {
      caught = true
      assert.equal(err, theError)
    })
    .runAwait()

  assert.ok(caught, 'caught thrown child error')
  assert.ok(child2Cleaned, 'remaining active child was cleaned up after peer threw error')
})

test('flattenUnordered: caller .return(value) cleans up and preserves return value', async () => {
  let childCleaned = false

  const child = async function * () {
    try {
      yield 1
      yield 2
    } finally {
      childCleaned = true
    }
  }

  const gen = transforms.flattenUnordered(5, [child()])
  const first = await gen.next()
  assert.equal(first.value, 1)
  assert.equal(first.done, false)

  const ret = await gen.return()
  assert.equal(ret.value, undefined)
  assert.equal(ret.done, true)
  assert.ok(childCleaned, 'child was cleaned up on manual .return() call')
})
