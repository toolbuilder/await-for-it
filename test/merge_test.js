import test from 'node:test'
import assert from 'node:assert/strict'
import { chainable as sync } from 'iterablefu'
import { chainable, generators } from '../src/await-for-it.js'
import { runTest } from './toofast.js'

const toLongAsync = (period, iterable) => chainable(iterable).throttle(period, 0)

const splitByCase = interleaved => {
  return [
    interleaved.filter(s => s === s.toUpperCase()),
    interleaved.filter(s => s !== s.toUpperCase())
  ]
}

const mergeTest = async (iterators, asyncIterables) => {
  const interleaved = await chainable.merge(...asyncIterables).toArray()
  // separate elements of interleaved back out into two arrays by letter case
  const actual = splitByCase(interleaved)
  assert.deepEqual(actual, iterators, 'both iterators were exhausted in order')

  // test that first part of interleaved is truly interleaved
  const interleavedSlice = interleaved.slice(0, iterators[0].length)
  const separated = splitByCase(interleavedSlice)
  const isInterleaved = separated.filter(byCase => byCase.length > 0).length === separated.length
  assert.ok(isInterleaved, 'elements are interleaved, so not simply concatenating sequences')
}

test('merge: fast iterables', async () => {
  const iterators = [['A', 'B', 'C', 'D'], ['h', 'i', 'j', 'k', 'l']]
  const asyncIterables = [chainable(iterators[0]), chainable(iterators[1])]
  await mergeTest(iterators, asyncIterables)
})

test('merge: slow iterables', async () => {
  const iterators = [['A', 'B', 'C', 'D'], ['h', 'i', 'j', 'k', 'l']]
  const asyncIterables = [toLongAsync(50, iterators[0]), toLongAsync(80, iterators[1])]
  await mergeTest(iterators, asyncIterables)
})

test('merge: async and sync iterables', async () => {
  const iterators = [['A', 'B', 'C', 'D'], ['h', 'i', 'j', 'k', 'l']]
  // if it was throttle(50, false), the first value, 'h', would be delayed
  // and all of iterator[0] would come out first - mergeTest would then fail.
  const asyncIterables = [iterators[0], chainable(iterators[1]).throttle(50, 0)]
  await mergeTest(iterators, asyncIterables)
})

class TestError extends Error {}

test('merge: iterable exception is propagated to iterator', async () => {
  const theError = new TestError('test error')
  const throwingAsyncIterable = async function * () {
    yield 5
    yield 6
    throw theError
  }
  const iterables = [[0, 1, 2, 3, 4], throwingAsyncIterable()]
  let finallyCalled = false
  await chainable
    .merge(...iterables)
    .catch(error => assert.equal(error, theError, 'exception thrown from iterable caught directly'))
    .finally(() => { finallyCalled = true })
    .runAwait()
  assert.ok(finallyCalled, 'iteration complete')
})

test('merge: promise rejection is propagated to iterator', async () => {
  const theError = new TestError('test error')
  const throwingAsyncIterable = async function * () {
    yield 5
    yield 6
    yield new Promise((resolve, reject) => setTimeout(() => reject(theError), 100))
  }
  const iterables = [[0, 1, 2, 3, 4], throwingAsyncIterable()]
  await chainable
    .merge(...iterables)
    .catch(error => assert.equal(error, theError, 'merge throws exact error caught'))
    .runAwait()
})

test('merge: iterator called faster than one-at-a-time', async () => {
  const values = 50
  const isEvenNumber = x => x % 2 === 0
  const evensAndOdds = [sync.range(0, 0.5 * values, 2).toArray(), sync.range(1, 0.5 * values, 2).toArray()]
  const iterator = generators.merge(...evensAndOdds)
  const actual = await runTest(iterator, values)
  const splitBackApart = [sync(actual).filter(isEvenNumber).toArray(), sync(actual).reject(isEvenNumber).toArray()]
  assert.deepEqual(splitBackApart, evensAndOdds, 'all values yielded and provided in order')
})

test('merge: closes active iterators on early break', async () => {
  let child1Cleaned = false
  let child2Cleaned = false

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

  const values = []
  for await (const val of generators.merge(child1(), child2())) {
    values.push(val)
    break
  }

  assert.equal(values.length, 1, 'yielded first item before break')
  assert.ok(child1Cleaned, 'child1 had return() called via finally')
  assert.ok(child2Cleaned, 'child2 had return() called via finally')
})

