import { List } from '@toolbuilder/list/src/list.js'

export class QueueDone extends Error {}
export class QueueFull extends Error {}

/**
 * Push values into an asyncIterable one at a time. This lets you process data
 * from other sources such as event handlers and callbacks. Values are queued
 * if the iterating code isn't ready for them yet.
 *
 * You must call done() to finish the iterator.
 */
export class Queue {
  /**
   * Create a Queue. Each instance is a Generator (both Iterable and Iterator).
   *
   * @param {number} maxQueueSize - the maximum size of the queue
   */
  constructor (maxQueueSize = 100000) {
    this.keepGoing = true
    this.pushedValue = null // resolve method from next() Promise
    this.queue = new List() // store pushed values if pushing is faster than iterating
    this.maxQueueSize = maxQueueSize // maximum number of queued values
  }

  /**
   * Get the number of values currently in the queue.
   * @returns {number} - the number of values currently in the queue.
   */
  get length () { return this.queue.length }

  /**
   * Get the maximum number of values that the queue can hold.
   * @returns {number} - the maximum number of values
   */
  get maxLength () { return this.maxQueueSize }

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
   * `queue.length < queue.maxLength` again.
   *
   * Once the queue fills, backpressure is provided by the iterating code. Stopping
   * the iterating code will stop the queue from emptying.
   *
   * @param {any} value - to be pushed into iterable
   * @returns {number} - the number of values in the queue at the end of the call
   * @throws {QueueFull} - if queue.length === queue.maxLength
   * @throws {QueueDone} - if queue.done() was called previously
   */
  push (value) {
    if (!this.keepGoing) throw new QueueDone('Queue done, cannot push new values')
    if (this.pushedValue) { // indicates iterator is blocked waiting for input
      this.pushedValue(value)
      this.pushedValue = null
    } else { // queue not empty, so can just append pushed value
      if (this.queue.length >= this.maxQueueSize) {
        throw new QueueFull(`Cannot push to Queue, maximum queue length of ${this.maxQueueSize} reached`)
      }
      this.queue.push(value)
    }
    return this.queue.length
  }

  /**
   * Complete the iteration. By default any values in the queue will
   * be provided to the iterator before completion.
   *
   * @param {boolean} emptyQueue - if true, empty the queue before ending,
   * otherwise end immediately.
   */
  done (emptyQueue = true) {
    this.keepGoing = false
    if (emptyQueue === false) this.queue = new List()
    if (this.pushedValue != null) {
      this.pushedValue(new QueueDone('Queue stopped by user'))
      this.pushedValue = null
    }
  }

  /**
   * Implements Iterator protocol to make Queue a Generator.
   */
  async next () {
    // Check for queue.length is so that queue empties before iteration completes.
    if (this.keepGoing || this.queue.length > 0) {
      if (this.queue.length > 0) {
        return Promise.resolve(this.queue.shift()).then(value => ({ value, done: false }))
      } else {
        // Promise resolves when Queue.push or Queue.done is called
        return new Promise((resolve) => { this.pushedValue = resolve })
          .then(value => {
            if (value instanceof QueueDone) return { done: true }
            return { value, done: false }
          })
      }
    }
    return { done: true }
  }

  /**
   * Iterable protocol implementation.
   *
   * @returns {Generator} - this queue instance is the Generator.
   * @example
   * const queue = new Queue()
   * queue.push(5)
   * // call done to complete iteration. Otherwise, it will just wait for more pushes
   * queue.done()
   * (async () => {
   *   // [Symbol.asyncIterator] at top of for await ...of loop
   *   for await (const value of queue) {
   *     console.log(value)
   *   }
   * })() // IIFE
   */
  [Symbol.asyncIterator] () {
    return this
  }
}
