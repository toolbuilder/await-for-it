import { chainable, Poll } from '../src/chainable.js'
import { waitToCall } from '../src/timeouts.js'
import { ChainableIterable } from 'iterablefu'
import tape from 'tape'

tape('forEach', async test => {
  const input = [0, 1, 2, 3, 4]
  const accumulator = []
  await chainable(input).forEach((x, i) => accumulator.push([x, i]))
  const matchingLength = ChainableIterable
    .from(accumulator)
    .filter(array => array[0] === array[1])
    .toArray()
    .length
  test.equal(matchingLength, accumulator.length, 'forEach provided index value correctly')
  const output = ChainableIterable
    .from(accumulator)
    .nth(0)
    .toArray()
  test.deepEqual(output, input, 'forEach processed each value in order')
  test.end()
})

tape('reduce', async test => {
  const input = [0, 1, 2, 3, 4]
  const fn = (a, v) => waitToCall(20 * Math.random(), () => { a.push(v); return a })
  const asyncFnOutput = await chainable(input).reduce(fn, [])
  test.deepEqual(asyncFnOutput, input, 'async function called and resolved values were collected in order')

  const syncFnOutput = await chainable(input).reduce((a, v) => { a.push(v); return a }, [])
  test.deepEqual(syncFnOutput, input, 'sync function called on each value in order')
  test.end()
})

tape('run', async test => {
  const allowableJitter = 20
  let startTime
  let stopTime
  const output = []
  const poll = new Poll(() => Date.now(), 10, 50)
  const controller = chainable(poll).callNoAwait(x => output.push(x)).run()
  controller.stop()
  test.false(controller.running, 'controller not running after stop')
  await waitToCall(50, () => { controller.start(); startTime = Date.now() })
  test.true(controller.running, 'controller running after start')
  await waitToCall(100, () => { controller.stop(); stopTime = Date.now() })
  test.false(controller.running, 'controller not running after second stop')
  const waitTimeGood = (n) => (n > startTime - allowableJitter) && (n < stopTime + allowableJitter)
  const checks = await chainable(output).filter(timestamp => waitTimeGood(timestamp)).toArray()
  test.equal(output.length, checks.length, 'start/stop was controlled iteration within tolerance')
  test.end()
})

tape('runAwait', async test => {
  const output = []
  await chainable([0, 1, 2, 3, 4]).callNoAwait(x => output.push(x)).runAwait()
  test.deepEqual(output, [0, 1, 2, 3, 4], 'runAwait called everything in order') // and obviously it waited
  test.end()
})

tape('toArray', async test => {
  const input = [0, 1, 2, 3, 4]
  const output = await chainable(input).toArray()
  test.deepEqual(output, [0, 1, 2, 3, 4], 'toArray processed each value in order')
  test.end()
})
