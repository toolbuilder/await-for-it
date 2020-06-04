# Await-For-It

`Await-For-It` implements common concurrency patterns using async iterables. The iterables are chainable for ease of use. Or you can use the functional, data-last API.

JavaScript's async iterable protocol provides nice guaranteed 'one-at-a-time' serialization for async processes. Unlike individual `Promise` calls and `Observables`, async iterables automatically provide backpressure, without buffering problems, when downstream processing is going slowly. However, sometimes you want to relax that 'one-at-a-time' constraint in places (e.g. `task pools`). Also, it would be nice to easily:

* feed async data into an iterable (e.g. [polling](docs/poll.md) and [event queues](docs/queue.md))
* publish to multiple subscribers (e.g. [pub/sub](docs/ChainableClass.md#publish))
* control the async processing (e.g. [stop/start](docs/ChainableClass.md#run))
* cleanup when done ([finally](docs/ChainableClass.md#finally))
* catch errors ([catch](docs/ChainableClass.md#catch))
* use common functions such as zip, merge, map, filter, reduce, toArray, and [more](docs/ChainableClass.md).

`Await-For-It` provides these things for your code.

If you just want synchronous iterables try [IterableFu](https://github.com/toolbuilder/iterablefu).

## Features

* Event queues - push events or other data into an async iterable: [Queue](docs/queue.md)
* Task pool - process up to `n` tasks at a time: [Pool](docs/ChainableClass.md#pool)
* Pub/Sub - fork an async iterable to multiple consumers, register subscribers at any time: [Publish](docs/ChainableClass.md#publish)
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

## Why Not Something Else

`Promise` chains work just fine if you don't need many of the features in the feature list above.

`Await-For-It` is focused on solving common asynchronous patterns with asynchronous iterables. There are many other packages that solve common asynchronous patterns without async iterables. There are also a number of packages that provide async iterable support, but don't provide a number of the features listed above. And of course, there are lots of packages that support synchronous iterables. [Iterablefu](https://github.com/toolbuilder/iterablefu) is the synchronous version of `Await-For-It`.

There are popular `Observable` libraries too. I worked with [RxJs](https://rxjs.dev/guide/observable) and [Kefir](https://kefirjs.github.io/kefir/) before writing `Await-For-It`. After working with both, I strongly prefer async generators and iterators to `Observables`. Here's why:

* As a JavaScript developer, you already need to learn how to use async iterables.
* Async iterables are literally iterables that return Promises, so the mental model is simpler.
* The async iterator protocol automatically applies back pressure. Compare to [this](https://codeburst.io/a-look-at-back-pressure-and-its-handling-in-rxjs-5bc8f04a2e8f) for RxJs.
* Async iterables have direct support in the language: async generators, `yield *`, async functions, Promises, etc.
* Async iterables work directly with synchronous iterables as input

Node streams are now async iterables, so this isn't an either/or decision. The [pipeline](https://nodejs.org/api/stream.html#stream_piping_to_writable_streams_from_async_iterators) method might be all you need.
