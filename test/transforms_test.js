import { test } from 'zora'
import { generators } from 'iterablefu'
import { chainable, wait } from '../src/await-for-it.js'

const randomInt = (maxInt) => Math.floor(Math.random() * Math.floor(maxInt))

const makeTestRunner = (transformName, test) => {
  return async testParameters => {
    const [name, inputIterable, inputParameters, expectedOutput] = testParameters
    const actual = await chainable(inputIterable)[transformName](...inputParameters).toArray()
    test.deepEqual(actual, expectedOutput, name)
  }
}

test('arrayToObject', async assert => {
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
  await chainable(tests).forEach(makeTestRunner('arrayToObject', assert))
})

test('callAwait', async assert => {
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

test('callNoAwait', async assert => {
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

test('diff', async assert => {
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
  await chainable(tests).forEach(makeTestRunner('diff', assert))
})

test('filter', async assert => {
  const isEvenNumber = x => x % 2 === 0

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
    ]
  ]
  await chainable(tests).forEach(makeTestRunner('filter', assert))
})

test('flatten: synchronous iterables', async assert => {
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
    ]
  ]
  await chainable(tests).forEach(makeTestRunner('flatten', assert))
})

test('flatten: async iterables', async assert => {
  const input = chainable([0, 1, chainable([2, 3, 4]), 5, [6, 7], 'happy!'])
  const output = await input.flatten().toArray()
  assert.deepEqual(output, [0, 1, 2, 3, 4, 5, 6, 7, 'happy!'], 'flattens async and sync iterables')
})

test('flattenRecursive', async assert => {
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
    ]
  ]

  await chainable(tests).forEach(makeTestRunner('flattenRecursive', assert))
})

test('map: using sync function', async assert => {
  const actual = await chainable([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).map(x => 2 * x).toArray()
  assert.deepEqual(actual, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18], 'each element was mapped')
})

test('map: using async function', async assert => {
  const asyncFunction = async x => new Promise(resolve => setTimeout(() => resolve(2 * x), randomInt(100)))
  const actual = await chainable([0, 1, 2, 3, 4]).map(asyncFunction).toArray()
  assert.deepEqual(actual, [0, 2, 4, 6, 8], 'each element was mapped in order')
})

test('mapWith', async assert => {
  const asyncGenerator = async function * (iterable) {
    for await (const x of iterable) {
      yield x * x
    }
  }
  const output = await chainable([0, 1, 2, 3]).mapWith(asyncGenerator).toArray()
  assert.deepEqual(output, [0, 1, 4, 9], 'each element was mapped by asyncGenerator')
})

test('nth', async assert => {
  let output = await chainable([0, 1, 2, 3, 4]).chunk(2, 100).nth(0).toArray()
  assert.deepEqual(output, [0, 2, 4], 'nth elements were picked')
  output = await chainable([0, 1, 2, 3, 4, 5]).chunk(2, 100).nth(-1).toArray()
  assert.deepEqual(output, [1, 3, 5], 'negative indices work correctly')
})

test('pluck', async assert => {
  const output = await chainable([{ a: 1, b: 2 }, { a: 3, b: 4 }]).pluck('a').toArray()
  assert.deepEqual(output, [1, 3], 'correct values were plucked')
})

test('reject', async assert => {
  const isEvenNumber = x => x % 2 === 0

  const tests = [
    // format: [testName, inputIterable, input parameter array, expectedOutput]
    [
      'removes elements when function returns truthy',
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      [isEvenNumber],
      [1, 3, 5, 7, 9]
    ]
  ]
  await chainable(tests).forEach(makeTestRunner('reject', assert))
})

test('take', async assert => {
  let output = await chainable([0, 1, 2, 3, 4, 5, 6, 7, 8]).take(5).toArray()
  assert.deepEqual(output.length, 5, 'only takes up to n values when iterable is longer than n')
  assert.deepEqual(output, [0, 1, 2, 3, 4], 'takes values in the proper order')

  output = await chainable([0, 1, 2]).take(5).toArray()
  assert.deepEqual(output.length, 3, 'takes the entire iterable if iterable shorter than n')
  assert.deepEqual(output, [0, 1, 2], 'values are taken in order')
})

const waitTimeGood = (n, reference) => (n > reference - 15) && (n < reference + 15)

test('throttle: passes all values without change', async assert => {
  const throttlePeriod = 50
  const items = 10
  const output = await chainable(generators.range(items))
    .throttle(throttlePeriod, 0)
    .toArray()
  assert.deepEqual(output, [...generators.range(items)], 'throttle passes all items unchanged')
})

test('throttle: restricts rate of iteration', async assert => {
  const throttlePeriod = 100
  const items = 5
  const output = await chainable(generators.range(items))
    .throttle(throttlePeriod, 0)
    .map(n => Date.now())
    .diff((previousTime, now) => now - previousTime)
    .filter(duration => waitTimeGood(duration, throttlePeriod))
    .toArray()
  assert.equals(output.length, items - 1, 'throttle restricted rate of iteration')
})

test('throttle: slow iteration restricts rate of iteration', async assert => {
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
  assert.equals(output.length, items - 1, 'iteration restricted the rate of throttle')
})

test('throttle: will wait for initial wait period before yielding first item', async assert => {
  const throttlePeriod = 50
  const initialWait = 100
  const startTime = Date.now()
  const output = await chainable([0, 1, 2, 3])
    .throttle(throttlePeriod, initialWait)
    .map(n => Date.now())
    .toArray()
  assert.ok(waitTimeGood(output[0] - startTime, 100), 'throttle waiting initial wait time')
})
