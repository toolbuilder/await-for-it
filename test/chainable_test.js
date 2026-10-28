import test from 'node:test'
import assert from 'node:assert/strict'
import { chainable, ChainableClass } from '../src/await-for-it.js'

test('chainable: finally', async () => {
  let testValue = 0
  /** @type {number[]} */
  const testValueChecks = []
  const output = await chainable([0, 1, 2, 3])
    .finally(() => ++testValue)
    .callAwait(() => testValueChecks.push(testValue))
    .toArray()
  assert.deepEqual(output, [0, 1, 2, 3], 'finally passes all values unchanged')
  assert.deepEqual(testValueChecks, [0, 0, 0, 0], 'finally function was not called until after iteration')
  assert.equal(testValue, 1, 'finally function was called once')

  let earlyBreakFinally = 0
  for await (const item of chainable([0, 1, 2, 3]).finally(() => { ++earlyBreakFinally })) {
    if (item === 1) break
  }
  assert.equal(earlyBreakFinally, 1, 'finally function runs on early break from for await...of')
})

class TestError extends Error {}

test('chainable: catch', async () => {
  const theError = new TestError('REJECT')
  let caughtError
  let finallyCalled
  const throwingIterable = async function * () {
    yield 1
    yield new Promise(resolve => setTimeout(() => resolve(2), 50))
    throw theError
  }

  await chainable(throwingIterable())
    .catch(error => { caughtError = error })
    .finally(() => { finallyCalled = true })
    .toArray()
  assert.equal(caughtError, theError, 'throws from iterables are caught')
  assert.equal(finallyCalled, true, 'finally was still called')

  caughtError = false
  finallyCalled = false
  try {
    await chainable(throwingIterable())
      .catch(error => { throw error })
      .finally(() => { finallyCalled = true })
      .toArray()
  } catch (error) {
    caughtError = true // eslint-disable-line
    assert.equal(error, theError, 'rethrows from catch are catchable')
  }
  assert.ok(caughtError, 'rethrown exception caught')
  assert.equal(finallyCalled, true, 'finally was still called')

  caughtError = null // eslint-disable-line
  const output = await chainable([0, 1, 2, 3, 4])
    .catch(error => { caughtError = error })
    .toArray()

  assert.deepEqual(output, [0, 1, 2, 3, 4], 'catch passes values unchanged')
  assert.equal(caughtError, null, 'catch function was not called when no exception')
})

test('ChainableClass: constructor, instanceof, subclassing, and static methods', async () => {
  const fromFactory = chainable([1, 2, 3])
  const fromCtor = new ChainableClass([1, 2, 3])

  assert.ok(fromFactory instanceof ChainableClass, 'chainable() returns ChainableClass instance')
  assert.ok(fromCtor instanceof ChainableClass, 'new ChainableClass() returns ChainableClass instance')
  assert.deepEqual(await fromCtor.map(x => x * 2).toArray(), [2, 4, 6])

  assert.ok(chainable.from([1]) instanceof ChainableClass)
  assert.ok(chainable.range(2) instanceof ChainableClass)
  assert.ok(chainable.merge([1], [2]) instanceof ChainableClass)
  assert.ok(chainable.zip([1], ['a']) instanceof ChainableClass)
  assert.ok(chainable.zipAll([1], ['a']) instanceof ChainableClass)

  assert.deepEqual(await ChainableClass.from([1, 2]).toArray(), [1, 2])
  assert.deepEqual(await ChainableClass.range(1, 4).toArray(), [1, 2, 3])
  assert.deepEqual((await ChainableClass.merge([1, 2], [3]).toArray()).sort(), [1, 2, 3])
  assert.deepEqual(await ChainableClass.zip([1, 2], ['a']).toArray(), [[1, 'a']])
  assert.deepEqual(await ChainableClass.zipAll([1, 2], ['a']).toArray(), [[1, 'a'], [2, undefined]])

  class ExtendedChainable extends ChainableClass {
    double () {
      return this.map(x => x * 2)
    }
  }
  const extended = new ExtendedChainable([1, 2, 3])
  assert.ok(extended instanceof ChainableClass)
  assert.ok(extended instanceof ExtendedChainable)
  assert.deepEqual(await extended.double().toArray(), [2, 4, 6])
})

test('chainable: parameter validation for constructor, catch, and finally', () => {
  for (const badIterable of [null, undefined, 123, {}]) {
    // @ts-ignore
    assert.throws(() => chainable(badIterable), TypeError)
    // @ts-ignore
    assert.throws(() => new ChainableClass(badIterable), TypeError)
  }

  const it = chainable([1, 2, 3])
  for (const badFn of [null, undefined, 123, 'not a fn', {}]) {
    // @ts-ignore
    assert.throws(() => it.catch(badFn), TypeError)
    // @ts-ignore
    assert.throws(() => it.finally(badFn), TypeError)
  }
})

