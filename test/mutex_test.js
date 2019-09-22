import { test as tape } from 'zora'
import { Mutex } from '../src/mutex.js'
import { wait } from '../src/timeouts.js'
import { isFunction } from '../src/is.js'

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
    const release = await lock.acquire()
    threadRunning(id)
    await wait(threadTime - 10 + (20 * Math.random()))
    release()
    release() // verify that double release works correctly
    threadStopping(id)
  }

  return { state, thread }
}

tape('mutex: acquire', async test => {
  const threadTime = 50
  const lock = new Mutex()
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
})

tape('mutex: acquireSync', async test => {
  const mutex = new Mutex()

  test.ok(mutex.available(), 'mutex is available before first acquireSync')
  const release = mutex.acquireSync()
  test.ok(isFunction(release), 'first acquireSync returns release function')
  test.notOk(mutex.available(), 'mutex is not avaialble after first acquireSync')
  test.equal(mutex.acquireSync(), null, 'second acquireSync returns null')

  release()
  release() // verify that double release works ok

  test.ok(mutex.available(), 'muxtex is available after release function called')
})
