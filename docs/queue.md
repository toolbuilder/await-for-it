# Queue

Push values into an asyncIterable one at a time. This lets you process data
from other sources such as event handlers and callbacks. Values are queued
if the iterating code isn't ready for them yet.

You must call done() to finish the iterator in order for 'finally' methods to be called.

## Constructor

-   `buffer` **(RingBuffer | [Number][15])** if buffer is a number, it specifies the size of the
    internal buffer. Otherwise buffer is treated as the buffer itself. (optional, default `new RingBuffer(1000)`)

`RingBuffer` is documented [here](https://github.com/toolbuilder/ring-buffer). You can provide your own 'RingBuffer' implementation. The key is the 'capacity' property. Here's an example using 'Array':

```javascript
// Alternate ring buffer implementation
// Array is about 10x slower than RingBuffer for the push/shift use case.
class ArrayBuffer extends Array {
  constructor (capacity) {
    super()
    this.capacity = capacity
  }
}
```


## length

Property returns the number of elements currrently in the buffer. Ranges from 0 to 'capacity'

## capacity

Property returns the maximum number of elements that the buffer will hold.

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

Push a value to the async iterable. Values are queued if the
iterator (pulling values from queue) isn't ready yet.

If you push a Promise, it must resolve before it can be yielded
to the iterating code, and the queue could back up behind it. If
you need to preserve order in the sequence, there is no way around
this. Consider using [callWithTimeout](./timeouts.md) so that the queue does not
block permanently.

If order does not need to be preserved, push a function that returns
the Promise (e.g `queue.push(() => promise)`), and feed the queue output
to a pool (e.g `pool(10, queue)`).

If push throws QueueFull, you can still push values once
`queue.length < queue.capacity` again.

Once the queue fills, backpressure is provided by the iterating code. Stopping
the iterating code will stop the queue from emptying.


-   `value` **any** to be pushed into iterable
-   Throws **QueueFull** if queue.length === queue.capacity before the call
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
