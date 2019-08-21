import tape from 'tape'
import { arrayToObject, chunk, filter, flatten, flattenRecursive,
  map, reject, take, throttle } from '../src/transforms.js'
import { range } from 'iterablefu/src/generators.js'
import { toAsync } from '../src/generators.js'
import { forEach, toArray } from '../src/reducers.js'

const randomInt = (maxInt) => Math.floor(Math.random() * Math.floor(maxInt))

const makeTestRunner = (transform, test) => {
  return async testParameters => {
    const [name, inputIterable, inputParameters, expectedOutput] = testParameters
    const actual = await toArray(transform(...inputParameters, toAsync(inputIterable)))
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
  await forEach(makeTestRunner(arrayToObject, test), tests)
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
  let output = await toArray(chunk(3, 100, toAsync([0, 1, 2, 3, 4, 5, 6, 7, 8])))
  test.deepEqual(output, [[0, 1, 2], [3, 4, 5], [6, 7, 8]], 'can generate all full length chunks')

  output = await toArray(chunk(3, 100, toAsync([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])))
  test.deepEqual(output, [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10]], 'can generate partial chunks at end')

  output = await toArray(chunk(3, 100, fastSlowFast()))
  // notice that timeout only runs when there is something in the buffer. That's why even with a long wait
  // between 4 and 5, we don't get an empty buffer where [5, 6, 7] is.
  test.deepEqual(output, [[0, 1, 2], [3, 4], [5, 6, 7], [8, 9]], 'can yield partial chunk if it times out')

  output = await toArray(chunk(3, 100, [0, 1, 2, 3, 4, 5, 6]))
  test.deepEqual(output, [[0, 1, 2], [3, 4, 5], [6]], 'works with sync iterables too')

  try {
    await toArray(chunk(3, [0, 1, 2]))
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
    await toArray(chunk(3, 100, throwingIterable()))
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
      range(10),
      [isEvenNumber],
      Array.from(range(0, 5, 2))
    ],
    [
      'passes all elements when function only returns truthy values',
      range(10),
      [x => true],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    ]
  ]
  await forEach(makeTestRunner(filter, test), tests)
  test.end()
})

tape('flatten: synchronous iterables', async test => {
  const tests = [
    // format: [testName, inputIterable, inputParameters, expectedOutput]
    [
      'does not recurse',
      [0, [1, 2, 3], toAsync([4, 5, 6]), [['a', 'b'], 7], 8, 9],
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
  await forEach(makeTestRunner(flatten, test), tests)
  test.end()
})

tape('flatten: async iterables', async test => {
  const input = toAsync([0, 1, toAsync([2, 3, 4]), 5, [6, 7], 'happy!'])
  const output = await toArray(flatten(input))
  test.deepEqual(output, [0, 1, 2, 3, 4, 5, 6, 7, 'happy!'], 'flattens async and sync iterables')
  test.end()
})

tape('flattenRecursive', async test => {
  const tests = [
    // format: [testName, inputIterable, inputParameters, expectedOutput]
    [
      'recursively flattens async and sync iterables',
      [0, [1, 2, 3], [toAsync([4, 5]), [[[6, 7]], [8, 9], 10]], 11, 12],
      [],
      Array.from(range(13))
    ],
    [
      'does not flatten strings',
      ['Chainable', ['Iterable', toAsync(['Sequence', 'Generator'])], String('Transform')],
      [],
      ['Chainable', 'Iterable', 'Sequence', 'Generator', 'Transform']
    ]
  ]

  await forEach(makeTestRunner(flattenRecursive, test), tests)
  test.end()
})

tape('map: using sync function', async test => {
  const actual = await toArray(map(x => 2 * x, toAsync([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])))
  test.deepEqual(actual, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18], 'each element was mapped')
  test.end()
})

tape('map: using async function', async test => {
  const asyncFunction = async x => new Promise(resolve => setTimeout(() => resolve(2 * x), randomInt(100)))
  const actual = await toArray(map(asyncFunction, [0, 1, 2, 3, 4]))
  test.deepEqual(actual, [0, 2, 4, 6, 8], 'each element was mapped in order')
  test.end()
})

tape('reject', async test => {
  const isEvenNumber = x => x % 2 === 0

  const tests = [
    // format: [testName, inputIterable, curried transform, expectedOutput]
    [
      'removes elements when function returns truthy',
      range(10),
      [isEvenNumber],
      [1, 3, 5, 7, 9]
    ]
  ]
  await forEach(makeTestRunner(reject, test), tests)
  test.end()
})

tape('take', async test => {
  let output = await toArray(take(5, toAsync([0, 1, 2, 3, 4, 5, 6, 7, 8])))
  test.deepEqual(output.length, 5, 'only takes up to n values when iterable is longer than n')
  test.deepEqual(output, [0, 1, 2, 3, 4], 'takes values in the proper order')

  output = await toArray(take(5, toAsync([0, 1, 2])))
  test.deepEqual(output.length, 3, 'takes the entire iterable if iterable shorter than n')
  test.deepEqual(output, [0, 1, 2], 'values are taken in order')
  test.end()
})

tape('throttle: immediate', async test => {
  const waitTime = 100
  const lowerBound = waitTime - 20
  const upperBound = waitTime + 20
  const startTime = Date.now()
  const output = await toArray(map(x => Date.now(), throttle(waitTime, true, toAsync([0, 1, 2, 3, 4]))))
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
  const output = await toArray(map(x => Date.now(), throttle(waitTime, false, toAsync([0, 1, 2, 3, 4]))))
  const delay = output[0] - startTime
  test.true(lowerBound < delay && delay < upperBound, 'first value was delayed by waitTime')
  test.end()
})
