import { toAsync } from '../src/generators.js'
import { flatten, map, pool, throttle } from '../src/transforms.js'
import { toArray } from '../src/reducers.js'
import { chainable } from 'iterablefu/src/chainable.js'
import tape from 'tape'

const slowIterator = (asyncIterable) => throttle(100, true, asyncIterable)
const fastIterator = (asyncIterable) => asyncIterable

const makeSlowAsyncFunction = (score) => {
  const delay = 100
  const promiseCount = score.promises++
  return () => { score.calls++; return new Promise(resolve => setTimeout(() => { score.resolves++; resolve(promiseCount) }, delay)) }
}

const makeFastAsyncFunction = (score) => {
  const promiseCount = score.promises++
  return () => { score.calls++; score.resolves++; return Promise.resolve(promiseCount) }
}

tape('pool: slow iterator, fast asyncFunction, fast asyncIterable', async test => {
  const count = 10
  const maxPoolSize = 5
  let poolSize = 0
  const tracker = { promises: 0, calls: 0, resolves: 0 }
  const asyncIterable = toAsync(chainable.range(count).map(() => makeFastAsyncFunction(tracker)))
  const fn = (value) => {
    const unresolved = tracker.calls - tracker.resolves
    poolSize = Math.max(poolSize, unresolved)
    return value
  }
  const output = await toArray(slowIterator(pool(maxPoolSize, map(fn, asyncIterable))))
  test.true(poolSize <= maxPoolSize, 'pool size did not exceed maxPoolSize')
  test.deepEqual(tracker.promises, tracker.calls, 'all the asyncFunctions were called')
  test.deepEqual(output.sort(), chainable.range(count).toArray(), 'return value of all asyncFunctions is returned')
  test.end()
})

tape('pool: fast iterator, fast asyncIterable, slow asyncFunction', async test => {
  const count = 10
  let poolSize = 0
  const maxPoolSize = 5
  const tracker = { promises: 0, calls: 0, resolves: 0 }
  const asyncIterable = toAsync(chainable.range(count).map(() => makeSlowAsyncFunction(tracker)))
  const fn = (value) => {
    const unresolved = tracker.calls - tracker.resolves
    poolSize = Math.max(poolSize, unresolved)
    return value
  }
  const output = await toArray(fastIterator(pool(maxPoolSize, map(fn, asyncIterable))))
  test.true(poolSize <= maxPoolSize, 'pool size did not exceed maxPoolSize')
  test.deepEqual(tracker.promises, tracker.calls, 'all the asyncFunctions were called')
  test.deepEqual(output.sort(), chainable.range(count).toArray(), 'return value of all asyncFunctions is returned')
  test.end()
})

tape('pool: fast iterator, slow asyncIterable, fast asyncFunction', async test => {
  const tracker = { count: 10, poolSize: 0, maxPoolSize: 5, promises: 0, calls: 0, resolves: 0 }
  const asyncIterable = throttle(100, true, toAsync(chainable.range(tracker.count).map(() => makeFastAsyncFunction(tracker))))
  const fn = (value) => {
    const unresolved = tracker.calls - tracker.resolves
    tracker.poolSize = Math.max(tracker.poolSize, unresolved)
    return value
  }
  const output = await toArray(fastIterator(pool(tracker.maxPoolSize, map(fn, asyncIterable))))
  test.true(tracker.poolSize < 2, 'pool does not fill because asyncIterator is slow compared to asyncFunction')
  test.deepEqual(tracker.promises, tracker.calls, 'all the asyncFunctions were called')
  test.deepEqual(output.sort(), chainable.range(tracker.count).toArray(), 'return value of all asyncFunctions is returned')
  test.end()
})

