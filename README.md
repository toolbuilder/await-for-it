# Await-For-It

`Await-For-It` implements common concurrency patterns using async iterables. The iterables are chainable for ease of use. Or you can use the functional, data-last API.

## Features

* Event queues - push events or other data into an async iterable: [Queue](docs/queue.md)
* Pub/Sub - fork an async iterable to multiple consumers, register subscribers at any time: [Publish](docs/ChainableClass.md#publish)
* Task pool - process up to `n` tasks at a time: [Pool](docs/ChainableClass.md#pool)
* Chunk - group results into chunks, with timeouts for partial chunks, for efficient batch processing: [Chunk](docs/ChainableClass.md#chunk)
* Join - two iterables should advance together: [Zip](docs/chainable.md#zip)
* Merge - Merge multiple async/sync iterables with each going as fast as possible: [Merge](docs/ChainableClass.md#merge)
* Throttle - limit the processing rate of an async iterable: [Throttle](docs/ChainableClass.md#throttle)
* Polling - execute a task periodically with backpressure from an async iterable that is processing the results: [Poll](docs/poll.md)
* Start/Stop iterables from **outside** the iterable, like a pseudo-thread: [Run](docs/ChainableClass.md#run)
* Node Streams - works out of the box because Node streams are async iterables now: [Node Streams](examples/node-streams.js). Also see [streams.pipeline](https://nodejs.org/api/stream.html#stream_stream_pipeline_source_transforms_destination_callback) method.
* Chainable - chain operations such as map, reduce, filter, throttle, and zip: [ChainableClass](docs/ChainableClass.md#zip)
* Functional - all operations have a functional 'data last' equivalent via separate imports
* Catch/Finally - just like Promises, except for streams of Promises: [Catch](docs/ChainableClass.md#catch)
* Customizeable - add/remove methods, and support your bundler's tree-shaking: [Customize](docs/customization.md)

If you just want synchronous iterables try [IterableFu](https://github.com/toolbuilder/iterablefu).

## Installation

```bash
npm install --save @toolbuilder/await-for-it
```

## Getting Started

If you want the chainable API, use this import.

```javascript
import { chainable }  from '@toolbuilder/await-for-it'
```

If you want the functional API, use this import.

```javascript
import { generators, transforms, reducers }  from '@toolbuilder/await-for-it'
```

Users of both API styles will probably want other methods and classes from the main package such as:

```javascript
import { Poll, Queue, callWithTimeout } from '@toolbuilder/await-for-it'
```

## API

### Chainable API

* module entry point is [here](docs/await-for-it.md)
* The bulk of the chainable documentation is [here](docs/ChainableClass.md).

### Functional API

The chainable API is dynamically created from the functional API when `Await-For-It` is loaded. Underneath, the methods are the same.

* module entry point is the same of course: [here](docs/await-for-it.md)
* [generators](docs/generators.md) - create sequences of data
* [transforms](docs/transforms.md) - transform sequences of data
* [reducers](docs/reducers.md) - reduce or control sequences of data

The documentation is in progress. Sometimes the functional API examples show chainable API use. Sometimes it is the other way around. I will continue improving - especially in areas where you provide feedback.

### Customization

`Await-For-It` works with your generators and iterables. It is also possible to add or remove methods from `Await-For-It` to suit your needs. See [customization](docs/customization.md).

## Examples

Here is a quick set of [examples](examples).

## Breaking Changes

* `2.0.0` -
  * **Pure ESM Package**: Dropped CommonJS build and dual-package setup in favor of pure ECMAScript Modules (ESM). Node.js 22+ (and 20.17+) can `require()` synchronous ESM directly; older environments (Node < 20.17) require dynamic `import()`.
  * **Exception Handling, Fail-Fast Validation & Resource Cleanup**:
    * **Eager parameter validation**: Transform, generator, reducer, timeout, and chainable functions now validate parameters eagerly at invocation time (throwing `TypeError` or `RangeError` synchronously) rather than deferring errors until the generator is first iterated. Passing invalid arguments to functions such as `chunk`, `flattenUnordered`, `pool`, `take`, `throttle`, `timeouts`, `chainable`, `catch`, `finally`, or reducers now fails fast at the call site.
    * **Automatic iterator cleanup (`return()`) on early exit or failure**: Concurrent operations (`merge`, `zip`, `zipAll`, `flattenUnordered`, `chunk`) now strictly adhere to the iterator return protocol. When iteration terminates early (via `break`, `return`, `take()`, or when an exception occurs in any stream), `.return()` is automatically called on all active underlying iterators. For generator functions, this transfers control to their `finally` blocks to release resources (file descriptors, sockets, timers). In `flattenUnordered`, remaining child iterables further down the stream are never pulled or initiated.
    * **Unhandled rejection prevention**: In concurrent operations racing multiple iterators or timeouts (`merge`, `zip`, `zipAll`, `flattenUnordered`, `chunk`), errors from sibling iterables and in-flight background promises are safely caught and propagated through iteration, preventing `unhandledRejection` events from crashing the process.
    * **Queue rejection**: Calling `queue.reject(err)` now wakes awaiting iterators immediately to reject, preventing hangs on empty queues. Falsy exception values (such as `0`, `''`, `false`, `null`, `undefined`, `NaN`) are properly preserved and thrown. Pushing to a queue after `reject()` now throws `QueueDone`.
    * **Synchronous exception safety in timeouts & callbacks**: `callWithTimeout` and `waitToCall` now guarantee timer cleanup when the wrapped function throws synchronously, preventing timer leaks and hung event loops. `publish` snapshots subscribers during dispatch so synchronous subscriber throws fail fast without corrupting internal state.
    * **Controller lifecycle (`RunController` and `PublishController`)**: The `.running` property reliably becomes `false` when iteration finishes, aborts on error, or is cancelled. Added a `.finished` promise (resolves on completion, rejects on stream error) and a `.cancel()` method for explicit cancellation.
  * **Flatten Transforms (`flatten`, `flattenRecursive`, `flattenUnordered`)**:
    * **Non-flattened built-in types**: In addition to strings, built-in value and dictionary/collection types that implement iteration (`TypedArray`, Node.js `Buffer`, `Map`, `URLSearchParams`, `Headers`, and `FormData`) are no longer flattened by default. They are preserved intact as atomic values.
    * **`Symbol.isConcatSpreadable` support**: Explicit opt-in or opt-out of flattening is now supported on any object via `[Symbol.isConcatSpreadable]: true` or `false`.
    * **Eager validation and cleanup in `flattenUnordered`**: Validates `maxPoolSize` (must be an integer $\ge 1$) and iterable inputs upfront, and safely closes all active child iterators and the input stream if an error or early termination occurs.
  * **TypeScript Types**:
    * **First-class declarations**: Fully typed modern `.d.ts` declaration files are included directly in the package, verified with `tsc`, `publint`, and `@arethetypeswrong/cli`.
    * **Factory typing for `chainable`**: `chainable` is typed strictly as a factory function and cannot be invoked with `new`.
    * **Precise tuple and predicate inference**: `zip` and `zipAll` infer exact mapped tuple types (e.g., `AsyncGenerator<[number, string]>`) instead of loose arrays, and `filter` supports TypeScript type-guard predicates (`(value: T) => value is S`).
    * **Exported types**: Core helper types including `ChainableClass`, `QueueBuffer<T, ShiftReturn>`, `RunController`, and `PublishController` are now re-exported from the package root.
  * **Behavioral "Gotchas" & Parameter Changes**:
    * **`range` follows Python semantics**: The argument signature changed from `range(start, length[, increment])` to `range(stop)` or `range(start, stop[, step])`. A step of `0` now throws a `RangeError`.
    * **`take(0)`**: Correctly yields an empty sequence (0 items) instead of yielding 1 item.
    * **`iteratorFrom` dual-iterable priority**: When an object implements both `[Symbol.asyncIterator]` and `[Symbol.iterator]`, `iteratorFrom` now prefers `[Symbol.asyncIterator]` (matching JavaScript's native `for await...of` semantics) instead of `[Symbol.iterator]`.
    * **`filter` and `reject` truthiness**: Predicate checks evaluate truthiness (`Boolean(fn(value))`) rather than requiring strict boolean `true` (`fn(value) === true`), aligning with standard `Array.prototype.filter`.
    * **`Poll` lifecycle & detached callbacks**: `Poll` instances are strictly single-use and cannot be re-iterated once completed. Callback functions are invoked detached without `this` bound to `Poll`, and calling `poll.done()` aborts pending sleep delays immediately.

## Alternatives

`Await-For-It` is focused on solving common asynchronous patterns with asynchronous iterables. There are many other packages that solve common asynchronous patterns without async iterables. There are also a number of packages that provide async iterable support, but don't seem to fully support async concurrency patterns.

There are lots of packages that support synchronous iterables, but that doesn't help with concurrency. For example, [Iterablefu](https://github.com/toolbuilder/iterablefu) is the synchronous version of `Await-For-It`.

There are popular `Observable` libraries. I worked with [RxJs](https://rxjs.dev/guide/observable) and [Kefir](https://kefirjs.github.io/kefir/) before writing `Await-For-It`. `Observables` use a push model, and async iterables use a pull model. `Await-For-It` provides [Queue](docs/queue.md) to bridge from push to pull.

Node streams are now async iterables, so this isn't an either/or decision. The [pipeline](https://nodejs.org/api/stream.html#stream_piping_to_writable_streams_from_async_iterators) method might be all you need.

`Promise` chains work just fine if you don't need to control the number of active tasks, or need to run the tasks sequentially.

`for await` loops are perfect when you don't need to relax that 'one-at-a-time' behavior. But when you refactor a bunch of nested loops they'll look a lot like the functional or chainable API of `Await-For-It`.

## Contributing

Contributions are welcome. Please create a pull request.

## Issues

This project uses Github issues.

## License

MIT
