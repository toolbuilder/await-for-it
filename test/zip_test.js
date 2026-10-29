import test from 'node:test'
import assert from 'node:assert/strict'
import { chainable as sync, generators as ifuGenerators } from 'iterablefu'
import { chainable, generators } from '../src/await-for-it.js'
import { randomlySlowIterator, runTest as runTooFastTest } from './toofast.js'

class TestError extends Error {}

const iterableOne = ['able', 'better', 'chainable', 'dictionary', 'enhanced', 'forbidden']
const iterableRef = [['able', 1], ['better', 2], ['chainable', 3], ['dictionary', 4], ['enhanced', 5]]

const runTest = async ([iterable, expected, message]) => {
  const actual = await chainable(iterable).toArray()
  assert.deepEqual(actual, expected, message)
}

const testRunner = (testCases) => {
  return chainable(testCases).forEach(testCase => runTest(testCase))
}

test('zip', async () => {
  /** @type {any[]} */
  const testCases = [
    [
      chainable.zip(iterableOne.slice(0, 5), ifuGenerators.range(1, 5)),
      iterableRef,
      'equal length iterables are all exhausted'
    ],
    [
      chainable.zip(iterableOne, ifuGenerators.range(1, 5)),
      iterableRef,
      'zip quits when shortest iterable is exhausted'
    ],
    [
      // as with all previous tests, input iterables are synchronous
      chainable.zip(iterableOne.slice(0, 5), ifuGenerators.range(1, 5)),
      iterableRef,
      'handles synchronous iterables'
    ],
    [
      // make range async by wrapping with chainable
      chainable.zip(iterableOne.slice(0, 5), chainable(ifuGenerators.range(1, 5))),
      iterableRef,
      'handles mix of async and synchronous iterables'
    ]
  ]
  await testRunner(testCases)
})

test('zipAll', async () => {
  /** @type {any[]} */
  const testCases = [
    [
      chainable.zipAll(iterableOne.slice(0, 5), ifuGenerators.range(1, 5)),
      iterableRef,
      'equal length iterables are all exhausted'
    ],
    [
      chainable.zipAll(iterableOne, ifuGenerators.range(1, 5)),
      iterableRef.concat([['forbidden', /** @type {any} */ (undefined)]]),
      'keeps going until longest iterable is exhausted, missing values are undefined'
    ],
    [
      // as with all previous tests, input iterables are synchronous
      chainable.zipAll(iterableOne.slice(0, 5), ifuGenerators.range(1, 5)),
      iterableRef,
      'handles synchronous iterables'
    ],
    [
      // make range async by wrapping with chainable
      chainable.zipAll(iterableOne.slice(0, 5), chainable(ifuGenerators.range(1, 5))),
      iterableRef,
      'handles mix of async and synchronous iterables'
    ]
  ]
  await testRunner(testCases)
})

test('zip: handles empty iterables and zero arguments', async () => {
  const emptyZip = generators.zip()
  const r1 = await emptyZip.next()
  assert.deepEqual(r1, { value: undefined, done: true }, 'zip with zero arguments terminates immediately')

  const emptyZipAll = generators.zipAll()
  const r2 = await emptyZipAll.next()
  assert.deepEqual(r2, { value: undefined, done: true }, 'zipAll with zero arguments terminates immediately')

  const chainableZipEmpty = await chainable.zip().toArray()
  assert.deepEqual(chainableZipEmpty, [], 'chainable.zip() produces empty array')

  const chainableZipAllEmpty = await chainable.zipAll().toArray()
  assert.deepEqual(chainableZipAllEmpty, [], 'chainable.zipAll() produces empty array')

  const zipWithEmpty = await chainable.zip([], [1, 2, 3]).toArray()
  assert.deepEqual(zipWithEmpty, [], 'zip stops immediately when one iterable is empty')

  const zipAllWithEmpty = await chainable.zipAll([], [1, 2]).toArray()
  assert.deepEqual(zipAllWithEmpty, [[undefined, 1], [undefined, 2]], 'zipAll pads empty iterable with undefined')
})

