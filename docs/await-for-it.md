# Await-For-It Package Documentation

`await-for-it` is the primary entry point for the package. It exports a chainable API, a functional API, and various support classes.

  * [chainable](./chainable.md) - the primary chainable interface
  * [ChainableClass](./ChainableClass.md) - the class returned by `chainable`
  * [Poll](./poll.md) - Periodically calls a function and provides the resolved values as an iterator.
  * [Queue](./queue.md) - Push values into an asyncIterable one at a time.
  * [callWithTimeout](./timeouts.md) - Create a Promise that calls a timeoutFunction if the promiseFunction does not resolve before
timeoutDuration milliseconds.
  * [wait](./timeouts.md) - Create a promise that resolves after `ms` milliseconds.
  * [waitToCall](./timeouts.md) - Wait before calling a function and returning the resolved value.
  * [makeChainableFactory](./makechainable.md) - Dynamically create a ChainableIterable class/function.
  * [makeChainableClass](./makechainable.md) - Dynamically create a ChainableClass. This differs from makeChainableFactory only in that the class can't be called as a Function.