test('merge: closes remaining active iterators when one iterable throws', async () => {
  let child2Cleaned = false
  const theError = new TestError('BOOM')

  const child1 = async function * () {
    yield 1
    throw theError
  }

  const child2 = async function * () {
    try {
      yield 10
      await new Promise(resolve => setTimeout(resolve, 30))
      yield 20
    } finally {
      child2Cleaned = true
    }
  }

  let caught = false
  await chainable
    .merge(child1(), child2())
    .catch(err => {
      caught = true
      assert.equal(err, theError)
    })
    .runAwait()

  assert.ok(caught, 'caught thrown child error')
  assert.ok(child2Cleaned, 'remaining active child was cleaned up after peer threw error')
})

test('merge: caller .return(value) cleans up active iterators and preserves return value', async () => {
  let childCleaned = false

  const child = async function * () {
    try {
      yield 1
      yield 2
    } finally {
      childCleaned = true
    }
  }

  const gen = generators.merge(child())
  const first = await gen.next()
  assert.equal(first.value, 1)
  assert.equal(first.done, false)

  const ret = await gen.return()
  assert.equal(ret.value, undefined)
  assert.equal(ret.done, true)
  assert.ok(childCleaned, 'child was cleaned up on manual .return() call')
})

test('merge: caller .throw(error) cleans up active iterators and propagates error', async () => {
  let childCleaned = false
  const theError = new TestError('DOWNSTREAM_THROW')

  const child = async function * () {
    try {
      yield 1
      yield 2
    } finally {
      childCleaned = true
    }
  }

  const gen = generators.merge(child())
  const first = await gen.next()
  assert.equal(first.value, 1)

  await assert.rejects(async () => gen.throw(theError), theError)
  assert.ok(childCleaned, 'child was cleaned up on manual .throw() call')
})

test('merge: handles synchronous throw in iterator.next()', async () => {
  let cleanableCleaned = false
  const theError = new TestError('SYNC_NEXT_ERROR')

  const cleanable = async function * () {
    try {
      await new Promise(resolve => setTimeout(resolve, 20))
      yield 'cleanable'
    } finally {
      cleanableCleaned = true
    }
  }

  let count = 0
  const syncThrowIter = {
    [Symbol.iterator] () {
      return {
        next () {
          if (count++ === 0) return { value: 'first', done: false }
          throw theError
        }
      }
    }
  }

  const gen = generators.merge(syncThrowIter, cleanable())
  const r1 = await gen.next()
  assert.equal(r1.value, 'first')

  await assert.rejects(async () => gen.next(), theError)
  assert.ok(cleanableCleaned, 'peer was cleaned up when synchronous throw occurred')
})

test('merge: late rejection after break or error does not cause unhandledRejection', async () => {
  let unhandled = false
  const onUnhandled = () => { unhandled = true }
  process.on('unhandledRejection', onUnhandled)

  try {
    const theError = new TestError('BACKGROUND_REJECT')
    const failingChild = async function * () {
      await new Promise(resolve => setTimeout(resolve, 50))
      throw theError
    }

    const fastChild = async function * () {
      yield 'fast'
    }

    for await (const val of generators.merge(fastChild(), failingChild())) {
      assert.equal(val, 'fast')
      break
    }

    // Wait for the background rejection to fire while iteration is finished
    await new Promise(resolve => setTimeout(resolve, 80))
    assert.equal(unhandled, false, 'no unhandledRejection when abandoned in-flight promise rejected')
  } finally {
    process.off('unhandledRejection', onUnhandled)
  }
})

test('merge: in-flight rejection when peer fails initialization does not cause unhandledRejection', async () => {
  let unhandled = false
  const onUnhandled = () => { unhandled = true }
  process.on('unhandledRejection', onUnhandled)

  try {
    const theError = new TestError('INIT_BACKGROUND_REJECT')
    const failingChild = async function * () {
      await new Promise(resolve => setTimeout(resolve, 30))
      throw theError
    }

    // Second argument is invalid (null), which causes iteratorFrom to throw during initialization
    let caughtInitError = false
    try {
      // @ts-ignore
      const gen = generators.merge(failingChild(), null)
      await gen.next()
    } catch {
      caughtInitError = true
    }
    assert.ok(caughtInitError, 'threw error for invalid argument')

    await new Promise(resolve => setTimeout(resolve, 60))
    assert.equal(unhandled, false, 'no unhandledRejection when initialization failed')
  } finally {
    process.off('unhandledRejection', onUnhandled)
  }
})

test('merge: handles empty iterables and zero arguments', async () => {
  const emptyGen = generators.merge()
  const emptyResult = await emptyGen.next()
  assert.deepEqual(emptyResult, { value: undefined, done: true }, 'zero arguments returns completed generator')

  const mixed = await chainable.merge([], [1, 2], [], [3]).toArray()
  assert.deepEqual(mixed.sort(), [1, 2, 3], 'empty iterables are skipped without issue')
})

