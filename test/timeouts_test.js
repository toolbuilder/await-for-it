import { test } from 'zora'
import { callWithTimeout, wait, waitToCall } from '../src/await-for-it'

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

test('callWithTimeout', async assert => {
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

test('wait', async assert => {
  const waitTime = 50
  const startTime = Date.now()
  await wait(waitTime)
  const stopTime = Date.now()
  const waited = stopTime - startTime
  assert.ok(approximately(waited, waitTime), 'wait waited the proper amount of time')
})

test('waitToCall', async assert => {
  const fn = () => Date.now()
  const waitTime = 50
  const startTime = Date.now()
  const callTime = await waitToCall(waitTime, fn)
  const waited = callTime - startTime
  assert.ok(approximately(waited, waitTime), 'waitToCall waited to call fn')
})
