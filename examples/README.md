# Examples

This directory contains executable examples demonstrating common concurrency patterns with `await-for-it`.

## Running the Examples

You can run each example individually using `node`:

```bash
node examples/quick-start.js
node examples/catch-and-finally.js
node examples/polling.js
node examples/queues.js
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
* [polling.js](polling.js) - Periodic polling governed by iterator backpressure with `Poll`.
* [queues.js](queues.js) - Event queues with `Queue` bridging push-to-pull data sources and pub/sub.
* [pseudo-threads.js](pseudo-threads.js) - Starting, stopping, and awaiting iterators externally with `run()`.
* [node-streams.js](node-streams.js) - Using `chainable` with Node.js `Readable` streams and `stream.pipeline`.

