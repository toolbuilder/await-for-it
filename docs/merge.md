# merge

Merge the output of one or more async (or sync) iterables into a single async iterable. Each
async iterable is advanced as fast as possible, so that slow iterators do not hold
up faster ones. Equal speed iterables are advanced at roughly the same pace.

The iteration rate is governed by backpressure from the consumer awaiting the iterator:
upstream iterables are only advanced as downstream items are consumed, and stopping iteration
(such as via `break` or `cancel()`) halts all merged streams. Note that each merged stream can buffer
up to 1 resolved item while downstream work is taking place.

### Exception Handling & Resource Cleanup

- **Error Propagation & Peer Cleanup:** If any iterable throws an exception or rejects a promise, the exception is caught and rethrown to the consumer awaiting the iterator. All other remaining active iterables are cleanly closed by awaiting their `return()` methods via `Promise.allSettled`.
- **Early Termination Cleanup:** If iteration is stopped early (such as by breaking out of a `for await...of` loop, using a downstream operator like `take(n)`, or calling `return()` on the generator), all active iterables have their `return()` methods called so that underlying resources (file handles, network sockets, timers, database transactions) are properly released.
- **Unhandled Rejection Prevention:** In-flight background promises are safely tracked so that late rejections from abandoned streams (e.g. after early break or after another stream threw) do not trigger `UnhandledPromiseRejection` events.

### Parameters

- `iterables` **...(AsyncIterable | Iterable)** any number of sync or async iterables to be merged

### Returns

- **AsyncGenerator** merged iterables as an async iterable

### Throws

- **Error** if any iterable throws an error or rejects, the error will be caught, peer iterables will be closed, and the error will be rethrown.

### Example

```javascript
import { chainable } from '@toolbuilder/await-for-it'
import { someSlowIterable } from 'your-code'

const initialValues = [0, 1, 2]

chainable
  .merge(initialValues, someSlowIterable)
  .callAwait(async value => doSomething(value))
  .catch(err => console.error('Caught error from merged streams:', err))
  .finally(() => console.log('Cleaned up'))
  .run()

// In this case, because initialValues is synchronous, merge will fly through those first.
// If both iterables are async, then the results will be interleaved.
```