test('chainable: direct async iteration and timed merge', async () => {
  /** @type {number[]} */
  const unwrapped = []
  for await (const value of chainable([Promise.resolve(10), Promise.resolve(20)])) {
    unwrapped.push(value)
  }
  assert.deepEqual(unwrapped, [10, 20], 'for await...of unwraps promises in sync iterables')

  const slow = chainable(['slow1', 'slow2']).throttle(60, 60)
  const fast = chainable(['fast1', 'fast2']).throttle(10, 10)
  const merged = await chainable.merge(slow, fast).toArray()
  assert.deepEqual(merged, ['fast1', 'fast2', 'slow1', 'slow2'], 'faster stream yields ahead of slower stream')
})

test('chainable: static and instance type inference', async () => {
  const asyncStrings = async function * () {
    yield 'a'
    yield 'b'
  }

  // Mixed sync + async merge preserves union element type rather than degrading to any
  const merged = await chainable.merge([1, 2], asyncStrings()).toArray()
  /** @type {(number | string)[]} */
  const checkMerged = merged
  assert.equal(checkMerged.length, 4)
  // @ts-expect-error - merged is (number | string)[], not any[]
  const invalidMerged = /** @type {(x: boolean[]) => void} */ (() => {})(merged)
  void invalidMerged

  // zip infers tuple element types
  const zipped = await chainable.zip([1, 2], ['a', 'b', 'c']).toArray()
  /** @type {[number, string][]} */
  const checkZipped = zipped
  assert.deepEqual(checkZipped, [[1, 'a'], [2, 'b']])
  // @ts-expect-error - zipped is [number, string][], not any[]
  const invalidZipped = /** @type {(x: [boolean, boolean][]) => void} */ (() => {})(zipped)
  void invalidZipped

  // zipAll infers tuple element types padded with undefined
  const zippedAll = await chainable.zipAll([1, 2], ['a', 'b', 'c']).toArray()
  /** @type {[number | undefined, string | undefined][]} */
  const checkZippedAll = zippedAll
  assert.deepEqual(checkZippedAll, [[1, 'a'], [2, 'b'], [undefined, 'c']])
  // @ts-expect-error - zipAll elements include undefined under strictNullChecks
  const invalidZippedAll = /** @type {(x: [number, string][]) => void} */ (() => {})(zippedAll)
  void invalidZippedAll

  // filter narrows element type when given a type predicate
  /** @type {(number | string)[]} */
  const mixedItems = [1, 'two', 3, 'four']
  const stringsOnly = await chainable(mixedItems).filter(x => typeof x === 'string').toArray()
  /** @type {string[]} */
  const checkStrings = stringsOnly
  assert.deepEqual(checkStrings, ['two', 'four'])
  // @ts-expect-error - narrowed to string[], not (number | string)[] or any[]
  const invalidStrings = /** @type {(x: number[]) => void} */ (() => {})(stringsOnly)
  void invalidStrings

  // arrayToObject supports symbol keys via Record<PropertyKey, any>
  const sym = Symbol('key')
  const objects = await chainable([[42]]).arrayToObject([sym]).toArray()
  assert.equal(objects[0][sym], 42)

  // Compile-time arity and factory-only guards (never executed at runtime)
  const compileTimeChecks = () => {
    // @ts-expect-error - chainable is a pure factory function, not constructable with new
    void new chainable([1, 2])
    // @ts-expect-error - iterable is required in chainable(iterable)
    chainable()
    // @ts-expect-error - iterable is required in new ChainableClass(iterable)
    void new ChainableClass()
    // @ts-expect-error - range accepts at most 3 arguments
    chainable.range(1, 2, 3, 4)
  }
  assert.equal(typeof compileTimeChecks, 'function')
})

test('chainable: Node.js Readable streams and stream.pipeline', async () => {
  const { Readable, Writable } = await import('node:stream')
  const { pipeline } = await import('node:stream/promises')

  // Direct consumption: Readable streams are async iterables
  const stream = Readable.from(['apple', 'banana', 'cherry'])
  const results = await chainable(stream)
    .map(x => x.toUpperCase())
    .toArray()
  assert.deepEqual(results, ['APPLE', 'BANANA', 'CHERRY'])

  // Pipeline integration: chainable is an async iterable accepted by pipeline
  const source = Readable.from(['hello ', 'world\n'])
  /** @type {string[]} */
  const chunks = []
  const dest = new Writable({
    write(chunk, encoding, callback) {
      chunks.push(chunk.toString())
      callback()
    }
  })
  await pipeline(
    chainable(source).map(x => x.toUpperCase()),
    dest
  )
  assert.deepEqual(chunks, ['HELLO ', 'WORLD\n'])
})
