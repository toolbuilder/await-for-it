import test from 'node:test'
import assert from 'node:assert/strict'
import { ChainableIterable } from 'iterablefu'
import { chainable, Poll, reducers, wait, waitToCall } from '../src/await-for-it.js'

class TestError extends Error {}

test('forEach: processes sync and async callbacks sequentially with index and detached this', async () => {
  const input = [0, 1, 2, 3, 4]
  /** @type {Array<[number, number]>} */
  const accumulator = []
  /** @type {any[]} */
  const thisValues = []

  await chainable(input).forEach(/** @this {any} */ async function (x, i) {
    thisValues.push(this)
    await wait(5)
    accumulator.push([x, i])
  })

  const matchingLength = ChainableIterable
    .from(accumulator)
    .filter(array => array[0] === array[1])
    .toArray()
    .length
  assert.equal(matchingLength, accumulator.length, 'forEach provided index value correctly')

  const output = ChainableIterable
    .from(accumulator)
    .nth(0)
    .toArray()
  assert.deepEqual(output, input, 'forEach processed each value sequentially in order')
  assert.ok(thisValues.every(v => v === undefined), 'forEach invoked callback with undefined this')
})

test('forEach: closes upstream iterator when callback throws or rejects', async () => {
  let closedSyncThrow = false
  const gen1 = async function * () {
    try {
      yield 1
      yield 2
      yield 3
    } finally {
      closedSyncThrow = true
    }
  }

  await assert.rejects(
    () => reducers.forEach((x) => { if (x === 2) throw new TestError('sync boom') }, gen1()),
    TestError
  )
  assert.equal(closedSyncThrow, true, 'upstream iterator closed on sync callback throw')

  let closedAsyncReject = false
  const gen2 = async function * () {
    try {
      yield 1
      yield 2
      yield 3
    } finally {
      closedAsyncReject = true
    }
  }

  await assert.rejects(
    () => reducers.forEach(async (x) => { if (x === 2) throw new TestError('async boom') }, gen2()),
    TestError
  )
  assert.equal(closedAsyncReject, true, 'upstream iterator closed on async callback rejection')
})

test('forEach: parameter validation rejects with TypeError', async () => {
  // @ts-expect-error testing invalid fn on empty iterable
  await assert.rejects(() => reducers.forEach('not a function', []), TypeError)
  // @ts-expect-error testing ES6 class as fn
  await assert.rejects(() => reducers.forEach(class Foo {}, [1, 2]), TypeError)
  // @ts-expect-error testing invalid iterable
  await assert.rejects(() => reducers.forEach(() => {}, null), TypeError)
  // @ts-expect-error testing Symbol iterable
  await assert.rejects(() => reducers.forEach(() => {}, Symbol('bad')), TypeError)
})

test('publish: fans out to subscribers and supports unsubscribe', async () => {
  const input = [0, 1, 2, 3, 4]
  /** @type {number[]} */
  const output1 = []
  /** @type {number[]} */
  const output2 = []
  /** @type {number[]} */
  const output3 = []
  let finallyCalled = false

  const control = chainable(input)
    .throttle(20, 20)
    .finally(() => {
      finallyCalled = true
    })
    .publish()

  assert.equal(control.running, true, 'publisher starts running')
  control.subscribe(x => output1.push(x))
  control.subscribe(x => output2.push(x))
  const key = control.subscribe(x => output3.push(x))
  control.unsubscribe(key)

  await control.finished

  assert.equal(finallyCalled, true, 'finally ran when publishing completed')
  assert.equal(control.running, false, 'publisher.running is false after completion')
  assert.deepEqual(output1, input, 'first subscriber got all data in order')
  assert.deepEqual(output2, input, 'second subscriber got all data in order')
  assert.deepEqual(output3, [], 'unsubscribed callback received no values')

  // start/stop after completion are safe no-ops
  control.stop()
  assert.equal(control.running, false)
  control.start()
  assert.equal(control.running, false, 'start() after completion does not flip running back to true')

  // Subscribing after completion returns a key without retaining/calling subscriber
  const lateKey = control.subscribe(() => { throw new Error('should not run') })
  assert.equal(typeof lateKey, 'number')
})

