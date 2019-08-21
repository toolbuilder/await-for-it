/**
 * Create a Promise that calls a timeoutFunction if the promiseFunction does not resolve before
 * timeoutDuration milliseconds. The promiseFunction is always called, so the timeout cannot stop it.
 *
 * The timeoutFunction will only be called if the promiseFunction does not resolve before the timeout.
 * @param {*} timeoutDuration - milliseconds to wait before calling timeoutFunction
 * @param {*} promiseFunction - normal promise function with resolve, reject as parameters
 * @param {*} timeoutFunction - normal promise function with resolve, reject as parameters
 */
export const PromiseWithTimeout = function (timeoutDuration, promiseFunction, timeoutFunction) {
  const withTimout = (resolve, reject) => {
    const timeout = setTimeout(() => { timeoutFunction(resolve, reject) }, timeoutDuration)
    const onResolve = (resolveWith) => { clearTimeout(timeout); resolve(resolveWith) }
    const onReject = (rejectWith) => { clearTimeout(timeout); reject(rejectWith) }
    promiseFunction(onResolve, onReject)
  }
  // Using Promise.race would always call the timeoutFunction, don't want that
  return new Promise(withTimout)
}
