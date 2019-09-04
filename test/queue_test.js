import tape from 'tape'
import { Queue, QueueFull, QueueDone } from '../src/queue.js'
import { chainable } from '../src/chainable.js'
import { RingBuffer } from '../src/ringbuffer.js'

const fastIterator = (asyncIterable) => asyncIterable
const callLater = (period, fn) => new Promise(resolve => setTimeout(() => resolve(fn()), period))
const makeAndPush = (capacity, iterable) => {
  // Just testing that you can use an Array, even though it is about 25x slower for this purpose.
  const ringBuffer = []
  ringBuffer.capacity = capacity
  const queue = new Queue(ringBuffer)
  for (const value of iterable) {
    queue.push(value)
  }
  return queue
}

tape('queue: fast pushing and done called before [Symbol.asyncIterator] called, drains completely', async test => {
  const queue = makeAndPush(10, [0, 1, 2, 3, 4])
  test.deepEqual(queue.length, 5, 'fast pushes fill queue')
  queue.done()
  const output = await chainable(queue).throttle(100, true).toArray()
  test.deepEqual(output, [0, 1, 2, 3, 4], 'queue drains in order and completely')
  test.end()
})

tape('queue: fast pushing and done called after [Symbol.asyncIterator] called, drains completely', async test => {
  const queue = makeAndPush(10, [0, 1, 2, 3, 4])
  callLater(500, () => queue.done())
  const output = await chainable(queue).throttle(100, true).toArray()
  test.deepEqual(output, [0, 1, 2, 3, 4], 'queue drains in order and completely')
  test.end()
})

tape('queue: fast iterator waits for data from slow pushing', async test => {
  const queue = new Queue(new RingBuffer(10))
  const waitBetweenPushes = 100
  for (const value of [0, 1, 2, 3, 4]) {
    callLater(waitBetweenPushes * value, () => {
      test.true(queue.length === 0, 'slow pushes do not fill queue')
      queue.push(value)
    })
  }
  callLater(6 * waitBetweenPushes, () => queue.done()) // wait for pushes to complete
  const output = await chainable(queue).toArray()
  test.deepEqual(output, [0, 1, 2, 3, 4], 'queue drains in order and completely')
  test.end()
})

tape('queue: push on full queue throws', async test => {
  const queue = new Queue(new RingBuffer(3))
  queue.push(0)
  queue.push(1)
  queue.push(2)
  try {
    queue.push(3)
  } catch (error) {
    test.true(error instanceof QueueFull, 'correct error type thrown')
    callLater(50, () => queue.push(4)) // can still push after queue empties a bit
    callLater(100, () => queue.done())
    const output = await chainable(queue).toArray()
    test.deepEqual(output, [0, 1, 2, 4], 'queue still drains in order and completely after exception')
    test.end()
  }
})

tape('queue: fill, drain, then refill', async test => {
  // Queue sized so that it must drain between fillIt calls, or throw QueueFull
  const queue = new Queue(new RingBuffer(6))
  const fillIt = (array) => array.forEach((v, i) => { queue.push(v) })
  callLater(100, () => fillIt([0, 1, 2, 3, 4]))
  callLater(500, () => fillIt([5, 6, 7, 8, 9]))
  callLater(600, () => queue.done()) // wait for pushes to complete
  const output = await chainable(queue).toArray()
  test.deepEqual(output, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 'queue fills, drains, fills, and drains, in order and completely')
  test.end()
})

tape('queue: accepts iterables as values', async test => {
  const queue = new Queue(new RingBuffer(6))
  callLater(100, () => queue.push([0, 1, 2, 3, 4]))
  callLater(200, () => queue.push([5, 6, 7, 8, 9]))
  callLater(300, () => queue.done())
  const output = await chainable(queue).toArray()
  test.deepEqual(output, [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9]], 'queue accepts iterable values')
  test.end()
})

tape('queue: pushing promises behaves as expected', async test => {
  const queue = new Queue(new RingBuffer(6))
  queue.push(new Promise(resolve => setTimeout(() => resolve(0), 100)))
  queue.push(new Promise(resolve => setTimeout(() => resolve(1), 0)))
  queue.push(new Promise(resolve => setTimeout(() => resolve(2), 25)))
  queue.done()
  const output = await chainable(queue).toArray()
  test.deepEqual(output, [0, 1, 2], 'output as expected')
  test.end()
})

tape('queue: done() lets queue drain and then ends iterator', async test => {
  const queue = makeAndPush(10, [0, 1, 2, 3, 4])
  queue.done()
  const output = await chainable(queue).toArray()
  test.deepEqual(output, [0, 1, 2, 3, 4], 'queue drained fully')
  test.end()
})

tape('queue: done(false) ends iterator immediately, even when values queued', async test => {
  const queue = makeAndPush(6, [0, 1, 2, 3, 4])
  queue.done(false)
  const output = await chainable(queue).toArray()
  test.deepEqual(output, [], 'queue ended immediately')
  test.end()
})

tape('queue: done iterable throws on subsequent push', async test => {
  const queue = makeAndPush(6, [0, 1, 2, 3, 4])
  queue.done()
  try {
    queue.push(42)
  } catch (error) {
    test.deepEqual(queue.length, 5, 'Push when done did not go onto queue')
    test.true(error instanceof QueueDone, 'Correct error thrown')
    test.end()
  }
})

tape('queue: length reports Queue length', test => {
  const queue = makeAndPush(6, [0, 1, 2, 3, 4])
  test.deepEqual(queue.length, 5, 'Queue.length reports correct length')
  test.end()
})

tape('queue: capacity reports maximum buffer length', test => {
  const queue = makeAndPush(42, [])
  test.deepEqual(queue.capacity, 42, 'Queue.capacity reports correct max length')
  test.end()
})

tape('queue: push returns the queue length', test => {
  const queue = new Queue(new RingBuffer(6))
  const actualLengths = []
  for (const value of [0, 1, 2, 3, 4]) {
    actualLengths.push(queue.push(value))
  }
  test.deepEqual(actualLengths, [1, 2, 3, 4, 5], 'Queue.push reports the correct queue length')
  test.end()
})
