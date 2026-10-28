import { chainable, Poll, Queue } from '@toolbuilder/await-for-it'

// Make an event queue to handle the polled data.
// You will want to provide your own buffer to
// control the Queue's buffer behavior.
const queue = new Queue()

// Build a processing chain for handling queue input
const controller = chainable(queue)
  .map(x => 2 * x)
  .callAwait(async x => console.log(`Processed from queue: ${x}`))
  .run()

// Nothing is happening yet - need a data source...
let count = 0
const poll = new Poll(() => count++, 50)

// Start polling whether anybody is subscribed or not
const publisher = chainable(poll).publish()
publisher.subscribe(x => queue.push(x)) // feed data into queue

// Sometime later in response to some event (simulated with a short delay)...
await new Promise(resolve => setTimeout(resolve, 160))

poll.done() // stop polling
queue.done() // tell the iterator it is done, any queued values will still be processed

// Wait for the queue processing chain to complete
await controller.finished
console.log('Queue processing completed.')