test('publish: mid-dispatch subscribe, unsubscribe, and cancel', async () => {
  /** @type {number[]} */
  const events1 = []
  /** @type {number[]} */
  const lateEvents = []
  /** @type {number[]} */
  const removedEvents = []

  const pub = reducers.publish([10, 20, 30])
  /** @type {number} */
  let keyToRemove = -1

  pub.subscribe((val) => {
    events1.push(val)
    if (val === 10) {
      // Subscribing mid-dispatch should only receive subsequent values (20, 30), not 10
      pub.subscribe(v => lateEvents.push(v))
      // Unsubscribing a later subscriber mid-dispatch should skip it immediately for value 10
      pub.unsubscribe(keyToRemove)
    }
  })

  keyToRemove = pub.subscribe((val) => {
    removedEvents.push(val)
  })

  await pub.finished

  assert.deepEqual(events1, [10, 20, 30])
  assert.deepEqual(lateEvents, [20, 30], 'newly subscribed callback only received values after subscribing')
  assert.deepEqual(removedEvents, [], 'unsubscribed callback was skipped immediately during dispatch')

  // Mid-dispatch cancel() stops notifying remaining subscribers and closes upstream
  let upstreamClosed = false
  let secondCalled = false
  const gen = async function * () {
    try {
      yield 1
      yield 2
    } finally {
      upstreamClosed = true
    }
  }
  const pubCancel = reducers.publish(gen())
  pubCancel.subscribe(() => { pubCancel.cancel() })
  pubCancel.subscribe(() => { secondCalled = true })

  await pubCancel.finished
  assert.equal(secondCalled, false, 'cancel() mid-dispatch prevented remaining subscribers from firing')
  assert.equal(upstreamClosed, true, 'cancel() mid-dispatch closed upstream generator')
  assert.equal(pubCancel.running, false)
})

test('publish: upstream and subscriber exception handling', async () => {
  // 1. Uncaught upstream error rejects finished and sets running = false
  const badSource = async function * () {
    yield 1
    throw new TestError('upstream failure')
  }
  const pub1 = reducers.publish(badSource())
  /** @type {number[]} */
  const got1 = []
  pub1.subscribe(x => got1.push(x))
  await assert.rejects(() => pub1.finished, TestError)
  assert.deepEqual(got1, [1])
  assert.equal(pub1.running, false)

  // 2. Upstream error handled via chainable.catch() resolves finished cleanly
  /** @type {any} */
  let caughtErr = null
  const pub2 = chainable(badSource())
    .catch(err => { caughtErr = err })
    .publish()
  await pub2.finished
  assert.ok(caughtErr instanceof TestError, 'chainable.catch handled upstream error')
  assert.equal(pub2.running, false)

  // 3. Synchronous subscriber throw aborts immediately, closes upstream, and rejects finished
  // even when chainable.catch() is present upstream
  let finallyCalled = false
  let secondSubscriberCalled = false
  const pub3 = chainable([1, 2, 3])
    .catch(() => { throw new Error('upstream catch should not see subscriber throw') })
    .finally(() => { finallyCalled = true })
    .publish()

  pub3.subscribe((x) => {
    if (x === 1) throw new TestError('subscriber boom')
  })
  pub3.subscribe(() => {
    secondSubscriberCalled = true
  })

  await assert.rejects(() => pub3.finished, TestError)
  assert.equal(secondSubscriberCalled, false, 'failed fast on synchronous subscriber error')
  assert.equal(finallyCalled, true, 'upstream finally ran when subscriber threw')
  assert.equal(pub3.running, false)
})

test('publish: synchronous stop prevents initial pull and cancel while paused cleans up', async () => {
  let pulls = 0
  let closed = false
  const gen = async function * () {
    try {
      pulls++
      yield 'a'
      pulls++
      yield 'b'
    } finally {
      closed = true
    }
  }

  const pub = reducers.publish(gen())
  pub.stop()
  assert.equal(pub.running, false)
  await wait(20)
  assert.equal(pulls, 0, 'synchronous stop() prevented even the first pull')

  /** @type {string[]} */
  const items = []
  pub.subscribe(x => items.push(x))
  pub.start()
  assert.equal(pub.running, true)

  // Pause after first item by stopping inside subscriber
  pub.subscribe(() => pub.stop())
  await wait(20)
  assert.deepEqual(items, ['a'])
  assert.equal(pulls, 1, 'stopped before pulling second item')
  assert.equal(pub.running, false)

  await pub.cancel()
  assert.equal(closed, true, 'cancel() while paused closed upstream iterator')
  assert.equal(pub.running, false)
})

