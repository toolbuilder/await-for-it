import test from 'node:test'
import assert from 'node:assert/strict'
import { generators } from 'iterablefu'
import { chainable, transforms, reducers, wait } from '../src/await-for-it.js'

const randomInt = (maxInt) => Math.floor(Math.random() * Math.floor(maxInt))

const makeTestRunner = (transformName) => {
  return async testParameters => {
    const [name, inputIterable, inputParameters, expectedOutput] = testParameters
    const actual = await chainable(inputIterable)[transformName](...inputParameters).toArray()
    assert.deepEqual(actual, expectedOutput, name)
  }
}

test('arrayToObject', async () => {
  /** @type {any[]} */
  const tests = [
    // format: [testName, inputIterable, input parameter array, expectedOutput]
    [
      'converts sequence of arrays to sequence of objects',
      [['George', 22], ['Betty', 18], ['Grandpa', 89], ['Sally', 42]],
      [['name', 'age']],
      [
        { name: 'George', age: 22 },
        { name: 'Betty', age: 18 },
        { name: 'Grandpa', age: 89 },
        { name: 'Sally', age: 42 }
      ]
    ],
    [
      'properties with no matching array element are set to undefined',
      [['George'], ['Betty', 18], ['Grandpa'], ['Sally', 42]],
      [['name', 'age']],
      [
        { name: 'George', age: undefined },
        { name: 'Betty', age: 18 },
        { name: 'Grandpa', age: undefined },
        { name: 'Sally', age: 42 }
      ]
    ],
    [
      'arrays with no matching property are ignored',
      [['George', 22, 45], ['Betty', 18, 63], ['Grandpa', 89], ['Sally', 42]],
      [['name', 'age']],
      [
        { name: 'George', age: 22 },
        { name: 'Betty', age: 18 },
        { name: 'Grandpa', age: 89 },
        { name: 'Sally', age: 42 }
      ]
    ]
  ]
  await chainable(tests).forEach(makeTestRunner('arrayToObject'))
})

test('callAwait', async () => {
  /** @type {number[]} */
  const callOutput = []
  const fn = async x => { await wait(50); callOutput.push(x) }
  const passing = await chainable([0, 1, 2, 3, 4])
    .callAwait(fn)
    // if callAwait waited, the last element of output should match the input to map
    .map(x => ([x, callOutput[callOutput.length - 1]]))
    .map(([x, y]) => x === y)
    .filter(bool => bool === true)
    .toArray()
  assert.equal(passing.length, 5, 'callAwait waited each time fn was called')

  const output = await chainable([0, 1, 2, 3, 4])
    .callAwait(x => x * x)
    .toArray()

  assert.deepEqual(output, [0, 1, 2, 3, 4], 'callAwait passed each value unchanged')
})

test('callNoAwait', async () => {
  /** @type {number[]} */
  const callOutput = []
  const fn = async x => { await wait(50); callOutput.push(x) }
  const passing = await chainable([0, 1, 2, 3, 4])
    .callNoAwait(fn)
    // if callNoAwait waited, the last element of output would match the input to map
    .map(x => ([x, callOutput[callOutput.length - 1]]))
    .map(([x, y]) => x === y)
    .filter(bool => bool === true)
    .toArray()
  assert.ok(passing.length === 0, 'callNoAwait did not await when fn was called')

  const output = await chainable([0, 1, 2, 3, 4])
    .callNoAwait(x => x * x)
    .toArray()

  assert.deepEqual(output, [0, 1, 2, 3, 4], 'callNoAwait passed each value unchanged')
})

