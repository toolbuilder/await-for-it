import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { isAsyncIterable, isFunction, isString, isSyncIterable } from '../src/is.js'

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

test('isString: recognizes primitive and boxed strings across realms', () => {
  assert.equal(isString('hello'), true, 'primitive string is recognized')
  assert.equal(isString(''), true, 'empty primitive string is recognized')
  assert.equal(isString(new String('hello')), true, 'boxed string object is recognized')
  assert.equal(isString(new String('')), true, 'empty boxed string object is recognized')

  const crossRealmString = vm.runInNewContext("new String('hello from realm')")
  const crossRealmEmptyString = vm.runInNewContext("new String('')")
  assert.equal(isString(crossRealmString), true, 'cross-realm boxed string is recognized')
  assert.equal(isString(crossRealmEmptyString), true, 'cross-realm empty boxed string is recognized')
})

test('isString: rejects non-strings and spoofed objects', () => {
  assert.equal(isString({ [Symbol.toStringTag]: 'String' }), false, 'rejects spoofed Symbol.toStringTag')
  assert.equal(isString({ valueOf: () => 'fake string' }), false, 'rejects custom valueOf')
  assert.equal(isString(new Number(123)), false, 'rejects boxed Number')
  assert.equal(isString(new Boolean(true)), false, 'rejects boxed Boolean')

  assert.equal(isString(null), false, 'rejects null')
  assert.equal(isString(undefined), false, 'rejects undefined')
  assert.equal(isString(0), false, 'rejects number 0')
  assert.equal(isString(123), false, 'rejects number 123')
  assert.equal(isString(false), false, 'rejects boolean false')
  assert.equal(isString(true), false, 'rejects boolean true')
  assert.equal(isString(Symbol('str')), false, 'rejects symbol')
  assert.equal(isString({}), false, 'rejects plain object')
  assert.equal(isString([]), false, 'rejects array')
  assert.equal(isString(() => {}), false, 'rejects function')
})

test('isAsyncIterable: recognizes asynchronous iterables', () => {
  const asyncGen = (async function* () {
    yield 1
  })()
  assert.equal(isAsyncIterable(asyncGen), true, 'async generator instance is async iterable')

  const customAsyncIterable = {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          return { done: true, value: undefined }
        }
      }
    }
  }
  assert.equal(isAsyncIterable(customAsyncIterable), true, 'custom async iterable is async iterable')

  if (typeof ReadableStream !== 'undefined') {
    const stream = new ReadableStream()
    assert.equal(isAsyncIterable(stream), true, 'ReadableStream is async iterable')
  }
})

test('isAsyncIterable: rejects non-async-iterables', () => {
  // Synchronous iterables are not AsyncIterables
  assert.equal(isAsyncIterable([]), false, 'Array is not async iterable')
  assert.equal(isAsyncIterable(new Set()), false, 'Set is not async iterable')
  assert.equal(isAsyncIterable(new Map()), false, 'Map is not async iterable')
  assert.equal(isAsyncIterable('hello'), false, 'string is not async iterable')
  assert.equal(isAsyncIterable(''), false, 'empty string is not async iterable')
  assert.equal(isAsyncIterable((function* () {})()), false, 'sync generator is not async iterable')

  // Iterators without Symbol.asyncIterator
  assert.equal(isAsyncIterable({ next: async () => ({ done: true }) }), false, 'plain async iterator without Symbol.asyncIterator')
  assert.equal(isAsyncIterable({ [Symbol.asyncIterator]: null }), false, 'object with null Symbol.asyncIterator')
  assert.equal(isAsyncIterable({ [Symbol.asyncIterator]: true }), false, 'object with non-function Symbol.asyncIterator')

  // Primitives
  assert.equal(isAsyncIterable(null), false, 'null is not async iterable')
  assert.equal(isAsyncIterable(undefined), false, 'undefined is not async iterable')
  assert.equal(isAsyncIterable(0), false, 'number 0 is not async iterable')
  assert.equal(isAsyncIterable(42), false, 'number 42 is not async iterable')
  assert.equal(isAsyncIterable(false), false, 'boolean false is not async iterable')
  assert.equal(isAsyncIterable(true), false, 'boolean true is not async iterable')
  assert.equal(isAsyncIterable(Symbol('async')), false, 'symbol is not async iterable')

  // Plain objects and functions
  assert.equal(isAsyncIterable({}), false, 'plain object is not async iterable')
  assert.equal(isAsyncIterable(() => {}), false, 'function is not async iterable')
  assert.equal(isAsyncIterable(async () => {}), false, 'async function is not async iterable')
  assert.equal(isAsyncIterable(async function* () {}), false, 'async generator function itself is not async iterable')
})