test('zip: closes active iterators on early break', async () => {
  let child1Cleaned = false
  let child2Cleaned = false

  const child1 = async function * () {
    try {
      yield 1
      yield 2
    } finally {
      child1Cleaned = true
    }
  }

  const child2 = async function * () {
    try {
      yield 'a'
      yield 'b'
    } finally {
      child2Cleaned = true
    }
  }

  const values = []
  for await (const val of generators.zip(child1(), child2())) {
    values.push(val)
    break
  }

  assert.deepEqual(values, [[1, 'a']])
  assert.ok(child1Cleaned, 'child1 had return() called via finally on early break')
  assert.ok(child2Cleaned, 'child2 had return() called via finally on early break')
})

test('zip: closes remaining active iterators when shortest iterable is exhausted', async () => {
  let longChildCleaned = false

  const longChild = async function * () {
    try {
      yield 'a'
      yield 'b'
      yield 'c'
    } finally {
      longChildCleaned = true
    }
  }

  const values = await chainable.zip([1], longChild()).toArray()
  assert.deepEqual(values, [[1, 'a']])
  assert.ok(longChildCleaned, 'longer iterable was cleaned up when shortest finished')
})

test('zipAll: closes active iterators on early break', async () => {
  let child1Cleaned = false
  let child2Cleaned = false

  const child1 = async function * () {
    try {
      yield 1
      yield 2
    } finally {
      child1Cleaned = true
    }
  }

  const child2 = async function * () {
    try {
      yield 'a'
      yield 'b'
    } finally {
      child2Cleaned = true
    }
  }

  const values = []
  for await (const val of generators.zipAll(child1(), child2())) {
    values.push(val)
    break
  }

  assert.deepEqual(values, [[1, 'a']])
  assert.ok(child1Cleaned, 'child1 had return() called via finally on early break')
  assert.ok(child2Cleaned, 'child2 had return() called via finally on early break')
})

test('zipAll: does not call next() on already completed iterators', async () => {
  let callCount = 0
  const finiteIterator = {
    [Symbol.asyncIterator] () {
      return {
        async next () {
          callCount++
          if (callCount > 2) {
            throw new Error('Called next() after iterator was already done!')
          }
          if (callCount === 1) {
            return { done: false, value: 'item1' }
          }
          return { done: true, value: undefined }
        }
      }
    }
  }

  const result = await chainable.zipAll(finiteIterator, [1, 2, 3]).toArray()
  assert.deepEqual(result, [
    ['item1', 1],
    [undefined, 2],
    [undefined, 3]
  ])
  assert.equal(callCount, 2, 'next() was not called after done was reported')
})

test('zip: closes remaining active iterators when one iterable throws', async () => {
  let child2Cleaned = false
  const theError = new TestError('ZIP_BOOM')

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
  await chainable
    .zip(child1(), child2())
    .catch(err => {
      caught = true
      assert.equal(err, theError)
    })
    .runAwait()

  assert.ok(caught, 'caught thrown child error')
  assert.ok(child2Cleaned, 'peer was cleaned up after error')
})

test('zipAll: closes remaining active iterators when one iterable throws', async () => {
  let child2Cleaned = false
  const theError = new TestError('ZIPALL_BOOM')

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
  await chainable
    .zipAll(child1(), child2())
    .catch(err => {
      caught = true
      assert.equal(err, theError)
    })
    .runAwait()

  assert.ok(caught, 'caught thrown child error')
  assert.ok(child2Cleaned, 'peer was cleaned up after error in zipAll')
})

test('zip: caller .return(value) cleans up active iterators and preserves return value', async () => {
  let childCleaned = false

  const child = async function * () {
    try {
      yield 1
      yield 2
    } finally {
      childCleaned = true
    }
  }

  const gen = generators.zip(child())
  const first = await gen.next()
  assert.deepEqual(first.value, [1])
  assert.equal(first.done, false)

  const ret = await gen.return()
  assert.equal(ret.value, undefined)
  assert.equal(ret.done, true)
  assert.ok(childCleaned, 'child was cleaned up on manual .return() call')
})