test('diff', async () => {
  /** @type {any[]} */
  const tests = [
    // format: [testName, inputIterable, input parameter array, expectedOutput]
    [
      'diff works with synchronous iterables',
      [0, 1, 2, 3, 4],
      [(p, n) => n - p],
      [1, 1, 1, 1]
    ],
    [
      'diff works with asynchronous iterables',
      chainable([0, 1, 2, 3, 4]),
      [(p, n) => n - p],
      [1, 1, 1, 1]
    ],
    [
      'diff works with async functions (previous two cases used sync functions)',
      [0, 1, 2, 3, 4],
      [async (p, n) => n - p],
      [1, 1, 1, 1]
    ],
    [
      'diff returns empty iterable if only one item in input iterable',
      [0],
      [(p, n) => { throw new Error('function should not be called') }],
      []
    ],
    [
      'diff returns empty iterable if input iterable is empty',
      [],
      [(p, n) => { throw new Error('function should not be called') }],
      []
    ]
  ]
  await chainable(tests).forEach(makeTestRunner('diff'))
})

test('filter', async () => {
  const isEvenNumber = x => x % 2 === 0
  const isEvenNumberAsync = async x => x % 2 === 0
  const obj = { ok: true }

  /** @type {any[]} */
  const tests = [
    // format: [testName, inputIterable, input parameter array, expectedOutput]
    [
      'removes elements from sequence when function returns !truthy',
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      [isEvenNumber],
      [0, 2, 4, 6, 8]
    ],
    [
      'passes all elements when function only returns truthy values',
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      [x => true],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    ],
    [
      'works with async filter function',
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      [isEvenNumberAsync],
      [0, 2, 4, 6, 8]
    ],
    [
      'evaluates non-boolean truthy and falsy return values (sync)',
      [0, 1, '', 'hello', null, undefined, false, true, obj, NaN],
      [x => x],
      [1, 'hello', true, obj]
    ],
    [
      'evaluates non-boolean truthy and falsy return values (async)',
      [0, 1, '', 'hello', null, undefined, false, true, obj, NaN],
      [async x => x],
      [1, 'hello', true, obj]
    ]
  ]
  await chainable(tests).forEach(makeTestRunner('filter'))
})

test('flatten: synchronous iterables', async () => {
  const nonSpreadableArray = [1, 2]
  nonSpreadableArray[Symbol.isConcatSpreadable] = false

  const spreadableUint8 = new Uint8Array([7, 8])
  // @ts-ignore
  spreadableUint8[Symbol.isConcatSpreadable] = true

  /** @type {any[]} */
  const tests = [
    // format: [testName, inputIterable, inputParameters, expectedOutput]
    [
      'does not recurse',
      [0, [1, 2, 3], chainable([4, 5, 6]), [['a', 'b'], 7], 8, 9],
      [],
      [0, 1, 2, 3, 4, 5, 6, ['a', 'b'], 7, 8, 9]
    ],
    [
      'does not flatten strings',
      ['Chainable', 'Iterable', 'Sequence', 'Generator', 'Transform'],
      [],
      ['Chainable', 'Iterable', 'Sequence', 'Generator', 'Transform']
    ],
    [
      'does not flatten TypedArray or Buffer',
      [new Uint8Array([1, 2, 3])],
      [],
      [new Uint8Array([1, 2, 3])]
    ],
    [
      'does not flatten Map',
      [new Map([['a', 1], ['b', 2]])],
      [],
      [new Map([['a', 1], ['b', 2]])]
    ],
    [
      'does not flatten URLSearchParams',
      [new URLSearchParams('a=1&b=2')],
      [],
      [new URLSearchParams('a=1&b=2')]
    ],
    [
      'respects Symbol.isConcatSpreadable = false to opt out',
      [[0], nonSpreadableArray, [3]],
      [],
      [0, nonSpreadableArray, 3]
    ],
    [
      'respects Symbol.isConcatSpreadable = true to opt in',
      [[0], spreadableUint8, [9]],
      [],
      [0, 7, 8, 9]
    ]
  ]
  await chainable(tests).forEach(makeTestRunner('flatten'))
})

