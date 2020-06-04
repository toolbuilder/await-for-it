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
// You will want to provide your own buffer to
// control the Queue's buffer behavior.
const queue = new Queue()
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
