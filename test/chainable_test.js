import { chainable } from '../src/await-for-it.js'
import { test as tape } from 'zora'

tape('chainable: finally', async test => {
  let testValue = 0
  const testValueChecks = []
  const output = await chainable([0, 1, 2, 3])
    .finally(() => ++testValue)
    .callAwait(() => testValueChecks.push(testValue))
    .toArray()
  test.deepEqual(output, [0, 1, 2, 3], 'finally passes all values unchanged')
  test.deepEqual(testValueChecks, [0, 0, 0, 0], 'finally function was not called until after iteration')
  test.equal(testValue, 1, 'finally function was called once')
})

class TestError extends Error {}

tape('chainable: catch', async test => {
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
  test.is(caughtError, theError, 'throws from iterables are caught')
  test.equal(finallyCalled, true, 'finally was still called')

  caughtError = false
  finallyCalled = false
  try {
    await chainable(throwingIterable())
      .catch(error => { throw error })
      .finally(() => { finallyCalled = true })
      .toArray()
  } catch (error) {
    caughtError = true // eslint-disable-line
    test.is(error, theError, 'rethrows from catch are catchable')
  }
  test.ok(caughtError, 'rethrown exception caught')
  test.equal(finallyCalled, true, 'finally was still called')

  caughtError = null // eslint-disable-line
  const output = await chainable([0, 1, 2, 3, 4])
    .catch(error => { caughtError = error })
    .toArray()

  test.deepEqual(output, [0, 1, 2, 3, 4], 'catch passes values unchanged')
  test.equal(caughtError, null, 'catch function was not called when no exception')
})