test('flatten: async iterables', async () => {
  const input = chainable([0, 1, chainable([2, 3, 4]), 5, [6, 7], 'happy!'])
  const output = await input.flatten().toArray()
  assert.deepEqual(output, [0, 1, 2, 3, 4, 5, 6, 7, 'happy!'], 'flattens async and sync iterables')
})

test('flattenRecursive', async () => {
  const nonSpreadable = [[3, 4]]
  nonSpreadable[Symbol.isConcatSpreadable] = false

  /** @type {any[]} */
  const tests = [
    // format: [testName, inputIterable, inputParameters, expectedOutput]
    [
      'recursively flattens async and sync iterables',
      [0, [1, 2, 3], [chainable([4, 5]), [[[6, 7]], [8, 9], 10]], 11, 12],
      [],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    ],
    [
      'does not flatten strings',
      ['Chainable', ['Iterable', chainable(['Sequence', 'Generator'])], String('Transform')],
      [],
      ['Chainable', 'Iterable', 'Sequence', 'Generator', 'Transform']
    ],
    [
      'does not recursively flatten Maps or TypedArrays',
      [[new Uint8Array([1, 2])], [new Map([['k', 'v']])]],
      [],
      [new Uint8Array([1, 2]), new Map([['k', 'v']])]
    ],
    [
      'respects Symbol.isConcatSpreadable = false',
      [1, [2, nonSpreadable]],
      [],
      [1, 2, nonSpreadable]
    ]
  ]

  await chainable(tests).forEach(makeTestRunner('flattenRecursive'))
})

test('map: using sync function', async () => {
  const actual = await chainable([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).map(x => 2 * x).toArray()
  assert.deepEqual(actual, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18], 'each element was mapped')
})

test('map: using async function', async () => {
  const asyncFunction = async x => new Promise(resolve => setTimeout(() => resolve(2 * x), randomInt(100)))
  const actual = await chainable([0, 1, 2, 3, 4]).map(asyncFunction).toArray()
  assert.deepEqual(actual, [0, 2, 4, 6, 8], 'each element was mapped in order')
})

test('mapWith', async () => {
  const asyncGenerator = async function * (iterable) {
    for await (const x of iterable) {
      yield x * x
    }
  }
  const output = await chainable([0, 1, 2, 3]).mapWith(asyncGenerator).toArray()
  assert.deepEqual(output, [0, 1, 4, 9], 'each element was mapped by asyncGenerator')
})

test('nth', async () => {
  let output = await chainable([0, 1, 2, 3, 4]).chunk(2, 100).nth(0).toArray()
  assert.deepEqual(output, [0, 2, 4], 'nth elements were picked')
  output = await chainable([0, 1, 2, 3, 4, 5]).chunk(2, 100).nth(-1).toArray()
  assert.deepEqual(output, [1, 3, 5], 'negative indices work correctly')
})

test('pluck', async () => {
  const output = await chainable([{ a: 1, b: 2 }, { a: 3, b: 4 }]).pluck('a').toArray()
  assert.deepEqual(output, [1, 3], 'correct values were plucked')
})

test('reject', async () => {
  const isEvenNumber = x => x % 2 === 0
  const isEvenNumberAsync = async x => x % 2 === 0
  const obj = { ok: true }

  /** @type {any[]} */
  const tests = [
    // format: [testName, inputIterable, input parameter array, expectedOutput]
    [
      'removes elements when function returns truthy',
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      [isEvenNumber],
      [1, 3, 5, 7, 9]
    ],
    [
      'works with async functions',
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      [isEvenNumberAsync],
      [1, 3, 5, 7, 9]
    ],
    [
      'evaluates non-boolean truthy and falsy return values (sync)',
      [0, 1, '', 'hello', null, undefined, false, true, obj, NaN],
      [x => x],
      [0, '', null, undefined, false, NaN]
    ],
    [
      'evaluates non-boolean truthy and falsy return values (async)',
      [0, 1, '', 'hello', null, undefined, false, true, obj, NaN],
      [async x => x],
      [0, '', null, undefined, false, NaN]
    ]
  ]
  await chainable(tests).forEach(makeTestRunner('reject'))
})

