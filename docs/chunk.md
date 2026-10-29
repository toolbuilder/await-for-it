# chunk

Chunk every n items into an array, and output that array in the output sequence.
Chunks are yielded after `timeout` milliseconds even if not full, so that values
can be processed in a timely manner. Never yields empty chunks.

The iteration rate is governed by backpressure: input items are only pulled and
chunked as the consumer awaits each chunk. Stopping iteration stops chunking and
cleanly closes the input iterable.

-   `n` **number** size of arrays (must be an integer `>= 1`; throws `RangeError` otherwise)
-   `timeout` **number** milliseconds before yielding a partial chunk if not full (must be a finite number `>= 0`; throws `RangeError` otherwise)
-   `iterable` **(AsyncIterable | Iterable)** the iterable to chunk (throws `TypeError` otherwise)

Returns **AsyncGenerator** that provides each chunk in order

```javascript
const chunks = await chainable([0, 1, 2, 3, 4]).chunk(2, 100).toArray()
console.log(chunks) // prints [[0, 1], [2, 3], [4]]
```

