import { chainable, Poll } from '@toolbuilder/await-for-it'

// Example 1: Polling Indefinitely Until done() is Called
// Without a downstream limit or break condition, Poll will poll indefinitely
// until poll.done() is called.
// Target period is 50ms here (e.g. 1000ms in production) for fast execution.
let count = 0
const poll = new Poll(async () => count++, 50)

// Stop polling when an external event occurs (or from within a consumer step)
setTimeout(() => {
  poll.done() // aborts active wait immediately
}, 175)

await chainable(poll)
  .callNoAwait(val => console.log('Poll value:', val))
  .finally(() => console.log('Polling finished'))
  .runAwait()

