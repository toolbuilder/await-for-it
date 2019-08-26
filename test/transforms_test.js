import tape from 'tape'
import { chainable } from '../src/chainable.js'

const randomInt = (maxInt) => Math.floor(Math.random() * Math.floor(maxInt))

const makeTestRunner = (transformName, test) => {
  return async testParameters => {
    const [name, inputIterable, inputParameters, expectedOutput] = testParameters
    const actual = await chainable(inputIterable)[transformName](...inputParameters).toArray()
    test.deepEqual(actual, expectedOutput, name)
  }
}

tape('arrayToObject', async test => {
  const tests = [
    // format: [testName, inputIterable, curried transform, expectedOutput]
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
  await chainable(tests).forEach(makeTestRunner('arrayToObject', test))
  test.end()
})

const fastSlowFast = async function * () {
  let i = 0
  for (; i < 5; i++) {
    yield i
  }
  for (; i < 6; i++) {
    yield await new Promise(resolve => setTimeout(() => resolve(i), 250))
  }
  for (; i < 10; i++) {
    yield i
  }
}

tape('chunk', async test => {
  let output = await chainable([0, 1, 2, 3, 4, 5, 6, 7, 8]).chunk(3, 100).toArray()
  test.deepEqual(output, [[0, 1, 2], [3, 4, 5], [6, 7, 8]], 'can generate all full length chunks')

  output = await chainable([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).chunk(3, 100).toArray()
  test.deepEqual(output, [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10]], 'can generate partial chunks at end')

  output = await chainable(fastSlowFast()).chunk(3, 100).toArray()
  // notice that timeout only runs when there is something in the buffer. That's why even with a long wait
  // between 4 and 5, we don't get an empty buffer where [5, 6, 7] is.
  test.deepEqual(output, [[0, 1, 2], [3, 4], [5, 6, 7], [8, 9]], 'can yield partial chunk if it times out')

  output = await chainable([0, 1, 2, 3, 4, 5, 6]).chunk(3, 100).toArray()
  test.deepEqual(output, [[0, 1, 2], [3, 4, 5], [6]], 'works with sync iterables too')

  try {
    await chainable([0, 1, 2]).chunk(3, []).toArray()
  } catch (error) {
    test.true(error instanceof RangeError, 'did throw range error with incorrect parameter')
    test.end()
  }
})

class TestError extends Error {}

tape('chunk: passes iterable exceptions to iterator', async test => {
  const throwingIterable = async function * () {
    yield 1
    yield new Promise(resolve => setTimeout(() => resolve(2), 100))
    throw new TestError('oops!')
  }
  try {
    await chainable(throwingIterable()).chunk(3, 100).toArray()
  } catch (error) {
    test.true(error instanceof TestError, 'chunk rethrows the error from throwingIterable')
    test.end()
  }
})

tape('filter', async test => {
  const isEvenNumber = x => x % 2 === 0

  const tests = [
    // format: [testName, inputIterable, curried transform, expectedOutput]
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
  await chainable(tests).forEach(makeTestRunner('filter', test))
  test.end()
})

tape('flatten: synchronous iterables', async test => {
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
  await chainable(tests).forEach(makeTestRunner('flatten', test))
  test.end()
})

tape('flatten: async iterables', async test => {
  const input = chainable([0, 1, chainable([2, 3, 4]), 5, [6, 7], 'happy!'])
  const output = await input.flatten().toArray()
  test.deepEqual(output, [0, 1, 2, 3, 4, 5, 6, 7, 'happy!'], 'flattens async and sync iterables')
  test.end()
})

tape('flattenRecursive', async test => {
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

  await chainable(tests).forEach(makeTestRunner('flattenRecursive', test))
  test.end()
})

tape('map: using sync function', async test => {
  const actual = await chainable([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).map(x => 2 * x).toArray()
  test.deepEqual(actual, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18], 'each element was mapped')
  test.end()
})

tape('map: using async function', async test => {
  const asyncFunction = async x => new Promise(resolve => setTimeout(() => resolve(2 * x), randomInt(100)))
  const actual = await chainable([0, 1, 2, 3, 4]).map(asyncFunction).toArray()
  test.deepEqual(actual, [0, 2, 4, 6, 8], 'each element was mapped in order')
  test.end()
})

tape('mapWith', async test => {
  const asyncGenerator = async function * (iterable) {
    for await (const x of iterable) {
      yield x * x
    }
  }
  const output = await chainable([0, 1, 2, 3]).mapWith(asyncGenerator).toArray()
  test.deepEqual(output, [0, 1, 4, 9], 'each element was mapped by asyncGenerator')
  test.end()
})

tape('nth', async test => {
  let output = await chainable([0, 1, 2, 3, 4]).chunk(2, 100).nth(0).toArray()
  test.deepEqual(output, [0, 2, 4], 'nth elements were picked')
  output = await chainable([0, 1, 2, 3, 4, 5]).chunk(2, 100).nth(-1).toArray()
  test.deepEqual(output, [1, 3, 5], 'negative indices work correctly')
  test.end()
})

tape('pluck', async test => {
  const output = await chainable([{ a: 1, b: 2 }, { a: 3, b: 4 }]).pluck('a').toArray()
  test.deepEqual(output, [1, 3], 'correct values were plucked')
  test.end()
})

tape('reject', async test => {
  const isEvenNumber = x => x % 2 === 0

  const tests = [
    // format: [testName, inputIterable, curried transform, expectedOutput]
    [
      'removes elements when function returns truthy',
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      [isEvenNumber],
      [1, 3, 5, 7, 9]
    ]
  ]
  await chainable(tests).forEach(makeTestRunner('reject', test))
  test.end()
})

tape('take', async test => {
  let output = await chainable([0, 1, 2, 3, 4, 5, 6, 7, 8]).take(5).toArray()
  test.deepEqual(output.length, 5, 'only takes up to n values when iterable is longer than n')
  test.deepEqual(output, [0, 1, 2, 3, 4], 'takes values in the proper order')

  output = await chainable([0, 1, 2]).take(5).toArray()
  test.deepEqual(output.length, 3, 'takes the entire iterable if iterable shorter than n')
  test.deepEqual(output, [0, 1, 2], 'values are taken in order')
  test.end()
})

tape('throttle: immediate', async test => {
  const waitTime = 100
  const lowerBound = waitTime - 20
  const upperBound = waitTime + 20
  const startTime = Date.now()
  const output = await chainable([0, 1, 2, 3, 4]).throttle(waitTime, true).map(x => Date.now()).toArray()
  test.true(startTime - output[0] < 20, 'first value was yielded immediately')
  const timeDifferences = []
  let previousTime = output[0]
  for (const time of output.slice(1)) {
    timeDifferences.push(time - previousTime)
    previousTime = time
  }
  const inBoundsCount = timeDifferences.filter(d => lowerBound < d && d < upperBound).length
  // The fact that all timeDifferences are positive indicates that output was in order
  test.equal(inBoundsCount, 4, 'all values were throttled within the time bounds')
  test.end()
})

tape('throttle: first value delayed', async test => {
  const waitTime = 100
  const lowerBound = waitTime - 20
  const upperBound = waitTime + 20
  const startTime = Date.now()
  const output = await chainable([0, 1, 2, 3, 4]).throttle(waitTime, false).map(x => Date.now()).toArray()
  const delay = output[0] - startTime
  test.true(lowerBound < delay && delay < upperBound, 'first value was delayed by waitTime')
  test.end()
})

tape('tap', async test => {
  const output = []
  const output2 = await chainable([0, 1, 2, 3, 4]).tap(x => output.push(2 * x)).toArray()
  test.deepEqual(output, [0, 2, 4, 6, 8], 'tap function is called in order with iterable values')
  test.deepEqual(output2, [0, 1, 2, 3, 4], 'output is unaffected by tap function')
  test.end()
})
