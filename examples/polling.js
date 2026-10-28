import { chainable, Poll } from '@toolbuilder/await-for-it'

// Create a data source - could be events, database queries, sensor readings, etc.
// Polling will happen no faster than the target period (50ms here; e.g. 1000ms in production),
// but backpressure from the iterator can slow or stop polling.
let count = 0
const poll = new Poll(async () => {
  const value = count++
  console.log(`Polled: ${value}`)
  return value
}, 50)

await chainable(poll)
  .take(5) // stop polling after 5 numbers
  .runAwait() // start the polling process

// Poll is now stopped waiting for another next() call which will never come.
// Ordinarily you would call done() when some event happens, like this:
poll.done()
console.log('Polling completed.')

