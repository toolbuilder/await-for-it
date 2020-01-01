# Asynckronus

`Asynckronus` supports async patterns using async iterables. It provides a task pool, event queuing,
pub/sub, polling, batching, along with chainable operations such as map, reduce, filter, throttle, and zip.

The library also provides a functional, 'data last', API. The library is about 3.4kb minimized and gzipped.

It provides a chainable class factory so you can easily add methods or reduce bundle size.

If you want synchronous iterables try [IterableFu](https://www.npmjs.com/package/iterablefu).

## Features

* Push events into an iterable with [Queue](docs/queue.md) : `queue.push(event)`
* Execute tasks in an iterable chain with [Pool](docs/pool.md).
* Batch data with timeouts [Chunk](docs/chunk.md): `chainable(recordByRecord).chunk(50, 1000).forEach(writeBatch)`.
* Merge iterables with [Merge](docs/merge.md).
* Publish/Subscribe [PubSub](docs/pubsub.md).
* Polling functions [Polling](docs/polling.md).
* Serialization
* Chainable: `chainable([0, 1, 2]).map(x => 2*x).toArray()`.
* Chained exception handling and finally: `chainable([0, 2]).catch(handlerFunction).finally(cleanupFunction).run()`.
* Start and stop iteration [Processes](docs/processes.md)
* Works with your generators (and iterables): `chainable(yourGenerator()).mapWith(yourTransformGenerator)`.
* [Customizable](docs/customize.md), to add methods or reduce bundle sizes.
* Functional API takes data last, so you can curry, pipe and compose with your functional library.
* Written in ES6 javascript using ES6 modules.

## Table of Contents

<!-- !toc (minlevel=2 omit="Features;Table of Contents") -->

* [Installation](#installation)
* [Getting Started](#getting-started)
* [API](#api)
* [Examples](#examples)
  * [Basics](#basics)
  * [One Time Use](#one-time-use)
  * [Iterablefu and Your Generators](#iterablefu-and-your-generators)
* [Smaller Bundles](#smaller-bundles)
* [Customization](#customization)
* [When To Use](#when-to-use)
* [Alternatives](#alternatives)
* [Contributing](#contributing)
* [Issues](#issues)
* [License](#license)

<!-- toc! -->

## Installation

```bash
npm install --save asynckronus
```

Access UMD packages and map files from [unpkg](https://unpkg.com).

```html
<script src="https://unpkg.com/asynckronus/umd/asynckronus.min.js"></script>
<script src="https://unpkg.com/asynckronus/umd/asynckronus.js"></script>
```

Both UMD packages create a global variable `asynckronus`.

## Getting Started

If you want the chainable API, use this import.

```javascript
import { chainable } from 'asynckronus'
```

If you want the functional API, use this import.

```javascript
import { generators, transforms, reducers } from 'asynckronus'
```

## API

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

## License

## TODO

Check out this fork of emittery which links event handling to async stream: <https://github.com/lorenzofox3/emittery>

<https://nolanlawson.com/2019/08/11/high-performance-input-handling-on-the-web/>

Promise callback is also called a `microtask`. Microtasks execute immediately after any synchronous execution is complete. There’s no chance to fit in any work between the two. So if you think you can break up a long-running task by separating it into microtasks, then it won’t do what you think it’s doing. <https://nolanlawson.com/2018/09/01/a-tour-of-javascript-timers-on-the-web/>

## Note

If both Node and the bundler use `package.json` "module", then the package has to be isomorhic without a build step. The
bundler can define a variable that would otherwise be undefined, and do 'tree shaking'. I think that variable would commonly
be `process.browser`. This is undefined for Node.

## Use Cases

### Event Handlers

If you want an event to trigger an asynchronous process, you could use a Promise chain to handle events. However, if you want to handle the events in order, or want to throttle events, an iterable chain is helpful.

Event Handler -> Queue -> further async processing

### Task Execution

Pool: primary use case is that you want to execute a number of promise chains, but you want to limit the number running at
any given time, or you want to handle the resolved values as a stream of data.

Chunk: you want to group values or promise resolutions for processing as a group, like a single batch HTTP PUT of multiple values. Also, if you don't want a particular value to sit around too long, the timeout lets you ensure liveness.

Queue: you want to process values from some other source, like an event handler, in an async stream of data.

You want to restructure promise chains to async streams. Should show how this looks. Especially since a Promise has
to catch errors or the whole chain blows up. Use async functions. What about a 'transaction'? The async functions handle
the if/then dynamic length issues that require recursion in promise chains. Does chainable notation really help? Or is it
just different.

Promise result to iterable: Promise.then(result => queue.push(result))
Query parameters to iterable: queue.push(queryData)
Periodic execution to iterable: poll(asyncFunction, 1000)
Task pool: pool(n, asyncIterable)
Throttling: throttle(asyncIterable, wait)
