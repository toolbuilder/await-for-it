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

// Note on state: Because take(5) breaks early after 5 items, the iterator return()
// protocol is invoked on the poll generator. Its finally block runs automatically,
// setting poll.isDone to true and clearing any sleep timers.
// Therefore, the polling iterable is already closed and terminated (poll.isDone === true),
// not waiting for another next() call.
// Calling poll.done() here is redundant (though safe). Ordinarily, poll.done() is used
// to stop an ongoing polling stream in response to an external event when not using a
// finite operator like take().
poll.done()
console.log('Polling completed.')

