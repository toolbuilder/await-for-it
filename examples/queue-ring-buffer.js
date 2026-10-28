import { chainable, Queue, waitToCall } from '@toolbuilder/await-for-it'
import { RingBuffer } from '@toolbuilder/ring-buffer'

// Setup queue to keep only the most recent 5 data values.
// Older values that have not been processed yet are quietly dropped
// when capacity is reached. This behavior is provided by RingBuffer.
// Other buffers (like Array or DynamicRingBuffer) behave differently.
const buffer = new RingBuffer(5)
const queue = new Queue(buffer)

// Simulated async operations
const fetchData = async (id) => {
  await new Promise(resolve => setTimeout(resolve, 10))
  return { id, data: `sensor-reading-${id}` }
}

const processData = async (record) => {
  await new Promise(resolve => setTimeout(resolve, 10))
  console.log(`Processed record #${record.id}: ${record.data}`)
}

// Setup an async iterator pipeline to handle the input
const controller = chainable(queue)
  // Fetch data asynchronously for each incoming id
  .map(async (id) => fetchData(id))
  // Process the result asynchronously
  .callAwait(async (result) => processData(result))
  .catch(error => console.error('Pipeline error:', error.message))
  .finally(async () => console.log('Cleanup: pipeline finished.'))
  .run()

// Push initial items that will be processed immediately
queue.push(1)
queue.push(2)
await new Promise(resolve => setTimeout(resolve, 35))

// You can stop/resume the chainable iterator if you need to.
// By default, you can still push to the queue while chainable is stopped.
// The buffer will determine if pushed values are kept or dropped.
console.log('Pausing consumer...')
if (controller.running) controller.stop()

// Push 7 items (3 through 9) into the capacity-5 RingBuffer while paused.
// RingBuffer quietly drops the oldest unprocessed items (3 and 4) and keeps 5 through 9.
console.log('Pushing items 3 through 9 while paused (buffer capacity is 5)...')
for (let i = 3; i <= 9; i++) {
  queue.push(i)
}
console.log(`Current buffer length: ${queue.length} (items 3 and 4 were dropped)`)

// Resume processing
console.log('Resuming consumer...')
controller.start()

// Somewhere else, such as an 'application done' event, tell the
// Queue that it is done so that the chainable finally method is called.
// By default all values remaining in the buffer are processed before iteration stops.
waitToCall(50, () => queue.done())

// Await completion of the consumer pipeline
await controller.finished
console.log('Queue ring buffer example completed.')

