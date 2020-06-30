# Await-For-It

`Await-For-It` implements common concurrency patterns using async iterables. The iterables are chainable for ease of use. Or you can use the async generators on their own with the functional, data-last API.

## Features

* Event queues - push events or other data into an async iterable: [Queue](docs/queue.md)
* Task pool - process up to `n` tasks at a time: [Pool](docs/ChainableClass.md#pool)
* Pub/Sub - fork an async iterable to multiple consumers, register subscribers at any time: [Publish](docs/ChainableClass.md#publish)
* Join - two iterables should advance together: [Zip](docs/chainable.md#zip)
* Start/Stop iterables from **outside** the iterable, like a pseudo-thread: [Run](docs/ChainableClass.md#run)
* Catch/Finally - just like Promises, except for streams of Promises: [Catch](docs/ChainableClass.md#catch)
* Polling - execute a task periodically with backpressure from an async iterable: [Poll](docs/poll.md)
* Throttle - limit the processing rate of an async iterable: [Throttle](docs/ChainableClass.md#throttle)
* Merge - Merge multiple async/sync streams with each going as fast as possible: [Merge](docs/ChainableClass.md#merge)
* Chunk - group results into chunks, with timeouts for partial chunks, for efficient batch processing: [Chunk](docs/ChainableClass.md#chunk)
* Node Streams - works out of the box because Node streams are async iterables now. Also see [streams.pipeline](https://nodejs.org/api/stream.html#stream_stream_pipeline_source_transforms_destination_callback) method.
* Chainable - chain operations such as map, reduce, filter, throttle, and zip: [ChainableClass](docs/ChainableClass.md#zip)
* Functional - all operations have a functional 'data last' equivalent via separate imports
* Customize - add/remove methods, and support your bundler's tree-shaking: [Customize](docs/customization.md)

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

## Examples

Here is a quick set of [examples](docs/examples.md)

## Breaking Changes

After the 1.0.0 changes, there should be no breaking changes going forward.

* `1.0.0` -
  * See the updated [docs](docs/queue.md).
  * `Queue` no longer throws `QueueFull` when the buffer reaches capacity. That's properly the buffer's job.
  * `Queue` constructor no longer accepts a `Number` to specify buffer capacity. The constructor only accepts a buffer.
  * `Queue` the default buffer is an empty `Array` although that is probably not what you want.
  * `Queue` no longer provides a `capacity` property
  * `RingBuffer` is no longer exported by `Await-For-It`. It is now [here](https://github.com/toolbuilder/ring-buffer).
  * `Semaphore` and `Mutex` are no longer exported by `Await-For-It`. If you really need them they are [here](https://github.com/toolbuilder/semaphore).

## Alternatives

`Await-For-It` is focused on solving common asynchronous patterns with asynchronous iterables. There are many other packages that solve common asynchronous patterns without async iterables. There are also a number of packages that provide async iterable support, but don't seem to fully support async concurrency patterns.

There are lots of packages that support synchronous iterables, but that doesn't help with concurrency. For example, [Iterablefu](https://github.com/toolbuilder/iterablefu) is the synchronous version of `Await-For-It`.

There are popular `Observable` libraries. I worked with [RxJs](https://rxjs.dev/guide/observable) and [Kefir](https://kefirjs.github.io/kefir/) before writing `Await-For-It`. After working with both, I strongly prefer async generators and iterators to `Observables`. Here's why:

* As a JavaScript developer, you already need to learn async iterables. Learning `Observables` is extra work.
* Async iterables are literally iterables that return Promises, so the mental model is simpler.
* The async iterator protocol automatically applies back pressure. Compare to [this](https://codeburst.io/a-look-at-back-pressure-and-its-handling-in-rxjs-5bc8f04a2e8f) for RxJs.
* Async iterables have direct support in the language: async generators, `yield *`, async functions, Promises, etc.
* Async iterables work directly with synchronous iterables as input since JavaScript handles that for you.

`Observables` use a push model, and async iterables use a pull model. `Await-For-It` provides [Queue](docs/queue.md) to bridge from push to pull. You might also look at [emittery](https://github.com/sindresorhus/emittery).

Node streams are now async iterables, so this isn't an either/or decision. The [pipeline](https://nodejs.org/api/stream.html#stream_piping_to_writable_streams_from_async_iterators) method might be all you need.

`Promise` chains work just fine if you don't need to control the number of active tasks, or need to run the tasks sequentially.

`for await` loops are perfect when you don't need to relax that 'one-at-a-time' behavior. But when you refactor a bunch of nested loops they'll look a lot like the functional or chainable API of `Await-For-It`.
