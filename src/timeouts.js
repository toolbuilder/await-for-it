/**
 * Create a Promise that calls a timeoutFunction if the promiseFunction does not resolve before
 * timeoutDuration milliseconds. The promiseFunction is always called, so the timeout cannot stop it.
 *
 * If the timeoutFunction resolves or rejects first, the promiseFunction resolution will be lost. If
 * the results are important to you, you'll need provide access another way.
 *
 * The timeoutFunction will only be called if the promiseFunction does not resolve before the timeout.
 * @param {Number} timeoutDuration - milliseconds to wait before calling timeoutFunction
 * @param {Function} promiseFunction - normal promise function with resolve, reject as parameters
 * @param {Function} timeoutFunction - normal promise function with resolve, reject as parameters,
 * called only if promise times out.
 */
export const callWithTimeout = function (timeoutDuration, promiseFunction, timeoutFunction) {
  // Per standard, it is ok to call resolve/reject multiple times, only the first time counts.
  const withTimout = (resolve, reject) => {
    const timeout = setTimeout(() => { timeoutFunction(resolve, reject) }, timeoutDuration)
    const onResolve = (resolveWith) => { clearTimeout(timeout); resolve(resolveWith) }
    const onReject = (rejectWith) => { clearTimeout(timeout); reject(rejectWith) }
    promiseFunction(onResolve, onReject)
  }
  // Using Promise.race would always call the timeoutFunction, don't want that
  return new Promise(withTimout)
}

export const wait = (ms) => {
  return new Promise(resolve => setTimeout(() => resolve(), ms))
}

/**
 * Wait before calling a function and returning the resolved value.
 *
 * @param {Number} ms - milliseconds to wait before calling function 'fn'
 * @param {AsyncFunction|Function} fn - function to call
 * @returns {Promise} - that resolves to the return value of fn, or the value it resolves
 * to if fn is async.
 */
export const waitToCall = (ms, fn) => {
  const asyncForSure = () => Promise.resolve(fn())
  return new Promise(resolve => setTimeout(() => { resolve(asyncForSure()) }, ms))
}
