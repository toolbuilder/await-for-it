# Queue

Use `Queue` to synchronously push values into an asyncIterable. This lets you process data sources like event handlers and callbacks sequentially in an asyncIterable. You can even push in other iterables and later use `flatten` to get a stream of individual values. Pushed values are buffered until the downstream iterating code can process them.

Here's an example.

```javascript
import { chainable, Queue } from '@toolbuilder/await-for-it'
import { RingBuffer } from '@toolbuilder/ring-buffer'

// Setup queue to keep only the most recent 100 data values.
// Older values that have not been processed yet are quietly dropped.
// This behavior is provided  by RingBuffer. Other buffers behave differently.
const queue = new Queue(new RingBuffer(100))

// setup an async iterator to handle the input
const controller = chainable(queue)
  // make database or HTTP call, use 'pool' if result order not important
  .map(async (value) => goGetData(value))
  // process the result asynchronously
  .map(async (result) => processData(result))
  .catch(error => handleErrors(error))
  .finally(async () => doSomeCleanup())
  .run()

// You can stop/resume the chainable iterator if you need to.
// You can still push to the queue while chainable is stopped
if (controller.running) controller.stop()
controller.start()

// Somewhere else, such as an 'application done' event, tell the
// Queue that it is done so that the chainable finally method is called
// By default all values in the buffer are processed before iteration stops.
queue.done()


// Elsewhere, you can also pass an exception to the queue, so that the async
// iterator will handle it asynchronously.
queue.exception(new YourError(someData))
// The .catch() method in the chainable above will now get
// YourError, and iteration will stop

```

The queue is waiting for you to push values into it, and has no idea when you are done pushing data. You **must call done()** to finish the iterator in order for 'finally' methods to be called.

Since `Queue.push(x)` is synchronous, you can easily fill up the queue's buffer before downstream code can process the data. You can control how Queue deals with buffered data by supplying your own buffer. There are a few ready made options.

* [RingBuffer](https://github.com/toolbuilder/ring-buffer) - `RingBuffer` drops the oldest data when the capacity is reached. This is a good way of getting rid of older unprocessed mouse events. Because it allocates memory up front, it should only be used for smaller capacities.
* [DynamicRingBuffer](https://github.com/toolbuilder/dynamic-ring-buffer) - Also drops the oldest data when capacity is reached. However, you can specify very large capacities because DynamicRingBuffer allocates and releases chunks of memory as needed. In practice, if you specify a very large capacity, the `DynamicRingBuffer` will act like an `Array`, and never drop data.
* [PriorityBuffer](https://github.com/toolbuilder/priority-buffer) - `PriorityBuffer` implements a simplistic fixed length priority queue. Your comparator function is used for prioritization.
* `Array` - An empty `Array` is the default. `Array` never drops data. However, it works the garbage collector harder than `DynamicRingBuffer` because it is not optimized for operations that add or remove values to the front of the buffer.

To provide your own buffer, you must implement three methods. Those methods need to match the signature (but not the behavior) of `Array`.

* `length` attribute - provides the number of values currently in the buffer
* `push(value)` method - pushes a value onto the back of the buffer, and returns buffer length
* `shift()` method - removes a value from the front of the buffer, and returns that value.

**Note: as of 1.0.0**, the Queue interface has changed. Queue no longer throws a `QueueFull` exception when the buffer fills up. That behavior prevented the intentional data dropping behavior that ring buffers provide. If you want an exception when the buffer is full, the buffer implementation must throw it. `Await-For-It` still exports the `QueueFull` Error object if you want to use that. Also, Queue no longer accepts a number as the constructor parameter. It must be a buffer object, or null.

## Constructor

-   `buffer` **(Buffer)** A buffer to store values before they are processed by the iterator. By default, this is just an empty `Array`. However, this is probably not what you want. See the general `Queue` documentation for more on buffers.

## length

Property returns the number of elements currrently in the buffer. Ranges from 0 to 'capacity'

## reject

Terminate iteration over the queue iterator by rejecting the Promise for
the next element. In other words, throw an exception in the iterable chain.

-   `exception` **any** typically an instance of 'Error'

```javascript
const queue = new Queue()
await chainable(queue).catch(e => console.log(e)).runAwait()
queue.reject(new Error('error')) // prints Error from the catch clause above
```

## push

Push a value to the async iterable. Values are buffered until the
iterator can process them.

If you push a Promise, it must resolve before it can be yielded
to the iterating code, and the buffer could back up behind it. If
you need to preserve order in the sequence, there is no way around
this. Consider using [callWithTimeout](./timeouts.md) so that the
iterator does not get stuck.

If order does not need to be preserved, push a function that returns
the Promise (e.g `queue.push(() => promise)`), and feed the queue output
to a pool (e.g `pool(10, queue)`).

Backpressure on the buffer is provided by the iterating code. Stopping
the iterating code will stop the buffer from emptying.


-   `value` **any** to be pushed into iterable
-   Throws **QueueDone** if queue.done() was called previously

Returns **[number][15]** the number of values in the queue at the end of the call

## done

Complete the iteration. By default any values in the queue will
be provided to the iterator before completion.

-   `emptyQueue` **[boolean][16]** if true, empty the queue before ending,
    otherwise discard any values in the queue, and end immediately. (optional, default `true`)

## next

Implements Iterator protocol to make Queue an iterator.

## asyncIterator

Iterable protocol implementation.

```javascript
const queue = new Queue()
queue.push(5)
// call done to complete iteration. Otherwise, it will just wait for more pushes
queue.done()
(async () => {
  // JavaScript runtime calls [Symbol.asyncIterator] at top of for await ...of loop
  for await (const value of queue) {
    console.log(value)
  }
})() // IIFE
```

Returns **Generator** this queue instance is the Generator.


[15]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number

[16]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean
