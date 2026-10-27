import test from 'node:test'
import assert from 'node:assert/strict'
import { iteratorFrom } from '../src/await-for-it.js'

test('iteratorFrom: returns sync iterator for sync iterables and async iterator for async iterables', async () => {
  const syncIter = iteratorFrom([10, 20])
  /** @type {Iterator<number>} */
  const checkSync = syncIter
  assert.deepEqual(checkSync.next(), { value: 10, done: false })
  assert.deepEqual(checkSync.next(), { value: 20, done: false })
  assert.deepEqual(checkSync.next(), { value: undefined, done: true })

  const asyncGen = async function * () {
    yield 'a'
    yield 'b'
  }
  const asyncIter = iteratorFrom(asyncGen())
  /** @type {AsyncIterator<string>} */
  const checkAsync = asyncIter
  assert.deepEqual(await checkAsync.next(), { value: 'a', done: false })
  assert.deepEqual(await checkAsync.next(), { value: 'b', done: false })
  assert.deepEqual(await checkAsync.next(), { value: undefined, done: true })
})

test('iteratorFrom: prefers Symbol.asyncIterator over Symbol.iterator on dual iterables', async () => {
  const dual = {
    * [Symbol.iterator] () {
      yield 'sync'
    },
    async * [Symbol.asyncIterator] () {
      yield 'async'
    }
  }

  const iter = iteratorFrom(dual)
  /** @type {AsyncIterator<string>} */
  const checkDual = iter
  assert.deepEqual(await checkDual.next(), { value: 'async', done: false })
  assert.deepEqual(await checkDual.next(), { value: undefined, done: true })

  // Distributive union typing check
  const checkUnion = (/** @type {Iterable<number> | AsyncIterable<boolean>} */ input) => {
    const out = iteratorFrom(input)
    /** @type {Iterator<number> | AsyncIterator<boolean>} */
    const verified = out
    return verified
  }
  assert.equal(typeof checkUnion, 'function')
})

test('iteratorFrom: throws descriptive TypeError for non-iterables', () => {
  const invalidValues = [null, undefined, 0, 42, false, {}, Symbol('bad'), /** @type {object} */ (Object.create(null))]
  for (const invalid of invalidValues) {
    assert.throws(
      // @ts-expect-error - testing runtime validation for invalid arguments
      () => iteratorFrom(invalid),
      {
        name: 'TypeError',
        message: /iteratorFrom parameter 'iterable' must be iterable/
      }
    )
  }
})
