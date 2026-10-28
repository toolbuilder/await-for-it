import { chainable, Poll } from '@toolbuilder/await-for-it'

// Example 2: Backpressure - Downstream Processing Pauses Polling
// Because Poll is pull-based, polling automatically pauses when downstream
// iteration pauses or runs slower than period.
let count = 0
// Poller target period is 50ms (e.g. 100ms in production)
const poll = new Poll(() => count++, 50)

// Take 3 values total so iteration completes cleanly
const controller = chainable(poll)
  .take(3)
  .callNoAwait(x => console.log('Value:', x))
  .run()

// Pausing the consumer stops calls to fn()
console.log('Pausing consumer...')
controller.stop()

// Resuming the consumer restarts polling
setTimeout(() => {
  console.log('Resuming consumer...')
  controller.start()
}, 100)

// Await completion of the iterator
await controller.finished
console.log('Polling finished after backpressure pause and resume.')

