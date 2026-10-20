import test from 'node:test'
import assert from 'node:assert/strict'
import { chainable } from '../src/await-for-it.js'

test('chainable: finally', async () => {
  let testValue = 0
  /** @type {number[]} */
  const testValueChecks = []
  const output = await chainable([0, 1, 2, 3])
    .finally(() => ++testValue)
    .callAwait(() => testValueChecks.push(testValue))
    .toArray()
  assert.deepEqual(output, [0, 1, 2, 3], 'finally passes all values unchanged')
  assert.deepEqual(testValueChecks, [0, 0, 0, 0], 'finally function was not called until after iteration')
  assert.equal(testValue, 1, 'finally function was called once')
})

class TestError extends Error {}

test('chainable: catch', async () => {
  const theError = new TestError('REJECT')
  let caughtError
  let finallyCalled
  const throwingIterable = async function * () {
    yield 1
    yield new Promise(resolve => setTimeout(() => resolve(2), 100))
    throw theError
  }

  await chainable(throwingIterable())
    .catch(error => { caughtError = error })
    .finally(() => { finallyCalled = true })
    .toArray()
  assert.equal(caughtError, theError, 'throws from iterables are caught')
  assert.equal(finallyCalled, true, 'finally was still called')

  caughtError = false
  finallyCalled = false
  try {
    await chainable(throwingIterable())
      .catch(error => { throw error })
      .finally(() => { finallyCalled = true })
      .toArray()
  } catch (error) {
    caughtError = true // eslint-disable-line
    assert.equal(error, theError, 'rethrows from catch are catchable')
  }
  assert.ok(caughtError, 'rethrown exception caught')
  assert.equal(finallyCalled, true, 'finally was still called')

  caughtError = null // eslint-disable-line
  const output = await chainable([0, 1, 2, 3, 4])
    .catch(error => { caughtError = error })
    .toArray()

  assert.deepEqual(output, [0, 1, 2, 3, 4], 'catch passes values unchanged')
  assert.equal(caughtError, null, 'catch function was not called when no exception')
})
