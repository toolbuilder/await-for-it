import tape from 'tape'
// import mississippi from 'mississippi'
import { chainable } from '../src/chainable.js'
import { Queue } from '../src/queue.js'

const makeSlowAsyncFunction = (score) => {
  const delay = 100
  const promiseCount = score.promises++
  return () => { score.calls++; return new Promise(resolve => setTimeout(() => { score.resolves++; resolve(promiseCount) }, delay)) }
}

// Event handler events into async iterable

// Async function returning batches, wait for queue to: empty, half-full, etc.

// deduplication, priority queues, etc. Things that need to operate over window

// debounce, dropping (if queue full, don't push), etc. Seems to be popular concept

tape('polling with functions', async test => {
  // count stands in as some useful application state you want to poll
  let count = 0
  const fn = () => count++ // function can be async or synchronous
  await chainable.poll(fn, 100, false)
    .take(5) // limit the length of the resulting sequence
    .forEach(value => console.log(`polling with sync function, value ${value}`))
  test.end()
})

// ping-pong

// Split/tee whatever

// pub-sub
