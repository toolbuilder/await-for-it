import test from 'node:test'
import assert from 'node:assert/strict'
import { callWithTimeout, wait, waitToCall } from '../src/await-for-it.js'

const msgResolvedBeforeTimeout = 'Resolved Before Timeout'
const msgRejectedBeforeTimeout = 'Rejected Before Timeout'
const msgResolvedAfterTimeout = 'Resolved After Timeout'
const msgRejectedAfterTimeout = 'Rejected After Timeout'

const resolveBeforeTimeout = (timeout) => {
  return (resolve, reject) => { setTimeout(() => resolve(msgResolvedBeforeTimeout), timeout) }
}

const rejectBeforeTimeout = (timeout) => {
  return (resolve, reject) => { setTimeout(() => reject(msgRejectedBeforeTimeout), timeout) }
}

const resolveOnTimeout = () => {
  return (resolve, reject) => resolve(msgResolvedAfterTimeout)
}

const rejectOnTimeout = () => {
  return (resolve, reject) => reject(msgRejectedAfterTimeout)
}

test('callWithTimeout', async () => {
  const beforeTimeout = 50
  const timeout = 100
  const afterTimeout = 150
  await callWithTimeout(timeout, resolveBeforeTimeout(beforeTimeout), rejectOnTimeout())
    .then(result => assert.equal(result, msgResolvedBeforeTimeout, 'can resolve before timeout'))
    .catch(error => assert.fail(`unhandled exception ${error}`))

  await callWithTimeout(timeout, rejectBeforeTimeout(beforeTimeout), resolveOnTimeout())
    .then(result => assert.fail(`exception not thrown ${result}`))
    .catch(result => assert.equal(result, msgRejectedBeforeTimeout, 'can reject before timeout'))

  await callWithTimeout(timeout, resolveBeforeTimeout(afterTimeout), rejectOnTimeout())
    .then(result => assert.fail(`exception not thrown ${result}`))
    .catch(result => assert.equal(result, msgRejectedAfterTimeout, 'can reject after timeout'))

  await callWithTimeout(timeout, rejectBeforeTimeout(afterTimeout), resolveOnTimeout())
    .then(result => assert.equal(result, msgResolvedAfterTimeout, 'can resolve after timeout'))
    .catch(error => assert.fail(`unhandled exception ${error}`))
})

const allowableJitter = 10
const approximately = (n, ref) => (n > ref - allowableJitter) && (n < ref + allowableJitter)

test('wait', async () => {
  const waitTime = 50
  const startTime = Date.now()
  await wait(waitTime)
  const stopTime = Date.now()
  const waited = stopTime - startTime
  assert.ok(approximately(waited, waitTime), 'wait waited the proper amount of time')
})

test('waitToCall', async () => {
  const fn = () => Date.now()
  const waitTime = 50
  const startTime = Date.now()
  const callTime = await waitToCall(waitTime, fn)
  const waited = callTime - startTime
  assert.ok(approximately(waited, waitTime), 'waitToCall waited to call fn')

  const asyncResult = await waitToCall(20, async () => 'async-ok')
  /** @type {string} */
  const checkAsyncResult = asyncResult
  assert.equal(checkAsyncResult, 'async-ok')

  const syncBoom = new Error('sync waitToCall failure')
  await assert.rejects(
    () => waitToCall(20, () => { throw syncBoom }),
    syncBoom,
    'synchronous throw inside waitToCall rejects returned promise instead of crashing timer'
  )
})

test('callWithTimeout: cleans up timer on sync throw, catches sync timeout throw, and infers fallback types', async () => {
  let timeoutCalled = false
  const syncError = new Error('sync promiseFunction error')

  await assert.rejects(
    () => callWithTimeout(
      30,
      () => { throw syncError },
      (resolve) => {
        timeoutCalled = true
        resolve('should not run')
      }
    ),
    syncError,
    'sync throw in promiseFunction rejects immediately'
  )

  await wait(60)
  assert.equal(timeoutCalled, false, 'timeoutFunction is not called after promiseFunction throws synchronously')

  const timeoutSyncError = new Error('sync timeoutFunction error')
  await assert.rejects(
    () => callWithTimeout(
      20,
      () => {},
      () => { throw timeoutSyncError }
    ),
    timeoutSyncError,
    'sync throw in timeoutFunction rejects returned promise cleanly'
  )

  // Distinct fallback type inference: Promise<number | null>
  const fallbackValue = await callWithTimeout(
    20,
    (resolve) => { setTimeout(() => resolve(123), 80) },
    (resolve) => resolve(null)
  )
  /** @type {number | null} */
  const checkFallback = fallbackValue
  assert.equal(checkFallback, null)

  const compileTimeChecks = () => {
    /** @type {typeof callWithTimeout<number, number>} */ (callWithTimeout)(
      10,
      (resolve) => resolve(1),
      (resolve) => {
        // @ts-expect-error - cannot resolve() with 0 args when U is number under strictNullChecks
        resolve()
      }
    )
  }
  assert.equal(typeof compileTimeChecks, 'function')
})

test('timeouts: validates parameters eagerly', async () => {
  // wait parameter validation
  for (const badMs of [-1, -50, NaN, '50', null, undefined]) {
    // @ts-ignore
    assert.throws(() => wait(badMs), RangeError)
  }

  // waitToCall parameter validation
  for (const badMs of [-1, -50, NaN, '50', null, undefined]) {
    // @ts-ignore
    await assert.rejects(async () => waitToCall(badMs, () => 42), RangeError)
  }
  for (const badFn of [null, undefined, 123, 'not a fn', {}]) {
    // @ts-ignore
    await assert.rejects(async () => waitToCall(10, badFn), TypeError)
  }

  // callWithTimeout parameter validation
  for (const badDuration of [-1, -50, NaN, '100', null, undefined]) {
    // @ts-ignore
    assert.throws(() => callWithTimeout(badDuration, () => {}, () => {}), RangeError)
  }
  for (const badPromiseFn of [null, undefined, 123, 'not a fn']) {
    // @ts-ignore
    assert.throws(() => callWithTimeout(10, badPromiseFn, () => {}), TypeError)
  }
  for (const badTimeoutFn of [null, undefined, 123, 'not a fn']) {
    // @ts-ignore
    assert.throws(() => callWithTimeout(10, () => {}, badTimeoutFn), TypeError)
  }
})
