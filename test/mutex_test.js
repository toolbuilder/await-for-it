import { test } from 'zora'
import { Mutex, wait, isFunction } from '../src/asynckronus.js'

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

test('mutex: acquire', async assert => {
  const threadTime = 50
  const lock = new Mutex()
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

test('mutex: acquireSync', async assert => {
  const mutex = new Mutex()

  assert.ok(mutex.available(), 'mutex is available before first acquireSync')
  const release = mutex.acquireSync()
  assert.ok(isFunction(release), 'first acquireSync returns release function')
  assert.notOk(mutex.available(), 'mutex is not avaialble after first acquireSync')
  assert.equal(mutex.acquireSync(), null, 'second acquireSync returns null')

  release()
  release() // verify that double release works ok

  assert.ok(mutex.available(), 'muxtex is available after release function called')
})
