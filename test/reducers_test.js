import { chainable, Poll, waitToCall, Semaphore } from '../src/await-for-it'
import { ChainableIterable } from 'iterablefu'
import { test } from 'zora'

test('forEach', async assert => {
  const input = [0, 1, 2, 3, 4]
  const accumulator = []
  await chainable(input).forEach((x, i) => accumulator.push([x, i]))
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
  assert.deepEqual(output, input, 'forEach processed each value in order')
})

test('publish', async assert => {
  const input = [0, 1, 2, 3, 4]
  const output1 = []
  const output2 = []
  const output3 = []

  const semaphore = new Semaphore()
  await semaphore.acquire()
  const control = chainable(input)
    .throttle(50, 50)
    .finally(() => {
      assert.deepEqual(output1, input, 'first subscriber got all data in the right order')
      assert.deepEqual(output2, input, 'second subscriber got all data in the right order')
      assert.deepEqual(output3, [], 'third subscriber was unsubscribed successfully')
      semaphore.release() // indicate that test is over
    })
    .publish()

  control.subscribe(x => output1.push(x))
  control.subscribe(x => output2.push(x))
  const key = control.subscribe(x => output3.push(x))
  control.unsubscribe(key)

  await semaphore.acquire() // wait until test is over
  semaphore.release()
})

test('reduce', async assert => {
  const input = [0, 1, 2, 3, 4]
  const fn = (a, v) => waitToCall(20 * Math.random(), () => { a.push(v); return a })
  const asyncFnOutput = await chainable(input).reduce(fn, [])
  assert.deepEqual(asyncFnOutput, input, 'async function called and resolved values were collected in order')

  const syncFnOutput = await chainable(input).reduce((a, v) => { a.push(v); return a }, [])
  assert.deepEqual(syncFnOutput, input, 'sync function called on each value in order')
})

test('run', async assert => {
  const allowableJitter = 20
  let startTime
  let stopTime
  const output = []
  const poll = new Poll(() => Date.now(), 10, 50)
  const controller = chainable(poll).callNoAwait(x => output.push(x)).run()
  controller.stop()
  assert.notOk(controller.running, 'controller not running after stop')
  await waitToCall(50, () => { controller.start(); startTime = Date.now() })
  assert.ok(controller.running, 'controller running after start')
  await waitToCall(100, () => { controller.stop(); stopTime = Date.now() })
  assert.notOk(controller.running, 'controller not running after second stop')
  const waitTimeGood = (n) => (n > startTime - allowableJitter) && (n < stopTime + allowableJitter)
  const checks = await chainable(output).filter(timestamp => waitTimeGood(timestamp)).toArray()
  assert.equal(output.length, checks.length, 'start/stop was controlled iteration within tolerance')
})

test('runAwait', async assert => {
  const output = []
  await chainable([0, 1, 2, 3, 4]).callNoAwait(x => output.push(x)).runAwait()
  assert.deepEqual(output, [0, 1, 2, 3, 4], 'runAwait called everything in order') // and obviously it waited
})

test('toArray', async assert => {
  const input = [0, 1, 2, 3, 4]
  const output = await chainable(input).toArray()
  assert.deepEqual(output, [0, 1, 2, 3, 4], 'toArray processed each value in order')
})
