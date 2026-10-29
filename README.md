# Await-For-It

> Controlled async concurrency with native JavaScript iterables.

Native `for await...of` is strictly one-at-a-time, while `Promise.all` fires everything at once. **`Await-For-It` bridges the gap**, providing bounded concurrency, rate limiting, and stream transformations with automatic backpressure—using standard async iterables. Available with both a chainable fluent API and a functional data-last API.

```javascript
import { chainable } from '@toolbuilder/await-for-it'

// Fetch items with controlled concurrency and automatic backpressure,
// then batch results for bulk processing:
for await (const batch of chainable(urls)
  .map(url => () => fetch(url).then(res => res.json()))
  .pool(5)         // run up to 5 requests concurrently
  .chunk(50, 1000) // batch into groups of 50 (or emit partial chunk after 1s)
) {
  await db.insertMany(batch) // pauses fetching while writing to DB
}
```

## Features

### Concurrency & Flow Control

* **Task Pool** – Process up to `n` concurrent async tasks with backpressure: [Pool](docs/pool.md)
* **Throttle** – Cap processing rates (e.g., API rate limits): [Throttle](docs/ChainableClass.md#throttle)
* **Chunk & Batch** – Group items into batches with idle timeouts for partial chunks: [Chunk](docs/chunk.md)
* **Event Queue** – Bridge push events to pull-based async iterables: [Queue](docs/queue.md)
* **Pub/Sub** – Broadcast one async iterable to multiple independent consumers: [Publish](docs/ChainableClass.md#publish)
* **Merge & Zip** – Interleave multiple streams concurrently ([Merge](docs/merge.md)) or step through pairs ([Zip](docs/ChainableClass.md#zip))
* **Polling** – Run periodic tasks regulated by consumer processing speed: [Poll](docs/poll.md)
* **Lifecycle Control** – Start, pause, or cancel running iterables externally like a pseudo-thread: [Run](docs/ChainableClass.md#run)

### Developer Experience

* **Dual API Styles** – Choose between a fluent [Chainable API](docs/ChainableClass.md) (`chainable(source).map(...).pool(5)`) or tree-shakeable [Functional APIs](docs/transforms.md) (`generators`, `transforms`, `reducers`).
* **Native Stream Compatibility** – Interoperates seamlessly with Node.js streams and `stream.pipeline`: [Node Streams](examples/node-streams.js)
* **Async Error Handling** – Stream-level [Catch](docs/ChainableClass.md#catch) and [Finally](docs/ChainableClass.md#finally) handlers with guaranteed iterator cleanup.
* **Customizable** – Add, remove, or subclass methods to fit your domain: [Customization](docs/customization.md)

## Installation

```bash
npm install @toolbuilder/await-for-it
```

## Getting Started

`Await-For-It` provides two equivalent API styles with identical underlying capabilities:

### 1. Chainable API (Fluent)

Wraps any async or sync iterable into a chainable pipeline:

```javascript
import { chainable } from '@toolbuilder/await-for-it'

const results = await chainable([1, 2, 3, 4, 5])
  .map(x => () => fetchItem(x))
  .pool(2) // run up to 2 tasks concurrently
  .toArray()
```

### 2. Functional API (Data-Last)

Provides tree-shakeable, composable functions where the iterable is passed as the final argument:

```javascript
import { transforms, reducers } from '@toolbuilder/await-for-it'

const fetchTasks = transforms.map(x => () => fetchItem(x))
const poolTwo = transforms.pool(2)

const results = await reducers.toArray(
  poolTwo(fetchTasks([1, 2, 3, 4, 5]))
)
```

### Standalone Concurrency Primitives

Coordination primitives can be imported directly from the package root:

```javascript
import { Queue, Poll, callWithTimeout, wait } from '@toolbuilder/await-for-it'
```

## API Documentation

* [**Package Overview**](docs/await-for-it.md) – Root exports, type definitions, and architecture.
* [**Chainable API**](docs/ChainableClass.md) – Comprehensive reference for all chainable methods (`map`, `filter`, `pool`, `chunk`, `throttle`, `zip`, `merge`, `catch`, `finally`, `run`, etc.), created via [`chainable()`](docs/chainable.md).
* [**Functional API**](docs/transforms.md) – Standalone functions organized into:
  * [Generators](docs/generators.md) – Create sequences (`range`, `from`).
  * [Transforms](docs/transforms.md) – Transform sequences (`map`, `filter`, `pool`, `chunk`, `throttle`, `merge`, `zip`, `flattenUnordered`, etc.).
  * [Reducers](docs/reducers.md) – Terminal consumers (`toArray`, `forEach`, `reduce`, `publish`, `run`, `runAwait`).
* [**Concurrency Primitives**](docs/queue.md):
  * [`Queue`](docs/queue.md) – Thread-safe push-to-pull event queue with optional custom ring buffers.
  * [`Poll`](docs/poll.md) – Periodic task execution regulated by consumer backpressure.
  * [Timeouts & Delays](docs/timeouts.md) – Resilient async execution (`callWithTimeout`, `wait`, `waitToCall`).
* [**Customization & Subclassing**](docs/customization.md) – Add or remove methods, or subclass `ChainableClass` for your domain.

## Examples

Runnable code examples demonstrating task pools, streaming, error recovery, pseudo-threads, and ring buffers are in the [examples directory](examples/README.md).

## When to Use `Await-For-It` (and Alternatives)

Different async tools excel at different workloads:

| Approach | Best For | Trade-offs |
| :--- | :--- | :--- |
| **`Promise.all` / `p-limit`** | Simple batching of small, fixed arrays | No streaming or backpressure; large sets can exhaust memory. |
| **Native `for await...of`** | Strictly sequential async processing | Cannot run concurrent tasks, pool promises, or interleave streams without complex boilerplate. |
| **RxJS / Observables** | Complex, push-based reactive UI event streams | Heavyweight footprint; steep learning curve; operates on push streams rather than standard JavaScript async iterables. |
| **Node.js Streams (`stream.pipeline`)** | Raw binary/byte I/O streams | Heavier stream API compared to lightweight JavaScript iterators (though `Await-For-It` interoperates with them out of the box). |
| **Synchronous Iterables ([IterableFu](https://github.com/toolbuilder/iterablefu))** | Purely CPU-bound, in-memory synchronous operations | Synchronous counterpart to this library; does not support Promises or concurrency. |
| **`Await-For-It`** | Bounded concurrency, pooling, batching, and rate limiting with backpressure | Designed for async iterables; once in an async pipeline, values cannot be pulled synchronously. |

### Key Architectural Concepts

* **Backpressure**: **Backpressure** is the mechanism that prevents fast data producers from overwhelming slow consumers. In `Await-For-It`, data flows through a **pull-based model**: the consumer awaiting the iterator (via `for await...of`, `await iterator.next()`, or terminal reducers like `forEach` and `toArray`) dictates the pace of execution. Upstream sources and transforms do not produce or pull the next item until the downstream consumer is ready to receive it.
  * **Generators and Transforms**: Every generator and transform in this library honors backpressure. Even concurrent operations like `pool`, `chunk`, `merge`, and `flattenUnordered` strictly cap their in-flight tasks and pause upstream intake until downstream processing catches up.
  * **Pausing & Stopping**: Pausing (e.g. via controller `.stop()`) or exiting iteration early (e.g. via `break`, `take(n)`, or controller `.cancel()`) immediately halts upstream production and releases resources via `.return()`.
  * **Reducers**: Most reducers (`forEach`, `reduce`, `toArray`, `run`, `runAwait`) apply backpressure by awaiting each step before requesting the next item. The sole exception is `publish`, which broadcasts to subscribers without awaiting them.
* **Pull vs. Push**: Observables and event emitters push data as soon as it arrives, which can buffer uncontrollably and exhaust memory if the consumer is slower than the producer. Async iterables invert this relationship: the consumer pulls data on demand, providing natural backpressure. `Await-For-It` provides [`Queue`](docs/queue.md) to safely buffer and bridge push-based event sources (like Node `EventEmitter`s or socket events) into pull-based pipelines.
* **Node.js Streams Interoperability**: Because Node.js streams implement `Symbol.asyncIterator`, `Await-For-It` works directly with [`stream.pipeline`](https://nodejs.org/api/stream.html#stream_stream_pipeline_source_transforms_destination_callback) and readable streams without adapters.

## Breaking Changes

* `2.0.0` -
  * **Pure ESM Package**: Dropped CommonJS build and dual-package setup in favor of pure ECMAScript Modules (ESM). Node.js 22+ (and 20.17+) can `require()` synchronous ESM directly; older environments (Node < 20.17) require dynamic `import()`.
  * **Exception Handling, Fail-Fast Validation & Resource Cleanup**:
    * **Eager parameter validation**: Transform, generator, reducer, timeout, and chainable functions now validate parameters eagerly at invocation time (throwing `TypeError` or `RangeError` synchronously) rather than deferring errors until the generator is first iterated. Passing invalid arguments to functions such as `chunk`, `flattenUnordered`, `pool`, `take`, `throttle`, `timeouts`, `chainable`, `catch`, `finally`, or reducers now fails fast at the call site.
    * **Automatic iterator cleanup (`return()`) on early exit or failure**: Concurrent operations (`merge`, `zip`, `zipAll`, `flattenUnordered`, `chunk`) now strictly adhere to the iterator return protocol. When iteration terminates early (via `break`, `return`, `take()`, or when an exception occurs in any stream), `.return()` is automatically called on all active underlying iterators. For generator functions, this transfers control to their `finally` blocks to release resources (file descriptors, sockets, timers). In `flattenUnordered`, remaining child iterables further down the stream are never pulled or initiated (see [flatten-unordered-task-tracking.js](examples/flatten-unordered-task-tracking.js) to track and recover unstarted or interrupted tasks with `mapWith`).
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

## Contributing

Contributions are welcome. Please create a pull request.

## Issues

This project uses Github issues.

## License

MIT
