import { chainable, Queue, QueueDone } from '@toolbuilder/await-for-it'

// Calling `queue.reject(exception)` terminates iteration over the queue with an error.
//
// Key behaviors of queue.reject():
// 1. Any waiting consumer promises are rejected immediately with the exception.
// 2. The consumer iterable chain aborts, and downstream `.catch()` handlers receive the error.
// 3. The queue is closed against further input: any subsequent `queue.push()` call throws `QueueDone`.
// 4. CRITICAL: The underlying buffer is NOT destroyed or corrupted. Any items that
//    were queued before the rejection remain safe and accessible in the buffer.
//
// This allows applications to recover or audit unprocessed items even after an emergency abort.

console.log('--- Example: Explicit Queue Rejection & Buffer Safety ---')

// Provide an external buffer so we retain direct access to it
const messageBuffer = []
const queue = new Queue(messageBuffer)

// Push an initial batch of work items into the queue
queue.push({ id: 101, message: 'Message A' })
queue.push({ id: 102, message: 'Message B' })
queue.push({ id: 103, message: 'Message C' })
queue.push({ id: 104, message: 'Message D' })

const controller = chainable(queue)
  .callAwait(async item => {
    console.log(`Consumer processing: ${item.message} (id ${item.id})`)
    if (item.id === 102) {
      // Simulate an unrecoverable condition, such as a downstream outage,
      // circuit breaker trip, or emergency shutdown.
      console.log('-> Circuit breaker triggered! Calling queue.reject()...')
      queue.reject(new Error('Circuit breaker tripped: service unavailable'))
    }
  })
  .catch(error => {
    console.log(`Pipeline catch received rejection: ${error.message}`)
  })
  .finally(() => {
    console.log('Pipeline cleanup executed.')
  })
  .run()

await controller.finished

// --- Verification 1: Push lockout after reject() ---
// Once rejected, the queue refuses new pushes by throwing QueueDone
console.log('\n--- 1. Push lockout verification ---')
try {
  queue.push({ id: 105, message: 'Message E' })
} catch (error) {
  if (error instanceof QueueDone) {
    console.log(`queue.push() threw QueueDone as expected: '${error.message}'`)
  }
}

// --- Verification 2: Buffer state and safety ---
// The items remaining in the buffer were not corrupted or cleared
console.log('\n--- 2. Buffer state verification ---')
console.log(`Remaining items in buffer: ${messageBuffer.length}`)
console.log('Preserved items:', messageBuffer.map(item => item.message))

// --- Verification 3: Replaying preserved items ---
// The preserved buffer can be passed to a new Queue or dead-letter processor
console.log('\n--- 3. Replaying preserved buffer with recovery Queue ---')
const recoveryQueue = new Queue(messageBuffer)
recoveryQueue.done()

await chainable(recoveryQueue)
  .callAwait(async item => {
    console.log(`Recovery worker processed: ${item.message}`)
  })
  .runAwait()

console.log(`Remaining in buffer after recovery: ${messageBuffer.length}`)
console.log('Queue reject example completed.')

