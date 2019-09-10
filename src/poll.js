import { wait } from './timeouts.js'

/**
 * Periodically calls a function and provides the resolved values as an iterator.
 */
export class Poll {
  /**
   * Periodically call a function. If the polling period is faster than the iteration rate,
   * then the interation rate will slow polling so that no buffering is required. Because of
   * this, when the iterating code stops, calls to asyncFunction will also stop. However, you
   * should call the `done` method so that any finally expressions can run.
   *
   * @param {Function|AsyncFunction} fn - synchronous or async function that takes no parameters
   * @param {Number} period - call fn every period milliseconds
   * @param {Number} initialWait - make first function call immediately if zero, otherwise wait
   * `initialWait` millisceonds before making first call. Defaults to zero.
   * @returns {AsyncGenerator} - provides the stream of poll results
   * @example
   * // iteration potentially faster than polling period:
   * const poller = poll(async () => '42', 720)
   * for await (const value of poller) {
   *   console.log(value) // prints '42' once every 720ms
   * }
   * // iteration slower than polling period:
   * const fastPoller = poll(() => 'A', 100)
   * const slowIterator = throttle(500, true, fastPoller) // maximum iteration rate of 500ms
   * for await (const value of slowIterator) {
   *   console.log(value) // prints 'A' once every 500ms, even though period is 100ms
   * }
   * // polling stops when iteration stops
   * // but iteration won't complete until you call done()
   * const limitedPolls = take(5, poll(async () => 'B', 420))
   * for await (const value of limitedPolls) {
   *   console.log(value) // prints 'B' 5 times, and only calls the async function 5 times
   * }
   */
  constructor (fn, period, initialWait = 0) {
    this.fn = fn
    this.period = period
    this.initialWait = initialWait
    this.isDone = false
  }

  /**
   * Stops polling
   */
  done () { this.isDone = true }

  async * [Symbol.asyncIterator] () {
    if (this.initialWait !== 0) {
      await wait(this.initialWait)
    }
    while (!this.isDone) { // eslint-disable-line
      const startTime = Date.now()
      yield await Promise.resolve(this.fn())
      const yieldDuration = Date.now() - startTime
      if (yieldDuration < this.period) {
        await wait(this.period - yieldDuration)
      }
    }
  }
}
