import test from 'node:test'
import assert from 'node:assert/strict'
import { isFunction, isSyncIterable } from '../src/is.js'

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

test('isFunction: recognizes callable functions', () => {
  assert.equal(isFunction(() => {}), true, 'arrow function is a function')
  assert.equal(isFunction(function() {}), true, 'regular function is a function')
  assert.equal(isFunction(async () => {}), true, 'async arrow function is a function')
  assert.equal(isFunction(async function() {}), true, 'async function is a function')
  assert.equal(isFunction(function* () {}), true, 'generator function is a function')
  assert.equal(isFunction(async function* () {}), true, 'async generator function is a function')
  assert.equal(isFunction(Array), true, 'Array constructor is a function')
  assert.equal(isFunction(Object), true, 'Object constructor is a function')
  assert.equal(isFunction(Math.max), true, 'built-in function is a function')
})

test('isFunction: rejects ES6 classes and non-functions', () => {
  class TestClass {}
  class SubClass extends TestClass {}
  assert.equal(isFunction(TestClass), false, 'named ES6 class is rejected')
  assert.equal(isFunction(class {}), false, 'anonymous ES6 class is rejected')
  assert.equal(isFunction(SubClass), false, 'subclass is rejected')

  assert.equal(isFunction(null), false, 'null is not a function')
  assert.equal(isFunction(undefined), false, 'undefined is not a function')
  assert.equal(isFunction(0), false, 'number 0 is not a function')
  assert.equal(isFunction(42), false, 'number 42 is not a function')
  assert.equal(isFunction(''), false, 'empty string is not a function')
  assert.equal(isFunction('function'), false, 'string is not a function')
  assert.equal(isFunction(false), false, 'boolean is not a function')
  assert.equal(isFunction(Symbol('fn')), false, 'symbol is not a function')
  assert.equal(isFunction({}), false, 'plain object is not a function')
  assert.equal(isFunction([]), false, 'array is not a function')
})


