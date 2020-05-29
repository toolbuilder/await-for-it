# Await-For-It Package Documentation

`await-for-it` is the primary entry point for the package. It exports a chainable API, a functional API, and various support classes.

The AsyncIterable protocol intends callers to wait for the returned Promise to resolve before calling `next` again. The protocol doesn't require this, but all iterables in this package implement this behavior.

In addition, an iterator's `next` method typically should not be called before yielding the current value. Operating this way automatically applies backpressure to any upstream iterable. All the iterators in this package behave this way once their concurrency limits are met. For example, once full, the pool will wait until a task resolves before calling next again.

`Await-For-It` handles both async and sync iterables. However, once you enter Promise-land, you can't go back. You could use the [chunk](./ChainableClass.md) to chunk values for batch processing. If you want synchronous iterables try [IterableFu](https://www.npmjs.com/package/iterablefu). Both packages use the same names for the async/sync counterparts where it makes sense. For example, `zipAll` works the same way, but one is synchronous and this one asynchronous. However, `pool` does not exist in `Iterablefu`.


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
  * [iteratorFrom](./iteratorfrom.md) - Sometimes you need an iteratore, but don't know if the iterable is sync or async. This function figures it out, and returns what you need.

  The functional API documentation is listed below. In some cases, the examples still use the chainable API instead of the functional API. Just remember that all transforms and reducers take an iterable as the last parameter when using the functional API. Use your favorite functional package to curry and pipe as you wish.

  * [generators](./generators.md) - create sequences of data
  * [transforms](./transforms.md) - transform sequences of data
  * [reducers](./reducers.md) - reduce or control sequences of data
