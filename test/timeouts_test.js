import tape from 'tape'
import { callWithTimeout, wait, waitToCall } from '../src/timeouts.js'

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

tape('callWithTimeout', async test => {
  const beforeTimeout = 50
  const timeout = 100
  const afterTimeout = 150
  await callWithTimeout(timeout, resolveBeforeTimeout(beforeTimeout), rejectOnTimeout())
    .then(result => test.equal(result, msgResolvedBeforeTimeout, 'can resolve before timeout'))
    .catch(error => test.fail(`unhandled exception ${error}`))

  await callWithTimeout(timeout, rejectBeforeTimeout(beforeTimeout), resolveOnTimeout())
    .then(result => test.fail(`exception not thrown ${result}`))
    .catch(result => test.equal(result, msgRejectedBeforeTimeout, 'can reject before timeout'))

  await callWithTimeout(timeout, resolveBeforeTimeout(afterTimeout), rejectOnTimeout())
    .then(result => test.fail(`exception not thrown ${result}`))
    .catch(result => test.equal(result, msgRejectedAfterTimeout, 'can reject after timeout'))

  await callWithTimeout(timeout, rejectBeforeTimeout(afterTimeout), resolveOnTimeout())
    .then(result => test.equal(result, msgResolvedAfterTimeout, 'can resolve after timeout'))
    .catch(error => test.fail(`unhandled exception ${error}`))
  test.end()
})

const allowableJitter = 10
const approximately = (n, ref) => (n > ref - allowableJitter) && (n < ref + allowableJitter)

tape('wait', async test => {
  const waitTime = 50
  const startTime = Date.now()
  await wait(waitTime)
  const stopTime = Date.now()
  const waited = stopTime - startTime
  test.true(approximately(waited, waitTime), 'wait waited the proper amount of time')
  test.end()
})

tape('waitToCall', async test => {
  const fn = () => Date.now()
  const waitTime = 50
  const startTime = Date.now()
  const callTime = await waitToCall(waitTime, fn)
  const waited = callTime - startTime
  test.true(approximately(waited, waitTime), 'waitToCall waited to call fn')
  test.end()
})
