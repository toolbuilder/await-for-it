import tape from 'tape'
import { Semaphore } from '../src/semaphore.js'
import { wait } from '../src/timeouts.js'

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

tape('semaphore: as lock', async test => {
  const threadTime = 100
  const lock = new Semaphore()
  const { state, thread } = makeTestHarness(lock, threadTime)

  times(3, thread)
  await wait(4 * threadTime)
  times(4, thread)
  await wait(2 * threadTime)
  times(3, thread)
  await wait(15 * threadTime)
  test.equal(state.started, 10, 'all threads started')
  test.equal(state.ended, 10, 'all threads ran and ended')
  test.equal(state.atOnce, 1, 'only one thread ran at once')
  test.end()
})

tape('semaphore: thread pool', async test => {
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
  test.equal(state.started, 10, 'all threads started')
  test.equal(state.ended, 10, 'all threads ran and ended')
  test.equal(state.atOnce, atOnce, `only ${atOnce} threads ran at once`)
  test.end()
})

tape('semaphore: acquireSync', async test => {
  const threadTime = 100
  const atOnce = 3
  const lock = new Semaphore(atOnce)
  const { state, thread } = makeTestHarness(lock, threadTime)

  test.equal(lock.acquireSync(), true, 'first lock available')
  test.equal(lock.available(), true)
  test.equal(lock.acquireSync(), true, 'second lock available')
  test.equal(lock.available(), true)
  test.equal(lock.acquireSync(), true, 'third lock available')
  test.equal(lock.available(), false) // just took third lock
  test.equal(lock.acquireSync(), false, 'fourth lock NOT available')
  test.equal(lock.available(), false)
  times(3, thread)
  await wait(2 * threadTime)
  test.equal(state.started - state.ended, 3, 'no threads ran critical section because of sync locks')
  times(4, thread)
  await wait(threadTime)
  times(3, thread)
  times(3, () => lock.release()) // release the 3 sync locks
  await wait(15 * threadTime)
  test.equal(state.started, 10, 'all threads started')
  test.equal(state.ended, 10, 'all threads ran and ended')
  test.equal(state.atOnce, atOnce, `only ${atOnce} threads ran at once`)
  test.end()
})