test('take', async () => {
  let output = await chainable([0, 1, 2, 3, 4, 5, 6, 7, 8]).take(5).toArray()
  assert.deepEqual(output.length, 5, 'only takes up to n values when iterable is longer than n')
  assert.deepEqual(output, [0, 1, 2, 3, 4], 'takes values in the proper order')

  output = await chainable([0, 1, 2]).take(5).toArray()
  assert.deepEqual(output.length, 3, 'takes the entire iterable if iterable shorter than n')
  assert.deepEqual(output, [0, 1, 2], 'values are taken in order')
})

const waitTimeGood = (n, reference) => (n > reference - 15) && (n < reference + 15)

test('throttle: passes all values without change', async () => {
  const throttlePeriod = 50
  const items = 10
  const output = await chainable(generators.range(items))
    .throttle(throttlePeriod, 0)
    .toArray()
  assert.deepEqual(output, [...generators.range(items)], 'throttle passes all items unchanged')
})

test('throttle: restricts rate of iteration', async () => {
  const throttlePeriod = 100
  const items = 5
  const output = await chainable(generators.range(items))
    .throttle(throttlePeriod, 0)
    .map(n => Date.now())
    .diff((previousTime, now) => now - previousTime)
    .filter(duration => waitTimeGood(duration, throttlePeriod))
    .toArray()
  assert.equal(output.length, items - 1, 'throttle restricted rate of iteration')
})

test('throttle: slow iteration restricts rate of iteration', async () => {
  const throttlePeriod = 50
  const items = 10
  const output = await chainable(generators.range(items))
    .throttle(throttlePeriod, 0) // <-- this is the one under test
    .map(n => Date.now())
    .throttle(2 * throttlePeriod, 0) // this one is restricting iteration rate
    .diff((previousTime, now) => now - previousTime)
    .filter(duration => waitTimeGood(duration, 2 * throttlePeriod))
    .toArray()
  // if throttle not implemented correctly, you'll see 3 * throttlePeriod delays
  assert.equal(output.length, items - 1, 'iteration restricted the rate of throttle')
})

test('throttle: will wait for initial wait period before yielding first item', async () => {
  const throttlePeriod = 50
  const initialWait = 100
  const startTime = Date.now()
  const output = await chainable([0, 1, 2, 3])
    .throttle(throttlePeriod, initialWait)
    .map(n => Date.now())
    .toArray()
  assert.ok(waitTimeGood(output[0] - startTime, 100), 'throttle waiting initial wait time')
})

test('transforms: functional pluck, nth, and arrayToObject support primitives and sync iterables of promises', async () => {
  const lengths = await reducers.toArray(transforms.pluck('length', ['a', 'bcd']))
  /** @type {number[]} */
  const checkLengths = lengths
  assert.deepEqual(checkLengths, [1, 3])

  const promisedObjs = [Promise.resolve({ id: 10 }), Promise.resolve({ id: 20 })]
  const ids = await reducers.toArray(transforms.pluck('id', promisedObjs))
  /** @type {number[]} */
  const checkIds = ids
  assert.deepEqual(checkIds, [10, 20])

  const promisedRows = [Promise.resolve(['x', 'y']), Promise.resolve(['z', 'w'])]
  const seconds = await reducers.toArray(transforms.nth(1, promisedRows))
  /** @type {string[]} */
  const checkSeconds = seconds
  assert.deepEqual(checkSeconds, ['y', 'w'])

  const mappedObjs = await reducers.toArray(transforms.arrayToObject(['first', 'second'], promisedRows))
  assert.deepEqual(mappedObjs, [{ first: 'x', second: 'y' }, { first: 'z', second: 'w' }])
})
