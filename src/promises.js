/**
 * Create a Promise that calls a timeoutFunction if the promiseFunction does not resolve before
 * timeoutDuration milliseconds. The promiseFunction is always called, so the timeout cannot stop it.
 *
 * The timeoutFunction will only be called if the promiseFunction does not resolve before the timeout.
 * @param {Number} timeoutDuration - milliseconds to wait before calling timeoutFunction
 * @param {Function} promiseFunction - normal promise function with resolve, reject as parameters
 * @param {Function} timeoutFunction - normal promise function with resolve, reject as parameters,
 * called only if promise times out.
 */
export const promiseWithTimeout = function (timeoutDuration, promiseFunction, timeoutFunction) {
  const withTimout = (resolve, reject) => {
    const timeout = setTimeout(() => { timeoutFunction(resolve, reject) }, timeoutDuration)
    const onResolve = (resolveWith) => { clearTimeout(timeout); resolve(resolveWith) }
    const onReject = (rejectWith) => { clearTimeout(timeout); reject(rejectWith) }
    promiseFunction(onResolve, onReject)
  }
  // Using Promise.race would always call the timeoutFunction, don't want that
  return new Promise(withTimout)
}

/**
 * Wait before calling a function and returning the resolved value.
 *
 * @param {Number} ms - milliseconds to wait before calling function 'fn'
 * @param {AsyncFunction|Function} fn - function to call
 * @returns {Promise} - that resolves to the return value of fn, or the value it resolves
 * to if fn is async.
 */
export const wait = (ms, fn = () => {}) => {
  const asyncForSure = () => Promise.resolve(fn())
  return new Promise(resolve => setTimeout(() => { resolve(asyncForSure()) }, ms))
}
