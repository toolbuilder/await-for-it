import tape from 'tape'
import { Queue, QueueFull, QueueDone } from '../src/queue.js'
import { chainable } from '../src/chainable.js'
import { RingBuffer } from '../src/ringbuffer.js'
import { waitToCall } from '../src/timeouts.js'

// Alternate buffer implementation to verify that any buffer works.
// Array is about 20x slower than RingBuffer for the push/shift use case.
class ArrayBuffer extends Array {
  constructor (capacity) {
    super()
    this.capacity = capacity
  }
}

const makeQueueAndPush = (capacity, iterable) => {
  const queue = new Queue(new ArrayBuffer(capacity))
  for (const value of iterable) {
    queue.push(value)
  }
  return queue
}

tape('queue: fast pushing and done called before [Symbol.asyncIterator] called, drains completely', async test => {
  const queue = new Queue(new ArrayBuffer(10))

  // await to make sure done() called before asking for output
  await chainable([0, 1, 2, 3, 4])
    .finally(() => {
      test.deepEqual(queue.length, 5, 'fast pushes fill queue')
      queue.done()
    })
    .forEach(x => queue.push(x))

  const output = await chainable(queue).throttle(50, 50).toArray()
  test.deepEqual(output, [0, 1, 2, 3, 4], 'queue drains in order and completely')
  test.end()
})

tape('queue: fast pushing and done called after [Symbol.asyncIterator] called, drains completely', async test => {
  const queue = new Queue(new ArrayBuffer(10))

  chainable([0, 1, 2, 3, 4])
    .finally(() => {
      test.deepEqual(queue.length, 5, 'fast pushes fill queue')
    })
    .forEach(x => queue.push(x))

  waitToCall(50, () => queue.done())
  const output = await chainable(queue).throttle(50, 50).toArray()
  test.deepEqual(output, [0, 1, 2, 3, 4], 'queue drains in order and completely')
  test.end()
})

tape('queue: fast iterator waits for data from slow pushing', async test => {
  const queue = new Queue(new RingBuffer(10))

  chainable([0, 1, 2, 3, 4])
    .throttle(100, 0)
    .callNoAwait(x => queue.push(x))
    .callNoAwait(() => test.equal(queue.length, 0, 'slow pushes do not fill queue'))
    .finally(() => queue.done())
    .run()

  const output = await chainable(queue).toArray()
  test.deepEqual(output, [0, 1, 2, 3, 4], 'queue drains in order and completely')
  test.end()
})

tape('queue: push on full queue throws', async test => {
  const queue = new Queue(3)

  queue.push(0)
  queue.push(1)
  queue.push(2)
  try {
    queue.push(3)
  } catch (error) {
    test.true(error instanceof QueueFull, 'correct error type thrown')
    waitToCall(50, () => queue.push(4)) // can still push after queue empties a bit
    waitToCall(100, () => queue.done())
    const output = await chainable(queue).toArray()
    test.deepEqual(output, [0, 1, 2, 4], 'queue still drains in order and completely after exception')
    test.end()
  }
})

tape('queue: fill, drain, then refill', async test => {
  // Queue sized so that it must drain between fillIt calls, or throw QueueFull
  const queue = new Queue(6)
  const fillIt = (array) => array.forEach((v, i) => { queue.push(v) })
  waitToCall(100, () => fillIt([0, 1, 2, 3, 4]))
  waitToCall(500, () => fillIt([5, 6, 7, 8, 9]))
  waitToCall(600, () => queue.done()) // wait for pushes to complete
  const output = await chainable(queue).toArray()
  test.deepEqual(output, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 'queue fills, drains, fills, and drains, in order and completely')
  test.end()
})

tape('queue: accepts iterables as values', async test => {
  const queue = new Queue(6)
  waitToCall(100, () => queue.push([0, 1, 2, 3, 4]))
  waitToCall(200, () => queue.push([5, 6, 7, 8, 9]))
  waitToCall(300, () => queue.done())
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
  const queue = makeQueueAndPush(10, [0, 1, 2, 3, 4])
  queue.done()
  const output = await chainable(queue).toArray()
  test.deepEqual(output, [0, 1, 2, 3, 4], 'queue drained fully')
  test.end()
})

tape('queue: done(false) ends iterator immediately, even when values queued', async test => {
  const queue = makeQueueAndPush(6, [0, 1, 2, 3, 4])
  queue.done(false)
  const output = await chainable(queue).toArray()
  test.deepEqual(output, [], 'queue ended immediately')
  test.end()
})

tape('queue: done iterable throws on subsequent push', async test => {
  const queue = makeQueueAndPush(6, [0, 1, 2, 3, 4])
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
  const queue = makeQueueAndPush(6, [0, 1, 2, 3, 4])
  test.deepEqual(queue.length, 5, 'Queue.length reports correct length')
  test.end()
})

tape('queue: capacity reports maximum buffer length', test => {
  const queue = makeQueueAndPush(42, [])
  test.deepEqual(queue.capacity, 42, 'Queue.capacity reports correct max length')
  test.end()
})

tape('queue: push returns the queue length', test => {
  const queue = new Queue()
  const returnedQueueLengths = []
  for (const value of [0, 1, 2, 3, 4]) {
    returnedQueueLengths.push(queue.push(value))
  }
  test.deepEqual(returnedQueueLengths, [1, 2, 3, 4, 5], 'Queue.push reports the correct queue length')
  test.end()
})

tape('queue: push returns zero queue length for fast iteration', test => {
  const returnedQueueLengths = []

  const queue = new Queue(5)

  // slowly push values into queue, so buffer can remain empty
  chainable([0, 1, 2, 3, 4])
    .throttle(50, 50)
    .finally(() => queue.done())
    .forEach(value => returnedQueueLengths.push(queue.push(value)))

  chainable(queue)
    .finally(() => {
      test.deepEqual(returnedQueueLengths, [0, 0, 0, 0, 0], 'push returns zero when queue buffer empty')
      test.end()
    })
    .run()
})

tape('queue: rejected promise propagates to iterating code', async test => {
  const theError = new Error('the error')
  const queue = new Queue(5)

  let caughtException = false
  chainable(queue)
    .catch(e => {
      caughtException = true
      test.is(e, theError, 'exact exception was caught')
    })
    .finally(() => {
      test.true(caughtException, 'caught the exception')
      test.end()
    })
    .run()

  queue.push(5)
  queue.push(new Promise((resolve, reject) => setTimeout(() => reject(theError), 100)))
})

tape('queue: reject causes iteration to stop with rejection', async test => {
  const theError = new Error('the error')
  const queue = new Queue(5)
  let count = 0
  let caughtException = false
  chainable(queue)
    .throttle(50, 0)
    .callNoAwait(x => { if (count++ === 2) queue.reject(theError) })
    .catch(e => {
      caughtException = true
      test.is(e, theError, 'caught the exact error thrown')
    })
    .finally(() => {
      test.true(caughtException, 'caught the exception')
      test.end()
    })
    .run()

  ;[0, 1, 2, 3, 4].forEach(x => queue.push(x))
})
