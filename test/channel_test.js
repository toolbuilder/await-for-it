import { test as tape } from 'zora'
// import mississippi from 'mississippi'
import { chainable } from '../src/chainable.js'
import { Poll } from '../src/poll.js'

// Event handler events into async iterable

// Async function returning batches, wait for queue to: empty, half-full, etc.

// deduplication, priority queues, etc. Things that need to operate over window

// debounce, dropping (if queue full, don't push), etc. Seems to be popular concept

// history queue? Maybe persistent?

tape('polling with functions', async test => {
  // count stands in as some useful application state you want to poll
  let count = 0
  const fn = () => count++ // function can be async or synchronous
  const poll = new Poll(fn, 100)
  await chainable(poll)
    .take(5) // limit the length of the resulting sequence
    .forEach(value => console.log(`polling with sync function, value ${value}`))
  poll.done()
  test.ok(true)
})

// ping-pong

// Split/tee whatever

// pub-sub