tape('pool: fast iterator, fast SYNC iterable, fast asyncFunction', async test => {
  const tracker = { count: 10, poolSize: 0, maxPoolSize: 5, promises: 0, calls: 0, resolves: 0 }
  const syncIterable = chainable.range(tracker.count).map(() => makeFastAsyncFunction(tracker))
  const fn = (value) => {
    const unresolved = tracker.calls - tracker.resolves
    tracker.poolSize = Math.max(tracker.poolSize, unresolved)
    return value
  }
  const output = await toArray(fastIterator(map(fn, pool(tracker.maxPoolSize, syncIterable))))
  test.true(tracker.poolSize < 2, 'pool does not fill')
  test.deepEqual(tracker.promises, tracker.calls, 'all the asyncFunctions were called')
  test.deepEqual(output.sort(), chainable.range(tracker.count).toArray(), 'return value of all asyncFunctions is returned')
  test.end()
})

tape('pool: input iterable can provide async functions, sync functions, Promises, and other values', async test => {
  const iterable = [0, Promise.resolve(1), toAsync([2, 3]), [4, 5], '6', async () => 7, () => 8, { toString: () => 9 }]
  const output = await toArray(map(x => parseInt(x), flatten(pool(5, iterable))))
  test.deepEqual(output, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 'all values processed correctly')
  test.end()
})

class TestError extends Error {}

tape('pool: asyncIterable exceptions propagates to iterator', async test => {
  const theError = new TestError('No more iterating for you!')
  const poolsize = 5
  const tracker = { promises: 0, calls: 0, resolves: 0 }
  const throwingAsyncIterable = async function * () {
    yield makeFastAsyncFunction(tracker)
    yield makeFastAsyncFunction(tracker)
    throw theError
  }
  try {
    await toArray(pool(poolsize, throwingAsyncIterable()))
  } catch (error) {
    test.is(error, theError, 'thrown error was caught directly')
    test.end()
  }
})

tape('pool: async function rejection propagates to iterator', async test => {
  const theError = new TestError('REJECTED')
  const poolsize = 5
  const tracker = { promises: 0, calls: 0, resolves: 0 }
  const throwingAsyncIterable = async function * () {
    yield makeFastAsyncFunction(tracker)
    yield makeFastAsyncFunction(tracker)
    yield () => new Promise((resolve, reject) => setTimeout(() => reject(theError), 1000))
  }
  try {
    await toArray(pool(poolsize, throwingAsyncIterable()))
  } catch (error) {
    test.is(error, theError, 'the thrown error was caught directly')
    test.end()
  }
})

tape('pool: values from async functions are yielded when resolved', async test => {
  const randomInt = (maxInt) => Math.floor(Math.random() * Math.floor(maxInt))
  const makeVariableAsyncFunction = (tracker) => {
    const delay = randomInt(500)
    const promiseCount = tracker.promises++
    return () => { tracker.calls++; return new Promise(resolve => setTimeout(() => { tracker.resolves++; resolve(promiseCount) }, delay)) }
  }
  const count = 10
  const maxPoolSize = 5
  let poolSize = 0
  const tracker = { promises: 0, calls: 0, resolves: 0 }
  const asyncIterable = toAsync(chainable.range(count).map(() => makeVariableAsyncFunction(tracker)))
  const fn = (value) => {
    const unresolved = tracker.calls - tracker.resolves
    poolSize = Math.max(poolSize, unresolved)
    return value
  }
  const output = await toArray(fastIterator(pool(maxPoolSize, map(fn, asyncIterable))))
  test.true(poolSize <= maxPoolSize, 'pool size did not exceed maxPoolSize')
  test.deepEqual(tracker.promises, tracker.calls, 'all the async functions were called')
  // want to ensure that output was resolved out of order with respect to input
  // JSON.stringify is good enough in this instance to use as deep equal
  const notEqual = JSON.stringify(output) !== JSON.stringify(chainable.range(count).toArray())
  test.true(notEqual, 'some async function results were yielded out of order with respect to asyncIterable')
  test.deepEqual(output.sort(), chainable.range(count).toArray(), 'return value of all async functions is returned')
  test.end()
})
