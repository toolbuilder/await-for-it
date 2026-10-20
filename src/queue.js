export class QueueDone extends Error {}
export class QueueFull extends Error {}

/**
 * Structural interface for buffers compatible with Queue (such as Array, RingBuffer,
 * DynamicRingBuffer, PriorityBuffer, and SimplePriorityBuffer).
 *
 * @template [T=any]
 * @template [ShiftReturn=T | undefined]
 * @typedef {object} QueueBuffer
 * @property {number} length - the number of values currently in the buffer
 * @property {(value: T) => number} push - pushes a value onto the buffer and returns the new length
 * @property {() => ShiftReturn} shift - removes and returns the next value from the buffer, or undefined if empty
 */

/**
 * Push values into an asyncIterable one at a time. This lets you process data
 * from other sources such as event handlers and callbacks. Values are queued
 * if the iterating code isn't ready for them yet.
 *
 * You must call done() to finish the iterator.
 *
 * @template [T=any]
 */
export class Queue {
  /**
   * Create a Queue. Each Queue instance is a Generator (both Iterable and Iterator).
   *
   * @param {QueueBuffer<T, any>} [buffer=[]] - a buffer for input that has not yet been processed
   * by the iterable. By default, is is just an empty Array, although this is probably not
   * what you want.
   */
  constructor (buffer = /** @type {any} */ ([])) {
    /** @type {boolean} */
    this.keepGoing = true
    /** @type {((value?: any) => void) | null} */
    this.onPushedValue = null // resolve method from next() Promise
    /** @type {any} */
    this.exception = null // exception pushed in by user to be rethrown in iterator
    /** @type {QueueBuffer<T, T | undefined>} */
    this.buffer = buffer
  }

  /**
   * @returns {number} - the number of values currently in the queue
   */
  get length () { return this.buffer.length }

  /**
   * Terminate iteration over the queue iterator by rejecting the Promise for
   * the next element. In other words, throw an exception in the iterable chain.
   *
   * @param {any} exception - typically an instance of Error
   * @example
   * const queue = new Queue()
   * await chainable(queue).catch(e => console.log(e)).runAwait()
   * queue.reject(new Error('error')) // prints Error from the catch clause above
   */
  reject (exception) { this.exception = exception }

  /**
   * Push a value to the async iterable. Values are queued if the
   * iterator (pulling values from queue) isn't ready yet.
   *
   * If you push a Promise, it must resolve before it can be yielded
   * to the iterating code, and the queue could back up behind it. If
   * you need to preserve order in the sequence, there is no way around
   * this. Consider using `PromiseWithTimeout` so that the queue does not
   * block permanently.
   *
   * If order does not need to be preserved, push a function that returns
   * the Promise (e.g `queue.push(() => promise)`), and feed the queue output
   * to a pool (e.g `pool(10, queue)`).
   *
   * If push throws QueueFull, you can still push values once
   * `queue.length < queue.capacity` again.
   *
   * Once the queue fills, backpressure is provided by the iterating code. Stopping
   * the iterating code will stop the queue from emptying.
   *
   * @param {T} value - to be pushed into iterable
   * @returns {number} - the number of values in the queue at the end of the call
   * @throws {QueueDone} - if queue.done() has already been called
   */
  push (value) {
    if (!this.keepGoing) throw new QueueDone('Queue done already called, cannot push new values')
    if (this.onPushedValue) { this.onPushedValue(); this.onPushedValue = null }
    return this.buffer.push(value)
  }

  /**
   * Complete the iteration. By default any values in the queue will
   * be provided to the iterator before completion.
   *
   * @param {boolean} [emptyQueue=true] - if true, empty the queue before ending,
   * otherwise discard any values in the queue, and end immediately.
   */
  done (emptyQueue = true) {
    this.keepGoing = false
    // substitute empty buffer for non-empty one so that iterator completes
    if (emptyQueue === false) this.buffer = /** @type {any} */ ([])
    if (this.onPushedValue != null) { this.onPushedValue(); this.onPushedValue = null }
  }

  /**
   * Iterable protocol implementation.
   *
   * @returns {AsyncGenerator<Awaited<T>, void, unknown>} - this queue instance is the Generator.
   * @example
   * const queue = new Queue()
   * queue.push(5)
   * // call done to complete iteration. Otherwise, it will just wait for more pushes
   * queue.done()
   * (async () => {
   *   // JavaScript runtime calls [Symbol.asyncIterator] at top of for await ...of loop
   *   for await (const value of queue) {
   *     console.log(value)
   *   }
   * })() // IIFE
   */
  async * [Symbol.asyncIterator] () {
    // Check for buffer.length so that queue empties before iteration completes.
    while (this.keepGoing || this.buffer.length > 0) {
      if (this.exception) throw this.exception
      if (this.buffer.length > 0) {
        yield /** @type {T} */ (this.buffer.shift())
      } else {
        // Promise resolves when Queue.push or Queue.done is called
        await new Promise((resolve) => { this.onPushedValue = resolve })
      }
    }
  }
}
