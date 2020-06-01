# Await-For-It

`Await-For-It` implements common concurrency patterns using async iterables. The iterables are chainable for ease of use. Or you can use the functional, data-last API.

JavaScript's async iterable protocol provides nice guaranteed 'one-at-a-time' serialization for async processes. Unlike individual Promise calls, async iterables automatically provide backpressure, without buffering problems, when downstream processing is going slowly. However, sometimes you want to relax that 'one-at-a-time' constraint in places (e.g. `task pools`). Also, it would be nice to easily:

* feed async data into an iterable (e.g. polling and event queues)
* publish to multiple subscribers (e.g. pub/sub)
* control the async processing (e.g. stop/start)
* cleanup when done (finally)
* catch errors (catch)
* use common functions such as zip, merge, map, filter, reduce, toArray, and [more](docs/ChainableClass.md).

`Await-For-It` provides these things for your code.

If you just want synchronous iterables try [IterableFu](https://github.com/toolbuilder/iterablefu).

## Features

* Event queues - push events or other data into an async iterable: [Queue](docs/queue.md)
* Task pool - process up to `n` tasks at a time: [Pool](docs/pool.md)
* Pub/Sub - fork an async iterable to multiple consumers, register subscribers at any time: [Publish](docs/ChainableClass.md)
* Start/Stop iterables from **outside** the iterable, like a pseudo-thread: [Run](docs/ChainableClass.md)
* Catch/Finally - just like Promises, except for streams of Promises: [ChainableClass](docs/ChainableClass.md)
* Polling - execute a task periodically with backpressure from an async iterable: [Poll](docs/poll.md)
* Throttle - limit the processing rate of an async iterable: [ChainableClass](docs/ChainableClass.md)
* Merge - Merge multiple async/sync streams with each going as fast as possible: [ChainableClass](docs/ChainableClass.md)
* Chunk - group results into chunks, with timeouts for partial chunks, for efficient batch processing: [ChainableClass](docs/ChainableClass.md)
* Node Streams - works out of the box because Node streams are async iterables now. Also see `streams.pipeline` method.
* Chainable - chain operations such as map, reduce, filter, throttle, and zip: [ChainableClass](docs/ChainableClass.md)
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

* entry point is [here](docs/await-for-it.md)
* The bulk of the chainable documentation is [here](docs/ChainableClass.md).

### Functional API

The chainable API is dynamically created from the functional API when `Await-For-It` is loaded. Underneath, the methods are the same.

* entry point is the same of course [here](docs/await-for-it.md)
* [generators](docs/generators.md) - create sequences of data
* [transforms](docs/transforms.md) - transform sequences of data
* [reducers](docs/reducers.md) - reduce or control sequences of data

The documentation is in progress. Sometimes the functional API examples show chainable API use. Sometimes it is the other way around. I will continue improving - especially in areas where you provide feedback.

## Examples

Here are some quick examples.

```javascript
import { chainable }  from '@toolbuilder/await-for-it'

chainable([0, 1, 2, 3, 4]) // factory method makes ChainableIteable instance
  .map(x => 2 * x)
  .throttle(100, 1000) // wait 1000ms to start, then yield every 100ms
  .callAwait(async (x) => someAsyncMethod(x)) // do something for every value
  .catch(error => handleTheError(error)) // Just like Promise.catch
  .finally(() => cleanup()) // always called even if there is an error
  .run() // run the iterable like a pseudo-thread, no await
```

### Catch and Finally

The `chainable` factory method dynamically creates a `ChainableIterable` from the functional API methods. However it adds in two methods to support error handling that aren't documented yet. The unit tests are in 'test/chainable_test.js'.

The `catch` and `finally` methods allow a cleaner syntax than writing a bunch of try/catch/finally blocks around iteration. Usage is quite similar to the `Promise` methods `catch` and `finally`. You can use multiple `catch` and `finally` calls in the same iterator.

```javascript
  import { chainable }  from '@toolbuilder/await-for-it'

  chainable([0, 1, 2, 3])
    .catch(error => { /* do something */ }) // stops iteration
    .finally(() => ++testValue) // always called even if there is an error
    .runAwait() // Run the iterator to completion, like a pseudo thread
```

### Polling

```javascript
import { chainable, Poll }  from '@toolbuilder/await-for-it'

// create a data source - could be events or whatever
// Polling will happen no faster than every 1000ms, but
// backpressure from the iterator can slow or stop polling.
let count = 0
const poll = new Poll(async () => count++, 1000)

await chainable(poll)
    .take(5) // stop polling after 5 numbers
    .runAwait() // start the polling process
// Poll is now stopped waiting for another next() call which will never come
// Ordinarily you would call done() when some event happens, like this...
  poll.done()
```

### Queues

Here's a stupid Queue example.

```javascript
import { chainable, Poll, Queue }  from '@toolbuilder/await-for-it'

// Make an event queue to handle the polled data
const queue = new Queue(10) // input buffer size is 10
// Build a processing chain for handling queue input
chainable(queue).map(x => 2 * x).run()

// Nothing is happening yet - need a data source...
let count = 0
const poll = new Poll(() => count++, 1000)
// start polling whether anybody is subscribed or not
const publisher = chainable(poll).publish()
publisher.subscribe(x => queue.push(x)) // feed data into queue

// Sometime later in response to some event...
poll.done() // stop polling
queue.done() // tell the iterator it is done, any queued values will still be processed
```

### Pseudo Threads

You can start and stop iterators, sort of like pseudo-threads. Here's a silly example.

```javascript
import { chainable }  from '@toolbuilder/await-for-it'

const controller = chainable([0, 1, 2, 3, 4])
  .callAwait(async x => doSomething(x))
  .run() // we're off and running now

if (controller.running) controller.stop()
controller.start()
```
