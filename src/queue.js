export class QueueDone extends Error {
  name = 'QueueDone'
}
export class QueueFull extends Error {
  name = 'QueueFull'
}

/**
 * Structural interface for buffers compatible with Queue (such as Array, RingBuffer,
 * DynamicRingBuffer, PriorityBuffer, and SimplePriorityBuffer).
 *
 * @template [T=any]
 * @template [ShiftReturn=any]
 * @typedef {object} QueueBuffer
 * @property {number} length - the number of values currently in the buffer
 * @property {(value: T) => number} push - pushes a value onto the buffer and returns the new length
 * @property {() => ShiftReturn} shift - removes and returns the next value from the buffer, or undefined if empty
 */

/**
 * Test if an object conforms to the QueueBuffer interface.
 *
 * @param {any} buffer - value to test
 * @returns {buffer is QueueBuffer<any>}
 */
const isQueueBuffer = (buffer) => {
  return (
    typeof buffer === 'object' &&
    buffer !== null &&
    typeof buffer.length === 'number' &&
    typeof buffer.push === 'function' &&
    typeof buffer.shift === 'function'
  )
}

/**
 * Push values into an asyncIterable one at a time. This lets you process data
 * from other sources such as event handlers and callbacks. Values are queued
 * if the consumer awaiting the iterator isn't ready for them yet.
 *
 * You must call done() to finish the iterator.
 *
 * @template [T=any]
 */
export class Queue {
  /**
   * Create a Queue. Each Queue instance is an AsyncIterable.
   *
   * @param {QueueBuffer<T>} [buffer=[]] - a buffer for input that has not yet been processed
   * by the iterable. By default, it is an empty Array.
   * @throws {TypeError} if buffer is not a valid QueueBuffer
   */
  constructor (buffer = []) {
    if (!isQueueBuffer(buffer)) {
      throw new TypeError(`Queue parameter 'buffer' must be a buffer object: ${buffer}`)
    }

    /** @type {boolean} */
    this.keepGoing = true
    /** @type {Array<{ resolve: (value?: any) => void, reject: (reason?: any) => void }>} */
    this.waiters = []
    /** @type {boolean} */
    this.hasException = false
    /** @type {any} */
    this.exception = null
    /** @type {QueueBuffer<T>} */
    this.buffer = buffer
  }

  /**
   * @returns {number} - the number of values currently in the queue
   */
  get length () { return this.buffer.length }

  /**
   * Terminate iteration over the queue by rejecting any pending or future iteration
   * and throwing an exception in the consumer iterable chain.
   *
   * @param {any} exception - typically an instance of Error
   * @example
   * const queue = new Queue()
   * const controller = chainable(queue).catch(e => console.log(e)).run()
   * queue.reject(new Error('error')) // prints Error from the catch clause above
   */
  reject (exception) {
    this.hasException = true
    this.exception = exception
    this.keepGoing = false
    while (this.waiters.length > 0) {
      const waiter = this.waiters.shift()
      if (waiter) waiter.reject(exception)
    }
  }

  /**
   * Push a value to the async iterable. Values are queued if the
   * iterator (pulling values from queue) isn't ready yet.
   *
   * If you push a Promise, it must resolve before it can be yielded
   * to the consumer awaiting the iterator, and the queue could back up behind it. If
   * you need to preserve order in the sequence, there is no way around
   * this. Consider using `callWithTimeout` so that the queue does not
   * block permanently.
   *
   * If order does not need to be preserved, push a function that returns
   * the Promise (e.g `queue.push(() => promise)`), and feed the queue output
   * to a pool (e.g `pool(10, queue)`).
   *
   * The rate at which the queue empties is governed by backpressure from the consumer
   * awaiting the iterator. Stopping the consumer stops the queue from emptying.
   *
   * @param {T} value - to be pushed into iterable
   * @returns {number} - the number of values in the queue at the end of the call
   * @throws {QueueDone} - if queue.done() or queue.reject() has already been called
   */
  push (value) {
    if (!this.keepGoing) throw new QueueDone('Queue done already called, cannot push new values')
    const len = this.buffer.push(value)
    if (this.waiters.length > 0) {
      const waiter = this.waiters.shift()
      if (waiter) waiter.resolve()
    }
    return len
  }

  /**
   * Complete the iteration. By default any values in the queue will
   * be provided to the iterator before completion.
   *
   * @param {boolean} [emptyQueue=true] - if true, drain the queue before ending,
   * otherwise discard any values in the queue, and end immediately.
   * @throws {TypeError} if emptyQueue is not a boolean
   */
  done (emptyQueue = true) {
    if (typeof emptyQueue !== 'boolean') {
      throw new TypeError(`Queue parameter 'emptyQueue' must be a boolean: ${emptyQueue}`)
    }
    this.keepGoing = false
    if (emptyQueue === false) {
      this.buffer = []
    }
    while (this.waiters.length > 0) {
      const waiter = this.waiters.shift()
      if (waiter) waiter.resolve()
    }
  }

  /**
   * Iterable protocol implementation.
   *
   * @returns {AsyncGenerator<Awaited<T>, void, unknown>} - an AsyncGenerator yielding values from the queue.
   * @example
   * const queue = new Queue()
   * queue.push(5)
   * // Signal that no more items will be pushed.
   * // Buffered values are drained before iteration completes.
   * queue.done()
   * (async () => {
   *   // JavaScript runtime calls [Symbol.asyncIterator] at top of for await ...of loop
   *   for await (const value of queue) {
   *     console.log(value)
   *   }
   * })() // IIFE
   */
  async * [Symbol.asyncIterator] () {
    /** @type {{ resolve: (value?: any) => void, reject: (reason?: any) => void } | null} */
    let currentWaiter = null
    try {
      while (this.keepGoing || this.buffer.length > 0) {
        if (this.hasException) throw this.exception
        if (this.buffer.length > 0) {
          yield /** @type {T} */ (this.buffer.shift())
        } else {
          await new Promise((resolve, reject) => {
            currentWaiter = { resolve, reject }
            this.waiters.push(currentWaiter)
          })
          currentWaiter = null
        }
      }
      if (this.hasException) throw this.exception
    } finally {
      if (currentWaiter !== null) {
        const index = this.waiters.indexOf(currentWaiter)
        if (index !== -1) {
          this.waiters.splice(index, 1)
        }
      }
    }
  }
}

