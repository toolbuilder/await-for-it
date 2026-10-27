# Await-For-It Package Documentation

`@toolbuilder/await-for-it` is the primary entry point for the package. It exports a chainable API, a functional API, and support classes and utility functions.

Typically, callers iterate an `AsyncIterable` one item at a time — waiting for each `iterator.next()` `Promise` to settle before calling `next()` again (as `for await...of` does). When consuming upstream iterables, every generator, transform, and reducer in this package follows that one-at-a-time convention. However, the `AsyncIterable` protocol also permits callers to invoke `next()` multiple times without waiting, and all async iterables produced by this package safely queue and handle concurrent `next()` calls as well.

In addition, an upstream iterator's `next()` method typically should not be called again before yielding the current value downstream. Operating this way automatically applies backpressure to any upstream iterable. All iterables in this package apply backpressure once their concurrency limits are met. For example, once full, [`pool`](./ChainableClass.md#pool) waits until an active task settles and yields before calling `next()` again.

`Await-For-It` accepts both async and sync iterables as input. However, once you enter Promise-land, you can't go back to synchronous iteration. You can use [`chunk`](./ChainableClass.md#chunk) to group values into arrays for batch processing. If you only need synchronous iterables, try [IterableFu](https://www.npmjs.com/package/iterablefu). Both packages use the same names for their async/sync counterparts where it makes sense — for example, `zipAll` works the same way in both, whereas `pool` does not exist in `IterableFu`.

## Chainable API, Classes, and Utilities

* [chainable](./chainable.md) - the primary factory function (with static generator methods) for creating chainable async iterables.
* [ChainableClass](./ChainableClass.md) - the class instantiated by `chainable` (for `new`, subclassing, and `instanceof` checks).
* [Poll](./poll.md) - periodically calls a function and provides the resolved values as an async iterable.
* [Queue](./queue.md) - synchronously push values into an async iterable one at a time.
* [QueueDone](./queue.md#push) - `Error` subclass thrown by `Queue.push` after `done()` or `reject()` has been called.
* [QueueFull](./queue.md) - `Error` subclass available for custom bounded `QueueBuffer` implementations to throw when full.
* [callWithTimeout](./timeouts.md#callwithtimeout) - create a `Promise` that calls `timeoutFunction` if `promiseFunction` does not settle before `timeoutDuration` milliseconds.
* [wait](./timeouts.md#wait) - create a `Promise` that resolves after `ms` milliseconds.
* [waitToCall](./timeouts.md#waittocall) - wait `ms` milliseconds before calling a function and resolving with its result.
* [makeChainableFactory](./makechainable.md#makechainablefactory) - dynamically create a chainable factory function with static generator methods.
* [makeChainableClass](./makechainable.md#makechainableclass) - dynamically create a `ChainableClass`. Differs from `makeChainableFactory` only in that the returned class requires `new` and cannot be called as a function.
* [makeFactory](https://github.com/toolbuilder/make-factory) - re-exported from `@toolbuilder/make-factory` to wrap a class constructor (such as a `ChainableClass` subclass) in a callable factory function; see [customization](./customization.md#extending-chainable).
* [iteratorFrom](./iteratorfrom.md) - obtain an iterator when you don't know whether an iterable is async or sync (prefers `[Symbol.asyncIterator]` when an object implements both).
* [isAsyncIterable](./is.md#isasynciterable) - test whether a value supports asynchronous iteration (`[Symbol.asyncIterator]`).
* [isSyncIterable](./is.md#issynciterable) - test whether a value supports synchronous iteration (`[Symbol.iterator]`).
* [isFunction](./is.md#isfunction) - test whether a value is a callable function (excluding ES6 `class` constructors).
* [isString](./is.md#isstring) - test whether a value is a primitive `string` or boxed `String` object.
* [shouldIterate](./is.md#shoulditerate) - test whether a value should be flattened by flatten transforms (respecting `Symbol.isConcatSpreadable`).

## Functional API

The functional API documentation is listed below. In some cases, examples still show the chainable API; remember that all functional transforms and reducers take the iterable as their last parameter. Use your favorite functional library to curry and pipe as you wish.

* [generators](./generators.md) - create sequences of data
* [transforms](./transforms.md) - transform sequences of data
* [reducers](./reducers.md) - reduce or control sequences of data
