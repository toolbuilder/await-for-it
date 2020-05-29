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

The iterating code provides backpressure, and can stop function calls by stopping iteration.

### Parameters

*  `maxPoolSize` **[Number][3]** maximum number of pending promises at any given time
*  `iterable` **(AsyncIterable | Iterable)** input iterable, should yield async functions for pool
    to work as intended.
*  Returns **AsyncGenerator** a generator that provides the output values as they occur
*  Throws **Error** if iterable throws, or if any functions yielded by iterable throws, or if any
    Promise in the pool rejects, the exception will be caught and rethrown by pool, so that the
    iterating code can handle it. Once an exception is thrown, the iterator is done.

Here is an example using `chainable`, which provides the iterator parameter for you.

```javascript
import { chainable, callWithTimeout } from '@toolbuilder/await-for-it'
import { someAsyncFunction, someIterableDataSource } from 'your-code'

const control = chainable(someIterableDataSource)
  // consider using callWithTimeout to handle non-reponsive calls
  .map(data => async () => someAsyncFunction(data)) // map data to a zero parameter function
  .pool(10) // run up to 10 functions at a time
  .callNoAwait(console.log) // log the results as they come in
  .catch(err => yourErrorHandler(err))
  .finally(() => someCleanupCode())
  .run()

// ...Later in an event handler you can stop processing if you like. Finally will be called.
control.stop()
```

[3]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number
