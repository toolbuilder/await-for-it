import test from 'node:test'
import assert from 'node:assert/strict'
import { chainable as sync } from 'iterablefu'
import { randomInt, waitRandomlyToCall, randomlySlowIterator, runTest } from './toofast.js'

test('toofast: randomInt generates non-negative numbers in expected range', () => {
  // Test range with n >= plusOrMinus
  for (let i = 0; i < 100; i++) {
    const val = randomInt(5, 5)
    assert.ok(val >= 0 && val <= 10, `val ${val} within [0, 10]`)
  }

  // Test clamp when n < plusOrMinus (must never be negative)
  for (let i = 0; i < 100; i++) {
    const val = randomInt(2, 5)
    assert.ok(val >= 0 && val <= 7, `val ${val} within [0, 7] and non-negative`)
  }

  // Test zero variance
  assert.equal(randomInt(5, 0), 5, 'zero variance returns n')
  assert.equal(randomInt(0, 0), 0, 'zero n and zero variance returns 0')
})

test('toofast: waitRandomlyToCall resolves to function return value', async () => {
  const result = await waitRandomlyToCall(2, 2, () => 'hello')
  assert.equal(result, 'hello')

  const asyncResult = await waitRandomlyToCall(2, 2, async () => 42)
  assert.equal(asyncResult, 42)
})

test('toofast: randomlySlowIterator preserves all values in order', async () => {
  const input = [10, 20, 30]
  const slow = randomlySlowIterator(2, 2, input)
  const actual = []
  for await (const x of slow) {
    actual.push(x)
  }
  assert.deepEqual(actual, input)
})

test('toofast: runTest detects out-of-order resolution violation', async () => {
  let callCount = 0
  const outOfOrderIterator = {
    [Symbol.asyncIterator] () { return this },
    next () {
      const id = callCount++
      if (id === 0) {
        return new Promise(resolve => setTimeout(() => resolve({ value: 0, done: false }), 40))
      } else if (id === 1) {
        return new Promise(resolve => setTimeout(() => resolve({ value: 1, done: false }), 5))
      } else {
        return Promise.resolve({ value: undefined, done: true })
      }
    }
  }

  await assert.rejects(
    async () => {
      await runTest(outOfOrderIterator, 2)
    },
    /Iterator violated FIFO order/
  )
})

test('toofast: runTest detects violation when iterator yields after done: true', async () => {
  let callCount = 0
  const badDoneIterator = {
    [Symbol.asyncIterator] () { return this },
    next () {
      const id = callCount++
      if (id === 0) {
        return Promise.resolve({ value: 0, done: false })
      } else if (id === 1) {
        return Promise.resolve({ value: undefined, done: true })
      } else {
        // Violated: yields value after done: true
        return Promise.resolve({ value: 999, done: false })
      }
    }
  }

  await assert.rejects(
    async () => {
      await runTest(badDoneIterator, 2)
    },
    /must also have done: true/
  )
})

test('toofast: runTest passes valid async generator under rapid next calls', async () => {
  const expected = sync.range(15).toArray()
  const gen = async function * () {
    for (const x of expected) {
      await new Promise(resolve => setTimeout(resolve, 2))
      yield x
    }
  }
  const actual = await runTest(gen(), 15)
  assert.deepEqual(actual, expected)
})

