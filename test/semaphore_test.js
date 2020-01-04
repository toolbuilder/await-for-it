import { test } from 'zora'
import { Semaphore, wait } from '../src/asynckronus.js'

const times = (n, fn) => {
  for (let i = 0; i < n; ++i) {
    fn()
  }
}

const makeTestHarness = (lock, threadTime) => {
  let idSequence = 0
  const state = { started: 0, atOnce: 0, running: 0, ended: 0 }
  const threadStarting = id => { state.started++ }
  const threadRunning = id => { state.running++; state.atOnce = Math.max(state.running, state.atOnce) }
  const threadStopping = id => { state.ended++; state.running-- }
  const thread = async () => {
    const id = idSequence++
    threadStarting(id)
    await lock.acquire()
    threadRunning(id)
    await wait(threadTime - 10 + (20 * Math.random()))
    lock.release()
    threadStopping(id)
  }

  return { state, thread }
}

test('semaphore: as lock', async assert => {
  const threadTime = 100
  const lock = new Semaphore()
  const { state, thread } = makeTestHarness(lock, threadTime)

  times(3, thread)
  await wait(4 * threadTime)
  times(4, thread)
  await wait(2 * threadTime)
  times(3, thread)
  await wait(15 * threadTime)
  assert.equal(state.started, 10, 'all threads started')
  assert.equal(state.ended, 10, 'all threads ran and ended')
  assert.equal(state.atOnce, 1, 'only one thread ran at once')
})

test('semaphore: thread pool', async assert => {
  const threadTime = 100
  const atOnce = 3
  const lock = new Semaphore(atOnce)
  const { state, thread } = makeTestHarness(lock, threadTime)

  times(3, thread)
  await wait(2 * threadTime)
  times(4, thread)
  await wait(threadTime)
  times(3, thread)
  await wait(15 * threadTime)
  assert.equal(state.started, 10, 'all threads started')
  assert.equal(state.ended, 10, 'all threads ran and ended')
  assert.equal(state.atOnce, atOnce, `only ${atOnce} threads ran at once`)
})

test('semaphore: acquireSync', async assert => {
  const threadTime = 100
  const atOnce = 3
  const lock = new Semaphore(atOnce)
  const { state, thread } = makeTestHarness(lock, threadTime)

  assert.equal(lock.acquireSync(), true, 'first lock available')
  assert.equal(lock.available(), true)
  assert.equal(lock.acquireSync(), true, 'second lock available')
  assert.equal(lock.available(), true)
  assert.equal(lock.acquireSync(), true, 'third lock available')
  assert.equal(lock.available(), false) // just took third lock
  assert.equal(lock.acquireSync(), false, 'fourth lock NOT available')
  assert.equal(lock.available(), false)
  times(3, thread)
  await wait(2 * threadTime)
  assert.equal(state.started - state.ended, 3, 'no threads ran critical section because of sync locks')
  times(4, thread)
  await wait(threadTime)
  times(3, thread)
  times(3, () => lock.release()) // release the 3 sync locks
  await wait(15 * threadTime)
  assert.equal(state.started, 10, 'all threads started')
  assert.equal(state.ended, 10, 'all threads ran and ended')
  assert.equal(state.atOnce, atOnce, `only ${atOnce} threads ran at once`)
})
