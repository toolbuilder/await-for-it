import test from 'node:test'
import assert from 'node:assert/strict'
import { isSyncIterable } from '../src/is.js'

test('isSyncIterable: recognizes synchronous iterables', () => {
  assert.equal(isSyncIterable([]), true, 'Array is sync iterable')
  assert.equal(isSyncIterable(new Set([1, 2])), true, 'Set is sync iterable')
  assert.equal(isSyncIterable(new Map()), true, 'Map is sync iterable')
  assert.equal(isSyncIterable('hello'), true, 'non-empty string is sync iterable')
  assert.equal(isSyncIterable(''), true, 'empty string is sync iterable')
  assert.equal(isSyncIterable(new String('hello')), true, 'String object is sync iterable')
  assert.equal(isSyncIterable(new String('')), true, 'empty String object is sync iterable')

  const customIterable = {
    *[Symbol.iterator]() {
      yield 1
    }
  }
  assert.equal(isSyncIterable(customIterable), true, 'custom iterable is sync iterable')
})

test('isSyncIterable: rejects non-iterables', () => {
  assert.equal(isSyncIterable(null), false, 'null is not sync iterable')
  assert.equal(isSyncIterable(undefined), false, 'undefined is not sync iterable')
  assert.equal(isSyncIterable(0), false, 'number 0 is not sync iterable')
  assert.equal(isSyncIterable(42), false, 'number 42 is not sync iterable')
  assert.equal(isSyncIterable(false), false, 'boolean false is not sync iterable')
  assert.equal(isSyncIterable(true), false, 'boolean true is not sync iterable')
  assert.equal(isSyncIterable(Symbol('test')), false, 'symbol is not sync iterable')
  assert.equal(isSyncIterable({}), false, 'plain object is not sync iterable')
  assert.equal(isSyncIterable({ [Symbol.iterator]: null }), false, 'object with null iterator is not sync iterable')
  assert.equal(isSyncIterable({ next: () => ({ done: true }) }), false, 'plain iterator without Symbol.iterator is not sync iterable')
})

