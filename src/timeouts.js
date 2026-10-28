import { isFunction } from './is.js'
import { isFiniteNumber } from '@toolbuilder/isnumber'

/**
 * Create a Promise that calls a timeoutFunction if the promiseFunction does not settle before
 * timeoutDuration milliseconds. The promiseFunction is always called, so the timeout cannot stop it.
 *
 * If the timeoutFunction resolves or rejects first, the promiseFunction resolution will be lost. If
 * the results are important to you, you'll need to provide access another way.
 *
 * The timeoutFunction will only be called if the promiseFunction does not settle (resolve or reject)
 * before the timeout.
 *
 * @type {<T = any, U = T>(timeoutDuration: number, promiseFunction: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void, timeoutFunction: (resolve: (value: U | PromiseLike<U>) => void, reject: (reason?: any) => void) => void) => Promise<T | U>}
 * @param {number} timeoutDuration - milliseconds to wait before calling timeoutFunction
 * @param {(resolve: (value: any) => void, reject: (reason?: any) => void) => void} promiseFunction - normal promise function with resolve, reject as parameters
 * @param {(resolve: (value: any) => void, reject: (reason?: any) => void) => void} timeoutFunction - normal promise function with resolve, reject as parameters,
 * called only if promise times out.
 * @returns {Promise<any>}
 * @throws {RangeError} if timeoutDuration is not a non-negative number
 * @throws {TypeError} if promiseFunction or timeoutFunction is not a function
 */
export const callWithTimeout = function (timeoutDuration, promiseFunction, timeoutFunction) {
  if (!(isFiniteNumber(timeoutDuration) && timeoutDuration >= 0)) {
    throw new RangeError(`callWithTimeout parameter 'timeoutDuration' must be a non-negative number: ${timeoutDuration}`)
  }
  if (!isFunction(promiseFunction)) {
    throw new TypeError(`callWithTimeout parameter 'promiseFunction' must be a function: ${promiseFunction}`)
  }
  if (!isFunction(timeoutFunction)) {
    throw new TypeError(`callWithTimeout parameter 'timeoutFunction' must be a function: ${timeoutFunction}`)
  }

  // Per standard, it is ok to call resolve/reject multiple times, only the first time counts.
  const withTimeout = (resolve, reject) => {
    let settled = false
    const timeout = setTimeout(() => {
      if (settled) return
      try {
        timeoutFunction(resolve, reject)
      } catch (err) {
        reject(err)
      }
    }, timeoutDuration)
    const onResolve = (resolveWith) => {
      settled = true
      clearTimeout(timeout)
      resolve(resolveWith)
    }
    const onReject = (rejectWith) => {
      settled = true
      clearTimeout(timeout)
      reject(rejectWith)
    }
    try {
      promiseFunction(onResolve, onReject)
    } catch (err) {
      settled = true
      clearTimeout(timeout)
      reject(err)
    }
  }
  // Using Promise.race would always call the timeoutFunction, don't want that
  return new Promise(withTimeout)
}

/**
 * Create a promise that resolves after `ms` milliseconds.
 *
 * @type {(ms: number) => Promise<void>}
 * @param {number} ms - the minimum number of milliseconds to wait before resolving.
 * @returns {Promise<void>}
 * @throws {RangeError} if ms is not a non-negative number
 */
export const wait = (ms) => {
  if (!(isFiniteNumber(ms) && ms >= 0)) {
    throw new RangeError(`wait parameter 'ms' must be a non-negative number: ${ms}`)
  }
  return new Promise(resolve => setTimeout(() => resolve(), ms))
}

/**
 * Wait before calling a function and returning the resolved value.
 *
 * @type {<T = any>(ms: number, fn: () => T | PromiseLike<T>) => Promise<Awaited<T>>}
 * @param {number} ms - milliseconds to wait before calling function 'fn'
 * @param {() => any} fn - function to call
 * @returns {Promise<any>} - that resolves to the return value of fn, or the value it resolves
 * to if fn is async.
 * @throws {RangeError} if ms is not a non-negative number
 * @throws {TypeError} if fn is not a function
 */
export const waitToCall = async (ms, fn) => {
  if (!(isFiniteNumber(ms) && ms >= 0)) {
    throw new RangeError(`waitToCall parameter 'ms' must be a non-negative number: ${ms}`)
  }
  if (!isFunction(fn)) {
    throw new TypeError(`waitToCall parameter 'fn' must be a function: ${fn}`)
  }
  await wait(ms)
  return /** @type {any} */ (fn())
}
