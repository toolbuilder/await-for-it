import { test } from 'zora'
import { chainable, Poll } from '../src/await-for-it'

// Event handler events into async iterable

// Async function returning batches, wait for queue to: empty, half-full, etc.

// deduplication, priority queues, etc. Things that need to operate over window

// debounce, dropping, throttling (if queue full, don't push), etc. Seems to be popular concept
// Based on https://nolanlawson.com/2019/08/11/high-performance-input-handling-on-the-web/
// Use requestAnimationFrame and requestPostAnimationFrame to trigger sampling of last value

// history queue? Maybe persistent?

test('polling with functions', async assert => {
  // count stands in as some useful application state you want to poll
  let count = 0
  const fn = () => count++ // function can be async or synchronous
  const poll = new Poll(fn, 100)
  await chainable(poll)
    .take(5) // limit the length of the resulting sequence
    .forEach(value => console.log(`polling with sync function, value ${value}`))
  poll.done()
  assert.ok(true)
})

// ping-pong

// Split/tee whatever

// pub-sub
