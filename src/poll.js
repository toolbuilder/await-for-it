import { isFunction } from './is.js'
import { isFiniteNumber } from '@toolbuilder/isnumber'

/**
 * Periodically calls a function and provides the resolved values as an async iterator.
 *
 * Polling cadence is governed by backpressure: if the downstream consumer iterates
 * slower than the polling period, polling slows down to match so no buffering is required.
 *
 * Poll is single-use and fail-fast: any unhandled exception thrown or rejected by `fn`
 * will terminate iteration and propagate to the consumer.
 *
 * @template [T=any]
 */
export class Poll {
  /**
   * Periodically call a function.
   *
   * @param {() => T | PromiseLike<T>} fn - synchronous or async function that takes no parameters
   * @param {number} period - target interval in milliseconds between calls to fn
   * @param {number} [initialWait=0] - wait initialWait milliseconds before making the first call. Defaults to 0.
   * @throws {TypeError} if fn is not a function
   * @throws {RangeError} if period is not a number > 0 or initialWait is not a number >= 0
   * @example
   * const poller = new Poll(async () => '42', 720)
   * for await (const value of poller) {
   *   console.log(value)
   *   if (value === '42') poller.done()
   * }
   */
  constructor (fn, period, initialWait = 0) {
    if (!isFunction(fn)) {
      throw new TypeError(`Poll parameter 'fn' must be a function: ${fn}`)
    }
    if (!(isFiniteNumber(period) && period > 0)) {
      throw new RangeError(`Poll parameter 'period' must be a number > 0: ${period}`)
    }
    if (!(isFiniteNumber(initialWait) && initialWait >= 0)) {
      throw new RangeError(`Poll parameter 'initialWait' must be a number >= 0: ${initialWait}`)
    }

    /** @type {() => T | PromiseLike<T>} */
    this.fn = fn
    /** @type {number} */
    this.period = period
    /** @type {number} */
    this.initialWait = initialWait
    /** @type {boolean} */
    this.isDone = false

    /** @private @type {boolean} */
    this._isStarted = false
    /** @private @type {(() => void) | null} */
    this._cancelWait = null
  }

  /**
   * Stops polling. Aborts any active sleep timer immediately.
   * If `fn` is currently executing, it is allowed to complete.
   */
  done () {
    this.isDone = true
    if (this._cancelWait) {
      this._cancelWait()
      this._cancelWait = null
    }
  }

  /**
   * Wait for `ms` milliseconds, cancelable by `done()`.
   * @private
   * @param {number} ms
   * @returns {Promise<void>}
   */
  _wait (ms) {
    return new Promise(resolve => {
      /** @type {any} */
      let timer = null
      const onDone = () => {
        if (timer !== null) {
          clearTimeout(timer)
          timer = null
        }
        resolve()
      }
      timer = setTimeout(() => {
        this._cancelWait = null
        resolve()
      }, ms)
      this._cancelWait = onDone
    })
  }

  /**
   * @returns {AsyncGenerator<Awaited<T>, void, unknown>} - provides the stream of poll results
   */
  async * [Symbol.asyncIterator] () {
    if (this.isDone || this._isStarted) return
    this._isStarted = true

    try {
      if (this.initialWait > 0) {
        await this._wait(this.initialWait)
        if (this.isDone) return
      }

      while (!this.isDone) {
        const startTime = performance.now()
        const fn = this.fn
        yield await Promise.resolve(fn())

        if (this.isDone) break

        const elapsed = performance.now() - startTime
        if (elapsed < this.period) {
          await this._wait(this.period - elapsed)
        }
      }
    } finally {
      this.isDone = true
      this._cancelWait = null
    }
  }
}
