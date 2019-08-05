import tape from 'tape'
import { arrayToObject, filter, flatten, flattenRecursive, map, reject } from '../src/transforms.js'
import { range } from 'iterablefu/src/generators.js'
import { toAsync } from '../src/generators.js'
import { forEach, toArray } from '../src/reducers.js'

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

tape('flatten', async test => {
  const tests = [
    // format: [testName, inputIterable, inputParameters, expectedOutput]
    [
      'does not recurse',
      [0, [1, 2, 3], [4, 5, 6], [['a', 'b'], 7], 8, 9],
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

tape('flattenRecursive', async test => {
  const tests = [
    // format: [testName, inputIterable, inputParameters, expectedOutput]
    [
      'recursively flattens iterable',
      [0, [1, 2, 3], [[4, 5], [[[6, 7]], [8, 9], 10]], 11, 12],
      [],
      Array.from(range(13))
    ],
    [
      'does not flatten strings',
      ['Chainable', ['Iterable', ['Sequence', 'Generator']], String('Transform')],
      [],
      ['Chainable', 'Iterable', 'Sequence', 'Generator', 'Transform']
    ]
  ]

  await forEach(makeTestRunner(flattenRecursive, test), tests)
  test.end()
})

tape('map', async test => {
  const actual = await toArray(map(x => 2 * x, toAsync([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])))
  test.deepEqual(actual, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18], 'each element was mapped')
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

/*
// Doesn't really make sense does it? Does stop pulling from iterator.
const take = async function * (n, asyncIterable) {
  const iterator = asyncIterable[Symbol.asyncIterator]()
  let taken = 0
  let next
  while (taken < n) {
    next = await iterator.next()
    taken += 1
    if (next.done === true) break
    yield next.value
  }
}

const main = async () => {

  for await (const tick of syncToAsyncMap(throttle(100), chainable.range(10))) {
    console.log(tick)
  }
  for await (const value of map(x => 2 * x, ticks(100))) {
    console.log(value)
  }

  for await (const value of take(5, ticks(100))) {
    console.log(value)
  }
}

main()
*/
