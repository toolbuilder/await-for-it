# pool

Execute functions provided by input iterable. Returns results as they resolve, with
no more than `maxPoolSize` promises pending at any time. Results may be out of order with
respect to the input order.

The input iterable can yield anything but constructor functions (i.e. something that requires the 'new' keyword).
However, async and sync functions are handled specially. Each function will be called, and the result placed into
the pool to be yielded when resolved. Promises will remain in the pool until they resolve,
other values will resolve immediately as you would expect. Consider using [callWithTimeout](./timeouts.md),
or your own favorite timeout promise to deal with non-responsive function calls.

As always with async iterables, if the input iterable yields a Promise, pool must wait
until the Promise resolves before advancing the input iterable. This
defeats the purpose of pool. So if you need to yield a promise from input iterator,
wrap it with a function like so: `() => promise`. Pool will call the function to get
the Promise, then advance the input iterable to get the next value.

The iteration rate is governed by backpressure from the consumer awaiting the iterator:
new tasks are only pulled from the input iterable as earlier tasks resolve and are consumed.
Stopping iteration prevents further function calls and cleanly closes the input stream.

### Parameters

*  `maxPoolSize` **[Number][3]** maximum number of pending promises at any given time
*  `iterable` **(AsyncIterable | Iterable)** input iterable, should yield async functions for pool
    to work as intended.
*  Returns **AsyncGenerator** a generator that provides the output values as they occur
*  Throws **Error** if iterable throws, or if any functions yielded by iterable throws, or if any
    Promise in the pool rejects, the exception will be caught and rethrown by pool, so that the
    consumer awaiting the iterator can handle it. Once an exception is thrown, the iterator is done.

## Examples

An executable example demonstrating `pool` and wrapping promises with functions is available in the [`examples`](../examples) directory:

- [Concurrent Task Pool](../examples/pool.js)

[3]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number
