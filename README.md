# Await-For-It

`Await-For-It` implements common concurrency patterns using async iterables. The iterables are chainable for ease of use. Or you can use the functional, data-last API.

The AsyncIterable protocol provides a 'one-at-a-time' pull model. With typical implementations, this provides sequential serialization, and applies automatic backpressure. With a bit of effort, you can relax the sequential requirement within a given iterator to provide concurrency. That's what this package does.

The AsyncIterable protocol intends callers to wait for the returned Promise to resolve before calling `next` again. The protocol doesn't require this, but all iterables in this package implement this behavior.

In addition, `next` typically should not be called before yielding the current value. Operating this way automatically applies backpressure to any upstream iterable. All the iterators in this package behave this way once their concurrency limits are met. For example, once full, the pool will wait until a task resolves before calling next again.

`Await-For-It` handles both async and sync iterables. However, once you enter the Promise-land, you can't go back. You could use the `chunk` transform for synchronous batch processing. If you want synchronous iterables try [IterableFu](https://www.npmjs.com/package/iterablefu). Both packages use the same names for the async/sync counterparts. For example, `zipAll` works the same way, but one is synchronous and this one asynchronous.

## Features

* Event queues - push events or other data into an async iterable
* Task pool - process up to 'n' tasks at a time, and process the results in an async iterable
* Pub/Sub - fork an async iterable to multiple consumers, register subscribers at any time
* Start/Pause/Resume/Stop for iterables from **outside** the iterable - like a psuedo thread
* Try/Catch/Finally - just like Promises, except for streams of Promises
* Polling - execute a task periodically with backpressure, and process results in an async iterable
* Throttle - limit the processing rate of an async iterable
* Merge - Merge multiple async/sync streams as each stream resolves values
* Concatenate - Combine multiple async/sync streams end to end
* Chunk - group results into chunks, with timeouts for partial chunks, for efficient batch processing
* Node Streams - works out of the box because Node streams are async iterables now.
* Chainable - chain operations such as map, reduce, filter, throttle, and zip
* Functional - all operations have a functional 'data last' equivalent via separate imports

In addition, the chainable implementation makes it easy to add or subtract methods from the chainable interface. This lets you reduce bundle size by providing only those iterables that you use. The package is about 3.4kb minimized and gzipped

## Installation

```bash
npm install --save await-for-it
```

## Getting Started

If you want the chainable API, use this import.

```javascript
import { chainable } from 'await-for-it'
```

If you want the functional API, use this import.

```javascript
import { generators, transforms, reducers } from 'await-for-it'
```

## API

* The bulk of the documentation is [here](docs/chainable.md).
* The event queue documentation is [here](docs/queue.md).
* The polling documentation is [here](docs/poll.md).

The documentation is in progress, and is currently all jumbled together because of the process used to generate it. The examples are for the chainable API which doesn't need the last 'iterable' parameter. However, the parameter listings for each method are for the 'data-last' functional API, and include the 'data-last' iterable as the last parameter. My apologies for the mess.

## Examples

```javascript
import { chainable } from 'await-for-it'

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
  import { chainable } from 'await-for-it'

  chainable([0, 1, 2, 3])
    .catch(error => { /* do something */ }) // stops iteration
    .finally(() => ++testValue) // always called even if there is an error
    .runAwait() // Run the iterator to completion, like a pseudo thread
```

### Polling

```javascript
import { chainable, Poll } from 'await-for-it'

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
import { chainable, Poll, Queue } from 'await-for-it'

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
import { chainable } from 'await-for-it'

const controller = chainable([0, 1, 2, 3, 4])
  .callAwait(async x => doSomething(x))
  .run() // we're off and running now

if (controller.running) controller.stop()
controller.start()
```
