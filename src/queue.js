import { List } from '@toolbuilder/list/src/list.js'

export class QueueDone extends Error {}
export class QueueFull extends Error {}
export class QueueIteratingAlready extends Error {}
/**
 * Push values into an asyncIterable one at a time. This lets you process data
 * from other sources such as event handlers and callbacks. Values are queued
 * if the iterator isn't ready for them yet.
 *
 * You must call done() to complete the iteration.
 */
// TODO: Make Queue a Generator
export class Queue {
  /**
   * Create a Queue.
   * @param {Number} maxQueueSize - the maximum size of the queue
   */
  constructor (maxQueueSize = 100000) {
    this.keepGoing = true
    this.inputResolve = null
    this.inputReject = null
    this.queue = new List()
    this.maxQueueSize = maxQueueSize
    this.iterating = false
  }

  /**
   * Get the number of values currently in the queue.
   * @returns {Number} - the number of values currently in the queue.
   */
  get length () { return this.queue.length }

  /**
   * Get the maximum number of values that the queue can hold.
   * @returns {Number} - the maximum number of values
   */
  get maxLength () { return this.maxQueueSize }

  /**
   * Push a value to the async iterable. Values are queued if the
   * iterator (pulling values from queue) isn't ready yet.
   *
   * If you push a Promise, it must resolve before it can be yielded
   * to the iterator, and the queue could back up behind it. To get
   * around this, push a function that returns the Promise
   * (e.g `queue.push(() => promise)`), and feed the queue output
   * to a pool (e.g `pool(10, queue)`). Or use `PromiseWithTimeout`.
   *
   * If push throws QueueFull, you can still push values once
   * `queue.length < queue.maxLength` again.
   *
   * Once the queue fills, backpressure is provided by the iterator. Stopping
   * the iterator will stop the queue from emptying.
   *
   * @param {any} value - to be pushed into iterable
   * @returns {Number} - the number of values in the queue at the end of the call
   * @throws {QueueFull} - if queue.length === queue.maxLength
   * @throws {QueueDone} - if queue.done() was called previously
   */
  push (value) {
    if (this.keepGoing) {
      if (this.inputResolve) { // indicates queue is empty and blocked waiting for input
        this.inputResolve(value)
        this.inputResolve = null
        this.inputReject = null
      } else { // queue not empty, so can just append
        if (this.queue.length >= this.maxQueueSize) {
          throw new QueueFull(`Cannot push to Queue, maximum queue length of ${this.maxQueueSize} reached`)
        } else {
          this.queue.push(value)
        }
      }
    } else {
      throw new QueueDone('Queue done, cannot push new values')
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
    if (this.inputReject != null) {
      this.inputReject(new QueueDone('Queue stopped by user'))
      this.inputResolve = null
      this.inputReject = null
    }
  }

  /**
   * Create an async iterable that provides the values pushed into the queue, and that completes
   * when Queue.done() is called. This function may only be called once per Queue instance.
   *
   * @returns {AsyncIterable} - an async iterable that provides the values pushed into the queue
   * @throws {QueueIteratingAlready} - if this method was already called on the Queue instance.
   * @example
   * const queue = new Queue()
   * // provide some mechanism to push values to queue here, then iterate
   * for await (const value of queue) { // <- this is where [Symbol.asyncIterator] is called
   *   console.log(value)
   * }
   */
  async * [Symbol.asyncIterator] () {
    // Because there is only one pair of this.inputResolve and this.inputReject, there can be only one iterator.
    // Not clear what multiple iterators would mean anyway.
    if (this.iterating) throw new QueueIteratingAlready('Queue[Symbol.asyncIterator] has been called before')
    this.iterating = true
    while (this.keepGoing || this.queue.length > 0) {
      if (this.queue.length > 0) {
        yield this.queue.shift()
      } else {
        try {
          // Promise resolves when a value has been pushed, or rejected when user calls done
          yield await new Promise((resolve, reject) => { this.inputResolve = resolve; this.inputReject = reject })
        } catch (error) {
          // TODO: this is broken! Doesn't actually stop anything
          if (!(error instanceof QueueDone)) throw error // unclear how this would throw
        } finally {
          this.inputResolve = null
          this.inputReject = null
        }
      }
    }
  }
}