test('publish: parameter validation throws TypeError synchronously', () => {
  // @ts-expect-error testing invalid iterable
  assert.throws(() => reducers.publish(123), TypeError)
  const pub = reducers.publish([])
  // @ts-expect-error testing invalid subscriber
  assert.throws(() => pub.subscribe(null), TypeError)
})

test('reduce: sync/async callbacks, index argument, and Promise initial accumulator', async () => {
  const input = [10, 20, 30]
  /** @type {number[]} */
  const indices = []
  const fn = (a, v, i) => waitToCall(10 * Math.random(), () => {
    indices.push(i)
    a.push(v)
    return a
  })
  const asyncFnOutput = await chainable(input).reduce(fn, /** @type {number[]} */ ([]))
  assert.deepEqual(asyncFnOutput, input, 'async function called and resolved values collected in order')
  assert.deepEqual(indices, [0, 1, 2], 'reduce passed zero-based index as third argument')

  const syncFnOutput = await chainable(input).reduce((a, v) => { a.push(v); return a }, /** @type {number[]} */ ([]))
  assert.deepEqual(syncFnOutput, input, 'sync function called on each value in order')

  // Promise initial accumulator with non-empty and empty iterables
  const sumNonEmpty = await reducers.reduce((acc, v) => acc + v, Promise.resolve(5), [1, 2, 3])
  assert.equal(sumNonEmpty, 11, 'awaited initial Promise accumulator before first iteration')

  const sumEmpty = await reducers.reduce((acc, v) => acc + v, Promise.resolve(42), [])
  assert.equal(sumEmpty, 42, 'awaited initial Promise accumulator on empty iterable')

  // Rejected initial accumulator does not open iterable
  let opened = false
  const untouchedIterable = {
    [Symbol.iterator] () {
      opened = true
      return [1, 2][Symbol.iterator]()
    }
  }
  await assert.rejects(
    () => reducers.reduce((a, b) => a + b, /** @type {Promise<number>} */ (Promise.reject(new TestError('bad acc'))), untouchedIterable),
    TestError
  )
  assert.equal(opened, false, 'iterable not opened when initial accumulator rejects')
})

test('reduce: closes upstream iterator on error and validates parameters', async () => {
  let closed = false
  const gen = async function * () {
    try {
      yield 1
      yield 2
      yield 3
    } finally {
      closed = true
    }
  }

  await assert.rejects(
    () => reducers.reduce((acc, v) => {
      if (v === 2) throw new TestError('reduce boom')
      return acc + v
    }, 0, gen()),
    TestError
  )
  assert.equal(closed, true, 'upstream iterator closed when reducer threw')

  // @ts-expect-error testing invalid fn on empty iterable
  await assert.rejects(() => reducers.reduce(null, 0, []), TypeError)
  // @ts-expect-error testing missing accumulator in chainable
  await assert.rejects(() => chainable([1, 2]).reduce((a, b) => a + b), TypeError)
  await assert.rejects(() => reducers.reduce((a, b) => a + b, 0, Object.create(null)), TypeError)
})

test('run: start, stop, rapid toggling, cancel, and finished', async () => {
  const allowableJitter = 25
  let startTime = 0
  let stopTime = 0
  /** @type {number[]} */
  const output = []
  let finallyCalled = false

  const poll = new Poll(() => Date.now(), 10, 20)
  const controller = chainable(poll)
    .callNoAwait(x => output.push(x))
    .finally(() => { finallyCalled = true })
    .run()

  controller.stop()
  assert.ok(!controller.running, 'controller not running after stop')
  await wait(35)
  assert.equal(output.length, 0, 'no items pulled while initially stopped')

  await waitToCall(20, () => { controller.start(); startTime = Date.now() })
  assert.ok(controller.running, 'controller running immediately after start')

  await waitToCall(100, () => { controller.stop(); stopTime = Date.now() })
  assert.ok(!controller.running, 'controller not running after second stop')

  // Rapid synchronous start -> running -> stop -> start -> stop toggling while paused
  controller.start()
  assert.equal(controller.running, true, 'running is synchronously true right after start()')
  controller.start() // duplicate start() should be a safe no-op
  assert.equal(controller.running, true)
  controller.stop()
  assert.equal(controller.running, false, 'running is synchronously false right after re-stop()')

  assert.ok(output.length > 0, 'collected poll timestamps while running')
  const waitTimeGood = (n) => (n >= startTime - allowableJitter) && (n <= stopTime + allowableJitter)
  const checks = output.filter(waitTimeGood)
  assert.equal(output.length, checks.length, 'start/stop controlled iteration within tolerance')

  poll.done()
  await controller.cancel()
  assert.equal(finallyCalled, true, 'cancel() closed chain and executed finally()')
  assert.equal(controller.running, false, 'running stays false after cancel()')
})

