# Queue

Use `Queue` to synchronously push values into an asyncIterable. This lets you process data sources like event handlers and callbacks sequentially in an asyncIterable. You can even push in other iterables and later use `flatten` to get a stream of individual values. Pushed values are buffered until the consumer awaiting the iterator processes them.

> **Note:** A `Queue` is designed for a single consumer stream. Multiple concurrent consumers iterating the same `Queue` instance are not supported.

An executable example demonstrating how to configure `Queue` with an external buffer (`RingBuffer`), process data using `chainable`, control backpressure with an iterator controller, and handle completion is available in [`examples/queue-ring-buffer.js`](../examples/queue-ring-buffer.js).

The queue is waiting for you to push values into it, and has no idea when you are done pushing data. You **must call done()** to finish the iterator in order for 'finally' methods to be called.

Since `Queue.push(x)` is synchronous, you can easily fill up the queue's buffer before downstream code can process the data. You can control how Queue deals with buffered data by supplying your own buffer. There are ready-made options:

* [RingBuffer](https://github.com/toolbuilder/ring-buffer) - `RingBuffer` drops the oldest data when the capacity is reached. This is a good way of getting rid of older unprocessed mouse events. Because it allocates memory up front, it should only be used for smaller capacities.
* [DynamicRingBuffer](https://github.com/toolbuilder/dynamic-ring-buffer) - Also drops the oldest data when capacity is reached. However, you can specify very large capacities because DynamicRingBuffer allocates and releases chunks of memory as needed. In practice, if you specify a very large capacity, the `DynamicRingBuffer` will act like an `Array`, and never drop data.
* [PriorityBuffer](https://github.com/toolbuilder/priority-buffer) - `PriorityBuffer` implements a simplistic fixed-length priority queue. Your comparator function is used for prioritization.
* `Array` - An empty `Array` is the default. `Array` never drops data. However, it works the garbage collector harder than `DynamicRingBuffer` because it is not optimized for operations that add or remove values to the front of the buffer.

To provide your own buffer, you must implement three members that match the structural interface (`QueueBuffer`):

* `length` attribute - provides the number of values currently in the buffer (`number`)
* `push(value)` method - pushes a value onto the back of the buffer, and returns buffer length (`(value: T) => number`)
* `shift()` method - removes a value from the front of the buffer, and returns that value or `undefined` if empty (`() => T | undefined`)

**Note: as of 1.0.0**, the Queue interface has changed. Queue no longer throws a `QueueFull` exception when the buffer fills up. That behavior prevented the intentional data dropping behavior that ring buffers provide. If you want an exception when the buffer is full, the buffer implementation must throw it. `Await-For-It` still exports the `QueueFull` Error object if you want to use that. Also, Queue no longer accepts a number as the constructor parameter. It must be a buffer object or omitted.

## Constructor

- `buffer` **QueueBuffer** (optional, default `[]`): A buffer to store values before they are processed by the iterator. By default, this is an empty `Array`.
- Throws **TypeError** if `buffer` is provided and is not a valid `QueueBuffer` object.

## length

Property returns the number of elements currently in the buffer.

## reject

Terminate iteration over the queue iterator by rejecting any waiting iteration promise and throwing an exception in the consumer iterable chain. Once rejected, the queue will not accept further pushes.

> **Note:** For the behavior when a Promise *pushed into the queue* rejects (as opposed to calling `queue.reject()`), see [Promise Rejection Behavior](#promise-rejection-behavior).

- `exception` **any** typically an instance of `Error`

```javascript
const queue = new Queue()
const controller = chainable(queue).catch(e => console.log(e.message)).run()

// Abort iteration with an error
queue.reject(new Error('something failed'))
```

See [queue-reject.js](../examples/queue-reject.js) for an executable example demonstrating `reject()`, push lockout (`QueueDone`), and recovering unconsumed items from the buffer.

## push

Push a value to the async iterable. Values are buffered until the iterator can process them.

If you push a Promise, it must resolve before it can be yielded to the consumer awaiting the iterator, and the buffer could back up behind it. If you need to preserve order in the sequence, there is no way around this. Consider using [callWithTimeout](./timeouts.md) so that the iterator does not get stuck. See [Promise Rejection Behavior](#promise-rejection-behavior) for details on what happens if a pushed Promise rejects.

If order does not need to be preserved, push a function that returns the Promise (e.g `queue.push(() => promise)`), and feed the queue output to a pool (e.g `pool(10, queue)`).

The rate at which the buffer empties is governed by backpressure from the consumer awaiting the iterator. If the consumer pauses or stops, values remain buffered until consumption resumes.

- `value` **any** to be pushed into iterable
- Throws **QueueDone** if `queue.done()` or `queue.reject()` was called previously
- Returns **[number][15]** the number of values in the queue at the end of the call

## done

Complete the iteration. By default any values in the queue will be provided to the iterator before completion.

- `emptyQueue` **[boolean][16]** (optional, default `true`): if `true`, drain the queue before ending; otherwise discard any values in the queue, and end immediately.
- Throws **TypeError** if `emptyQueue` is provided and is not a boolean.

## [Symbol.asyncIterator]

AsyncIterable protocol implementation.

```javascript
const queue = new Queue()
queue.push(5)
// Signal that no more items will be pushed.
// Buffered values are drained before iteration completes.
queue.done()

for await (const value of queue) {
  console.log(value)
}
```

Returns an **AsyncGenerator** yielding values from the queue.

## Promise Rejection Behavior

When a Promise is pushed into the queue (`queue.push(promise)`), it is placed into the buffer synchronously. Because `Queue` is an async generator, it yields buffered values sequentially (`yield buffer.shift()`). In JavaScript, yielding a Promise inside an async generator automatically awaits its resolution before delivering the value to the consumer.

### What Happens When a Queued Promise Rejects

1. **Error Propagation**: When the generator yields a rejected Promise, awaiting it causes the rejection error to be thrown at the `yield` statement.
2. **Iteration Aborts**: The thrown error terminates the async iterator and propagates directly to the consumer:
   - In a `for await...of` loop, the loop terminates and throws the rejection error.
   - In a `chainable(queue)` pipeline, downstream `.catch()` handlers receive the error.
3. **Subsequent Buffered Values Are Not Yielded**: Because the unhandled error terminates the async generator, any remaining items still waiting in the buffer will not be processed by that iterator.

```javascript
import { Queue } from '@toolbuilder/await-for-it'

const queue = new Queue()

queue.push(Promise.resolve('first'))
queue.push(Promise.reject(new Error('something failed')))
queue.push(Promise.resolve('third'))
queue.done()

try {
  for await (const value of queue) {
    console.log(value) // logs 'first'
  }
} catch (error) {
  console.error(error.message) // logs 'something failed'
  // Iteration terminated; 'third' is not yielded
}
```

See [queue-exceptions.js](../examples/queue-exceptions.js) for an executable example demonstrating exception handling and buffer preservation across downstream errors and rejected promises.

### Contrast with `queue.reject()`

Pushing a Promise that rejects is different from calling `queue.reject(error)`:

- **`queue.reject(error)`**: Explicitly faults and terminates the queue itself. It immediately rejects any currently waiting iterator promises and prevents any further pushes (`queue.push()` will throw `QueueDone`).
- **Rejected Promise in Buffer**: The queue instance itself is not marked as faulted or closed (`queue.keepGoing` remains `true`, and subsequent `queue.push()` calls will not throw `QueueDone`). However, the active consumer iterator has already aborted and cannot resume.

### Strategies to Prevent Premature Termination

If individual task failures should not terminate the consumer stream:

- **Catch errors at the Promise level**: Attach a `.catch()` handler before or when pushing so that the Promise resolves to a fallback value or an error result object:
  ```javascript
  queue.push(riskyOperation().catch(error => ({ error })))
  ```
- **Push task functions and use a pool**: If ordering does not need to be strictly preserved, push factory functions (`queue.push(() => riskyOperation())`) and feed the queue to a concurrency pool like `pool(concurrency, queue)`. Errors can then be caught per task without breaking the queue pipeline.

---

## Examples

Executable examples demonstrating `Queue` patterns are available in the [`examples`](../examples) directory:

- [RingBuffer and Consumer Backpressure](../examples/queue-ring-buffer.js) - Queue with `RingBuffer`, pausing/resuming consumption with an iterator controller, and graceful draining.
- [Exception Handling & Buffer Preservation](../examples/queue-exceptions.js) - Demonstrates that when downstream processing throws or a queued promise rejects, the underlying buffer remains uncorrupted and can be inspected or reused for recovery.
- [Queue Rejection & Error Abort](../examples/queue-reject.js) - Explicitly terminating iteration with `queue.reject()`, push lockout (`QueueDone`), and recovering unprocessed items from the buffer.
- [Event Queues & Pub/Sub](../examples/queues.js) - Bridging push-to-pull data sources and pub/sub.

[15]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number

[16]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean
