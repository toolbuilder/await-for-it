import { RingBuffer } from '@toolbuilder/ring-buffer'
import { Semaphore } from '@toolbuilder/semaphore'
import { chainable as sync } from 'iterablefu'
import { test } from 'zora'
import { chainable, Queue, QueueDone, waitToCall } from '../src/await-for-it'
import { randomlySlowIterator, runTest } from './toofast'

const makeQueueAndPush = (iterable) => {
  const queue = new Queue() // verify default provides a buffer
  for (const value of iterable) {
    queue.push(value)
  }
  return queue
}

test('queue: fast pushing and done called before [Symbol.asyncIterator] called, drains completely', async assert => {
  const queue = new Queue()

  // await to make sure done() called before asking for output
  await chainable([0, 1, 2, 3, 4])
    .finally(() => {
      assert.deepEqual(queue.length, 5, 'fast pushes fill queue')
      queue.done()
    })
    .forEach(x => queue.push(x))

  const output = await chainable(queue).throttle(50, 50).toArray()
  assert.deepEqual(output, [0, 1, 2, 3, 4], 'queue drains in order and completely')
})

test('queue: fast pushing and done called after [Symbol.asyncIterator] called, drains completely', async assert => {
  const queue = new Queue()

  chainable([0, 1, 2, 3, 4])
    .finally(() => {
      assert.deepEqual(queue.length, 5, 'fast pushes fill queue')
    })
    .forEach(x => queue.push(x))

  waitToCall(50, () => queue.done())
  const output = await chainable(queue).throttle(50, 50).toArray()
  assert.deepEqual(output, [0, 1, 2, 3, 4], 'queue drains in order and completely')
})

test('queue: fast iterator waits for data from slow pushing', async assert => {
  const queue = new Queue(new RingBuffer(10))

  chainable([0, 1, 2, 3, 4])
    .throttle(100, 0)
    .callNoAwait(x => queue.push(x))
    .callNoAwait(() => assert.equal(queue.length, 0, 'slow pushes do not fill queue'))
    .finally(() => queue.done())
    .run()

  const output = await chainable(queue).toArray()
  assert.deepEqual(output, [0, 1, 2, 3, 4], 'queue drains in order and completely')
})

test('queue: fill, drain, then refill', async assert => {
  const queue = new Queue()
  const fillIt = (array) => array.forEach((v, i) => { queue.push(v) })
  waitToCall(100, () => fillIt([0, 1, 2, 3, 4]))
  waitToCall(500, () => fillIt([5, 6, 7, 8, 9]))
  waitToCall(600, () => queue.done()) // wait for pushes to complete
  const output = await chainable(queue).toArray()
  assert.deepEqual(output, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 'queue fills, drains, fills, and drains, in order and completely')
})

test('queue: accepts iterables as values', async assert => {
  const queue = new Queue()
  waitToCall(100, () => queue.push([0, 1, 2, 3, 4]))
  waitToCall(200, () => queue.push([5, 6, 7, 8, 9]))
  waitToCall(300, () => queue.done())
  const output = await chainable(queue).toArray()
  assert.deepEqual(output, [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9]], 'queue accepts iterable values')
})

test('queue: pushing promises behaves as expected', async assert => {
  const queue = new Queue(new RingBuffer(6))
  queue.push(new Promise(resolve => setTimeout(() => resolve(0), 100)))
  queue.push(new Promise(resolve => setTimeout(() => resolve(1), 0)))
  queue.push(new Promise(resolve => setTimeout(() => resolve(2), 25)))
  queue.done()
  const output = await chainable(queue).toArray()
  assert.deepEqual(output, [0, 1, 2], 'output as expected')
})

test('queue: done() lets queue drain and then ends iterator', async assert => {
  const queue = makeQueueAndPush([0, 1, 2, 3, 4])
  queue.done()
  const output = await chainable(queue).toArray()
  assert.deepEqual(output, [0, 1, 2, 3, 4], 'queue drained fully')
})

test('queue: done(false) ends iterator immediately, even when values queued', async assert => {
  const queue = makeQueueAndPush([0, 1, 2, 3, 4])
  queue.done(false)
  const output = await chainable(queue).toArray()
  assert.deepEqual(output, [], 'queue ended immediately')
})

test('queue: done iterable throws on subsequent push', async assert => {
  const queue = makeQueueAndPush([0, 1, 2, 3, 4])
  queue.done()
  let caughtException = false
  try {
    queue.push(42)
  } catch (error) {
    caughtException = true
    assert.deepEqual(queue.length, 5, 'Push when done did not go onto queue')
    assert.ok(error instanceof QueueDone, 'Correct error thrown')
  }
  assert.ok(caughtException, 'exception was caught')
})

test('queue: length reports Queue length', assert => {
  const queue = makeQueueAndPush([0, 1, 2, 3, 4])
  assert.deepEqual(queue.length, 5, 'Queue.length reports correct length')
})

test('queue: push returns the queue length', assert => {
  const queue = new Queue()
  const returnedQueueLengths = []
  for (const value of [0, 1, 2, 3, 4]) {
    returnedQueueLengths.push(queue.push(value))
  }
  assert.deepEqual(returnedQueueLengths, [1, 2, 3, 4, 5], 'Queue.push reports the correct queue length')
})

test('queue: rejected promise propagates to iterating code', async assert => {
  const theError = new Error('the error')
  const queue = new Queue()

  let caughtException = false
  const semaphore = new Semaphore()
  await semaphore.acquire()

  chainable(queue)
    .catch(e => {
      caughtException = true
      assert.is(e, theError, 'exact exception was caught')
    })
    .finally(() => {
      assert.ok(caughtException, 'caught the exception')
      semaphore.release()
    })
    .run()

  queue.push(5)
  queue.push(new Promise((resolve, reject) => setTimeout(() => reject(theError), 100)))

  await semaphore.acquire()
  semaphore.release()
})

test('queue: reject causes iteration to stop with rejection', async assert => {
  const theError = new Error('the error')
  const queue = new Queue()
  let count = 0
  let caughtException = false
  const semaphore = new Semaphore()
  await semaphore.acquire()

  chainable(queue)
    .throttle(50, 0)
    .callNoAwait(x => { if (count++ === 2) queue.reject(theError) })
    .catch(e => {
      caughtException = true
      assert.is(e, theError, 'caught the exact error thrown')
    })
    .finally(() => {
      assert.ok(caughtException, 'caught the exception')
      semaphore.release()
    })
    .run()

  ;[0, 1, 2, 3, 4].forEach(x => queue.push(x))

  await semaphore.acquire()
  semaphore.release()
})

test('queue: iterator called faster than one-at-a-time', async assert => {
  const values = 50
  const queue = new Queue()
  const data = sync.range(values).toArray()

  // slowly push data into the queue so that queue never fills up
  chainable(randomlySlowIterator(5, 5, data))
    .callNoAwait(value => queue.push(value))
    .finally(() => { queue.done() })
    .run()

  const actualValues = await runTest(queue, values)
  assert.deepEqual(actualValues, data, 'all values returned in proper order')
})