test('zip: caller .throw(error) cleans up active iterators and propagates error', async () => {
  let childCleaned = false
  const theError = new TestError('ZIP_DOWNSTREAM_THROW')

  const child = async function * () {
    try {
      yield 1
      yield 2
    } finally {
      childCleaned = true
    }
  }

  const gen = generators.zip(child())
  const first = await gen.next()
  assert.deepEqual(first.value, [1])

  await assert.rejects(async () => gen.throw(theError), theError)
  assert.ok(childCleaned, 'child was cleaned up on manual .throw() call')
})

test('zip: handles synchronous throw in iterator.next()', async () => {
  let cleanableCleaned = false
  const theError = new TestError('ZIP_SYNC_NEXT_ERROR')

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

  const gen = generators.zip(syncThrowIter, cleanable())
  const r1 = await gen.next()
  assert.deepEqual(r1.value, ['first', 'cleanable'])

  await assert.rejects(async () => gen.next(), theError)
  assert.ok(cleanableCleaned, 'peer was cleaned up when synchronous throw occurred')
})

test('zip: late rejection after error does not cause unhandledRejection', async () => {
  let unhandled = false
  const onUnhandled = () => { unhandled = true }
  process.on('unhandledRejection', onUnhandled)

  try {
    const fastReject = {
      [Symbol.asyncIterator] () {
        return {
          next () {
            return Promise.reject(new TestError('FAST_REJECT'))
          }
        }
      }
    }
    const slowReject = {
      [Symbol.asyncIterator] () {
        return {
          next () {
            return new Promise((_, reject) => setTimeout(() => reject(new TestError('SLOW_REJECT')), 40))
          }
        }
      }
    }

    let caughtError = false
    try {
      for await (const val of generators.zip(fastReject, slowReject)) {
        // unreachable
      }
    } catch (err) {
      caughtError = true
      assert.equal(err.message, 'FAST_REJECT')
    }
    assert.ok(caughtError, 'caught fast rejection')

    // Wait for the slow rejection to fire while iteration is finished
    await new Promise(resolve => setTimeout(resolve, 80))
    assert.equal(unhandled, false, 'no unhandledRejection when sibling had rejected earlier')
  } finally {
    process.off('unhandledRejection', onUnhandled)
  }
})

test('zip: peer failing initialization closes already created iterators', async () => {
  let returnCalled = false
  const spyIterable = {
    [Symbol.iterator] () {
      return {
        next () { return { done: false, value: 1 } },
        return () {
          returnCalled = true
          return { done: true }
        }
      }
    }
  }

  let caughtInitError = false
  try {
    // @ts-ignore
    const gen = generators.zip(spyIterable, null)
    await gen.next()
  } catch {
    caughtInitError = true
  }
  assert.ok(caughtInitError, 'threw error for invalid argument')
  assert.ok(returnCalled, 'iterator created before failure had return() called')
})

test('zip: iterator called faster than one-at-a-time', async () => {
  const values = 20
  const s1 = randomlySlowIterator(5, 5, sync.range(values).toArray())
  const s2 = randomlySlowIterator(5, 5, sync.range(values, values * 2).toArray())
  const iterator = generators.zip(s1, s2)
  const actual = await runTooFastTest(iterator, values)
  const expected = sync.range(values).map(i => [i, i + values]).toArray()
  assert.deepEqual(actual, expected, 'all pairs yielded in order')
})

test('zipAll: iterator called faster than one-at-a-time', async () => {
  const values = 20
  const shorter = 15
  const s1 = randomlySlowIterator(5, 5, sync.range(shorter).toArray())
  const s2 = randomlySlowIterator(5, 5, sync.range(values).toArray())
  const iterator = generators.zipAll(s1, s2)
  const actual = await runTooFastTest(iterator, values)
  const expected = sync.range(values).map(i => [i < shorter ? i : undefined, i]).toArray()
  assert.deepEqual(actual, expected, 'all pairs yielded in order with padding')
})