test('run: normal completion and exception handling via finished', async () => {
  /** @type {number[]} */
  const seen = []
  const ctrl = chainable([1, 2, 3]).callNoAwait(x => seen.push(x)).run()
  await ctrl.finished
  assert.deepEqual(seen, [1, 2, 3])
  assert.equal(ctrl.running, false, 'running becomes false when iterable finishes')
  ctrl.start()
  assert.equal(ctrl.running, false, 'start() after completion is a no-op')

  // Uncaught error rejects finished
  const failing = async function * () {
    yield 1
    throw new TestError('run failure')
  }
  const errCtrl = reducers.run(failing())
  await assert.rejects(() => errCtrl.finished, TestError)
  assert.equal(errCtrl.running, false)

  // Error handled via chainable.catch() resolves finished cleanly
  /** @type {any} */
  let caught = null
  const caughtCtrl = chainable(failing()).catch(e => { caught = e }).run()
  await caughtCtrl.finished
  assert.ok(caught instanceof TestError)
  assert.equal(caughtCtrl.running, false)

  // Sync TypeError on invalid iterable
  // @ts-expect-error testing invalid iterable
  assert.throws(() => reducers.run(undefined), TypeError)
})

test('runAwait: consumes iterables, awaits Promises in sync iterables, and prefers asyncIterator', async () => {
  /** @type {number[]} */
  const output = []
  await chainable([0, 1, 2, 3, 4]).callNoAwait(x => output.push(x)).runAwait()
  assert.deepEqual(output, [0, 1, 2, 3, 4], 'runAwait called everything in order')

  // Awaits Promises yielded by a synchronous iterable
  let resolved = false
  await reducers.runAwait([
    waitToCall(25, () => { resolved = true })
  ])
  assert.equal(resolved, true, 'runAwait awaited Promise inside sync iterable')

  // Propagates rejections from Promises inside a synchronous iterable and closes iterator
  let syncClosed = false
  const syncOfPromises = {
    [Symbol.iterator] () {
      let step = 0
      return {
        next () {
          step++
          if (step === 1) return { value: Promise.reject(new TestError('inner reject')), done: false }
          return { value: Promise.resolve(2), done: false }
        },
        return () {
          syncClosed = true
          return { value: undefined, done: true }
        }
      }
    }
  }
  await assert.rejects(() => reducers.runAwait(syncOfPromises), TestError)
  assert.equal(syncClosed, true, 'sync iterator closed when inner Promise rejected')

  // Prefers [Symbol.asyncIterator] over [Symbol.iterator] on dual iterables
  let usedAsync = false
  const dualIterable = {
    * [Symbol.iterator] () {
      yield 'sync'
    },
    async * [Symbol.asyncIterator] () {
      usedAsync = true
      yield 'async'
    }
  }
  await reducers.runAwait(dualIterable)
  assert.equal(usedAsync, true, 'runAwait preferred Symbol.asyncIterator')

  // Parameter validation
  // @ts-expect-error testing invalid iterable
  await assert.rejects(() => reducers.runAwait(42), TypeError)
})

test('toArray: collects sync/async iterables and validates parameters', async () => {
  const input = [0, 1, 2, 3, 4]
  const output = await chainable(input).toArray()
  assert.deepEqual(output, [0, 1, 2, 3, 4], 'toArray processed each value in order')

  const fromPromises = await reducers.toArray([Promise.resolve('a'), Promise.resolve('b')])
  assert.deepEqual(fromPromises, ['a', 'b'], 'toArray unwrapped Promises in sync iterable')

  // @ts-expect-error testing invalid iterable
  await assert.rejects(() => reducers.toArray({}), TypeError)
})
