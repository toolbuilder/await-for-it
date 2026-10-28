import { chainable, Queue } from '@toolbuilder/await-for-it'

// When an external buffer is provided to `new Queue(buffer)`, the queue delegates
// storage to that buffer. Items are shifted from the buffer only when yielded
// to the consumer iterator.
//
// If an exception occurs—either because downstream processing code throws an error
// or because a queued Promise rejects:
// 1. The consumer iterator aborts and terminates.
// 2. Downstream `.catch()` handlers receive the error.
// 3. `.finally()` cleanup runs.
// 4. CRITICAL: The underlying buffer is NOT corrupted, cleared, or lost!
//    All unconsumed items that were not yet yielded remain safely in the buffer.
//
// This enables reliable error recovery patterns:
// - Inspecting unconsumed items for diagnostics or auditing.
// - Persisting unprocessed items to a Dead Letter Queue (DLQ).
// - Instantiating a new Queue with the same buffer to resume processing.

// ============================================================================
// Scenario 1: Downstream processing exception and buffer recovery
// ============================================================================
console.log('--- Scenario 1: Downstream pipeline exception & buffer recovery ---')

const taskBuffer = []
const queue = new Queue(taskBuffer)

const tasks = [
  { id: 1, name: 'Task 1 (good)' },
  { id: 2, name: 'Task 2 (good)' },
  { id: 3, name: 'Task 3 (bad data)' },
  { id: 4, name: 'Task 4 (good)' },
  { id: 5, name: 'Task 5 (good)' }
]

for (const task of tasks) {
  queue.push(task)
}
queue.done()

const controller = chainable(queue)
  .callAwait(async task => {
    if (task.id === 3) {
      throw new Error(`Validation failure on ${task.name}`)
    }
    console.log(`Processed: ${task.name}`)
  })
  .catch(error => {
    console.log(`Caught downstream error: ${error.message}`)
  })
  .finally(() => {
    console.log('Pipeline 1 cleanup executed.')
  })
  .run()

await controller.finished

// Verify that the buffer is intact and still contains the remaining tasks
console.log(`\nBuffer length after exception: ${taskBuffer.length}`)
console.log('Unprocessed items remaining in buffer:', taskBuffer.map(t => t.name))

// Resume processing by passing the exact same buffer to a new Queue
console.log('\nCreating recovery Queue using the preserved buffer...')
const recoveryQueue = new Queue(taskBuffer)
recoveryQueue.done()

await chainable(recoveryQueue)
  .callAwait(async task => {
    console.log(`Recovery worker processed: ${task.name}`)
  })
  .runAwait()

console.log(`Buffer length after recovery complete: ${taskBuffer.length}`)

// ============================================================================
// Scenario 2: Queued Promise rejection
// ============================================================================
console.log('\n--- Scenario 2: Queued Promise rejection ---')

const promiseBuffer = []
const pQueue = new Queue(promiseBuffer)

// Pushing a rejected Promise will abort the consumer iterator when yielded.
pQueue.push(Promise.resolve('Job A'))
pQueue.push(Promise.reject(new Error('Network failure on Job B')))
pQueue.push(Promise.resolve('Job C'))
pQueue.done()

await chainable(pQueue)
  .callAwait(async job => {
    console.log(`Processed queued promise: ${job}`)
  })
  .catch(error => {
    console.log(`Pipeline caught rejected promise: ${error.message}`)
  })
  .finally(() => {
    console.log('Promise pipeline cleanup executed.')
  })
  .runAwait()

// All items pushed after the rejected Promise remain safely in the buffer
console.log(`Items preserved in buffer after promise rejection: ${promiseBuffer.length}`)
for (const item of promiseBuffer) {
  console.log('Preserved unyielded item from buffer:', await item)
}
console.log('Queue exceptions example completed.')

