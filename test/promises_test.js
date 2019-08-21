import tape from 'tape'
import { PromiseWithTimeout } from '../src/promises.js'

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

tape('PromiseWithTimeout', async test => {
  const beforeTimeout = 50
  const timeout = 100
  const afterTimeout = 150
  await PromiseWithTimeout(timeout, resolveBeforeTimeout(beforeTimeout), rejectOnTimeout())
    .then(result => test.equal(result, msgResolvedBeforeTimeout, 'can resolve before timeout'))
    .catch(error => test.fail(`unhandled exception ${error}`))

  await PromiseWithTimeout(timeout, rejectBeforeTimeout(beforeTimeout), resolveOnTimeout())
    .then(result => test.fail(`exception not thrown ${result}`))
    .catch(result => test.equal(result, msgRejectedBeforeTimeout, 'can reject before timeout'))

  await PromiseWithTimeout(timeout, resolveBeforeTimeout(afterTimeout), rejectOnTimeout())
    .then(result => test.fail(`exception not thrown ${result}`))
    .catch(result => test.equal(result, msgRejectedAfterTimeout, 'can reject after timeout'))

  await PromiseWithTimeout(timeout, rejectBeforeTimeout(afterTimeout), resolveOnTimeout())
    .then(result => test.equal(result, msgResolvedAfterTimeout, 'can resolve after timeout'))
    .catch(error => test.fail(`unhandled exception ${error}`))
  test.end()
})
