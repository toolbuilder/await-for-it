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

The documentation is in progress, and is currently all jumbled together because of the process used to generate it. The examples are for the chainable API which doesn't need the last 'iterable' parameter. However, the parameter listing for each method are for the 'data-last' functional API, and include the 'data-last' iterable as the last parameter. My apologies.

## Examples

### Event Handling

The [Queue](docs/queue.md) lets you insert data into an asynchronous iterable while it is iterating.

Here's an example that uses the standard [EventListener](https://dom.spec.whatwg.org/#interface-eventtarget)
interface.

```javascript
import { chainable, Queue } from 'asynckronus'

// Event handler class that uses the DOM EventListener interface
class Handler = {
  constructor (currentTarget) {
    this.queue = new Queue(20) // buffer is 20 elements long
    this.processor = chainable(this.queue).forEach(event => doSomething(event))
    currentTarget.addEventListener('click', this)
  }

  handleEvent(e) {
    this.queue.push(e)
  }

  done() { this.queue.done() }
}

const handler = new Handler(document.body)
```

### Batching

Sometimes batching data is more efficient, but waiting for a complete batch might take too long to support
liveness. [Chunk](docs/chunk.md) supports batching with timeout to support that use case.

```javascript
import { chainable } from 'asynckronus'

const controller = chainable(yourDataSource)
  .chunk(100, 1000) // process in batches of 100, or every 1000ms
  .map(yourBatchFunction)
  .catch(yourExceptionHandler)
  .finally(yourCleanupCode)
  .run()

// Elsewhere you can control process execution
if (controller.running) controller.stop()
controller.start()
```

### Back Pressure


## Smaller Bundles

## Customization

## Alternatives

## Contributing

## Issues
