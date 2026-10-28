import test from 'node:test'
import assert from 'node:assert/strict'
import { RingBuffer } from '@toolbuilder/ring-buffer'
import { Semaphore } from '@toolbuilder/semaphore'
import { chainable as sync } from 'iterablefu'
import { chainable, Queue, QueueDone, QueueFull, waitToCall } from '../src/await-for-it.js'
import { randomlySlowIterator, runTest } from './toofast.js'

const makeQueueAndPush = (iterable) => {
  const queue = new Queue() // verify default provides a buffer
  for (const value of iterable) {
    queue.push(value)
  }
  return queue
}

test('queue: fast pushing and done called before [Symbol.asyncIterator] called, drains completely', async () => {
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

test('queue: fast pushing and done called after [Symbol.asyncIterator] called, drains completely', async () => {
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

test('queue: fast iterator waits for data from slow pushing', async () => {
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

test('queue: fill, drain, then refill', async () => {
  const queue = new Queue()
  const fillIt = (array) => array.forEach((v, i) => { queue.push(v) })
  waitToCall(100, () => fillIt([0, 1, 2, 3, 4]))
  waitToCall(500, () => fillIt([5, 6, 7, 8, 9]))
  waitToCall(600, () => queue.done()) // wait for pushes to complete
  const output = await chainable(queue).toArray()
  assert.deepEqual(output, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 'queue fills, drains, fills, and drains, in order and completely')
})

test('queue: accepts iterables as values', async () => {
  const queue = new Queue()
  waitToCall(100, () => queue.push([0, 1, 2, 3, 4]))
  waitToCall(200, () => queue.push([5, 6, 7, 8, 9]))
  waitToCall(300, () => queue.done())
  const output = await chainable(queue).toArray()
  assert.deepEqual(output, [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9]], 'queue accepts iterable values')
})

test('queue: pushing promises behaves as expected', async () => {
  const queue = new Queue(new RingBuffer(6))
  queue.push(new Promise(resolve => setTimeout(() => resolve(0), 100)))
  queue.push(new Promise(resolve => setTimeout(() => resolve(1), 0)))
  queue.push(new Promise(resolve => setTimeout(() => resolve(2), 25)))
  queue.done()
  const output = await chainable(queue).toArray()
  assert.deepEqual(output, [0, 1, 2], 'output as expected')
})

test('queue: done() lets queue drain and then ends iterator', async () => {
  const queue = makeQueueAndPush([0, 1, 2, 3, 4])
  queue.done()
  const output = await chainable(queue).toArray()
  assert.deepEqual(output, [0, 1, 2, 3, 4], 'queue drained fully')
})

test('queue: done(false) ends iterator immediately, even when values queued', async () => {
  const queue = makeQueueAndPush([0, 1, 2, 3, 4])
  queue.done(false)
  const output = await chainable(queue).toArray()
  assert.deepEqual(output, [], 'queue ended immediately')
})

test('queue: done iterable throws on subsequent push', async () => {
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

test('queue: length reports Queue length', () => {
  const queue = makeQueueAndPush([0, 1, 2, 3, 4])
  assert.deepEqual(queue.length, 5, 'Queue.length reports correct length')
})

test('queue: push returns the queue length', () => {
  const queue = new Queue()
  /** @type {number[]} */
  const returnedQueueLengths = []
  for (const value of [0, 1, 2, 3, 4]) {
    returnedQueueLengths.push(queue.push(value))
  }
  assert.deepEqual(returnedQueueLengths, [1, 2, 3, 4, 5], 'Queue.push reports the correct queue length')
})

test('queue: rejected promise propagates to iterating code', async () => {
  const theError = new Error('the error')
  const queue = new Queue()

  let caughtException = false
  const semaphore = new Semaphore()
  await semaphore.acquire()

  chainable(queue)
    .catch(e => {
      caughtException = true
      assert.equal(e, theError, 'exact exception was caught')
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

test('queue: reject causes iteration to stop with rejection', async () => {
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
      assert.equal(e, theError, 'caught the exact error thrown')
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

test('queue: iterator called faster than one-at-a-time', async () => {
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

test('queue: validates constructor parameters', () => {
  // @ts-ignore
  assert.throws(() => new Queue(null), TypeError)
  // @ts-ignore
  assert.throws(() => new Queue(100), TypeError)
  // @ts-ignore
  assert.throws(() => new Queue('not a buffer'), TypeError)
  // @ts-ignore
  assert.throws(() => new Queue({}), TypeError)
  // @ts-ignore
  assert.throws(() => new Queue({ length: 0, push: () => 1 }), TypeError)
  // @ts-ignore
  assert.throws(() => new Queue({ length: 'zero', push: () => 1, shift: () => undefined }), TypeError)

  // Valid constructor inputs
  assert.doesNotThrow(() => new Queue())
  assert.doesNotThrow(() => new Queue([]))
  assert.doesNotThrow(() => new Queue(new RingBuffer(5)))

  const defaultQueue = new Queue()
  assert.equal(defaultQueue.length, 0, 'defaults to empty array buffer')
  assert.ok(Array.isArray(defaultQueue.buffer), 'default buffer is an Array')
})

test('queue: validates done parameters', () => {
  const queue = new Queue()
  // @ts-ignore
  assert.throws(() => queue.done('false'), TypeError)
  // @ts-ignore
  assert.throws(() => queue.done(null), TypeError)
  // @ts-ignore
  assert.throws(() => queue.done(1), TypeError)

  assert.doesNotThrow(() => queue.done(true))
})

test('queue: reject wakes waiting iterator and rejects immediately', async () => {
  const theError = new Error('the error')
  const queue = new Queue()

  setTimeout(() => queue.reject(theError), 50)

  await assert.rejects(
    async () => {
      for await (const _ of queue) {}
    },
    theError
  )
})

test('queue: reject propagates falsy exceptions', async () => {
  const falsyExceptions = ['', 0, false, null, undefined, NaN]

  for (const falsy of falsyExceptions) {
    const queue = new Queue()
    setTimeout(() => queue.reject(falsy), 20)

    let caught = false
    let thrownValue
    try {
      for await (const _ of queue) {}
    } catch (e) {
      caught = true
      thrownValue = e
    }

    assert.ok(caught, `falsy exception was caught: ${String(falsy)}`)
    if (Number.isNaN(falsy)) {
      assert.ok(Number.isNaN(thrownValue))
    } else {
      assert.equal(thrownValue, falsy)
    }
  }
})

test('queue: reject stops the queue from accepting subsequent pushes', () => {
  const queue = new Queue()
  queue.reject(new Error('aborted'))

  assert.throws(
    () => queue.push(1),
    QueueDone,
    'push after reject throws QueueDone'
  )
})

test('queue: QueueDone and QueueFull have proper Error names', () => {
  const doneError = new QueueDone('done')
  const fullError = new QueueFull('full')

  assert.equal(doneError.name, 'QueueDone')
  assert.equal(fullError.name, 'QueueFull')
  assert.ok(doneError instanceof Error)
  assert.ok(fullError instanceof Error)
})

test('queue: early break from iteration cleans up waiter properly', async () => {
  const queue = new Queue()
  queue.push(1)
  queue.push(2)

  for await (const value of queue) {
    if (value === 1) break
  }

  assert.equal(queue.waiters.length, 0, 'no dangling waiters after break')
  assert.equal(queue.length, 1, 'remaining items stay in buffer')
})

