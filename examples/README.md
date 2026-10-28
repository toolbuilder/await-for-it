# Examples

This directory contains executable examples demonstrating common concurrency patterns with `await-for-it`.

## Running the Examples

You can run each example individually using `node`:

```bash
node examples/quick-start.js
node examples/catch-and-finally.js
node examples/pool.js
node examples/polling.js
node examples/poll-indefinite.js
node examples/poll-backpressure.js
node examples/poll-finite.js
node examples/queues.js
node examples/queue-ring-buffer.js
node examples/queue-exceptions.js
node examples/queue-reject.js
node examples/pseudo-threads.js
node examples/node-streams.js
```

Or verify that all examples run without error via the npm script:

```bash
npm run test:examples
```

## Example Index

* [quick-start.js](quick-start.js) - Overview of the chainable API: mapping, throttling, async callbacks, error handling, and pseudo-thread execution.
* [catch-and-finally.js](catch-and-finally.js) - Error handling with `catch` and resource cleanup with `finally` on async iterables.
* [pool.js](pool.js) - Concurrent task execution with `pool`, showing how to wrap promises in functions for async iterators.
* [polling.js](polling.js) - Periodic polling governed by iterator backpressure with `Poll`.
* [poll-indefinite.js](poll-indefinite.js) - Polling indefinitely until `poll.done()` is called externally.
* [poll-backpressure.js](poll-backpressure.js) - Backpressure control: pausing and resuming polling with an iterator controller.
* [poll-finite.js](poll-finite.js) - Finite polling with `take()` to collect a fixed number of samples into an array.
* [queues.js](queues.js) - Event queues with `Queue` bridging push-to-pull data sources and pub/sub.
* [queue-ring-buffer.js](queue-ring-buffer.js) - Queue with `RingBuffer`, controller pause/resume backpressure, and graceful draining.
* [queue-exceptions.js](queue-exceptions.js) - Downstream exceptions and promise rejections with `Queue`, showing that the provided buffer remains intact, uncorrupted, and reusable for recovery.
* [queue-reject.js](queue-reject.js) - Explicitly aborting a queue with `queue.reject()`, push lockout behavior, and recovering unprocessed items from the buffer.
* [pseudo-threads.js](pseudo-threads.js) - Starting, stopping, and awaiting iterators externally with `run()`.
* [node-streams.js](node-streams.js) - Using `chainable` with Node.js `Readable` streams and `stream.pipeline`.

