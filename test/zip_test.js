import { test } from 'zora'
import { generators } from 'iterablefu'
import { chainable } from '../src/await-for-it.js'

const iterableOne = ['able', 'better', 'chainable', 'dictionary', 'enhanced', 'forbidden']
const iterableRef = [['able', 1], ['better', 2], ['chainable', 3], ['dictionary', 4], ['enhanced', 5]]

const runTest = async ([iterable, expected, message], assert) => {
  const actual = await chainable(iterable).toArray()
  assert.deepEqual(actual, expected, message)
}

const testRunner = (testCases, assert) => {
  return chainable(testCases).forEach(testCase => runTest(testCase, assert))
}

test('zip', async assert => {
  const testCases = [
    [
      chainable.zip(iterableOne.slice(0, 5), generators.range(1, 5)),
      iterableRef,
      'equal length iterables are all exhausted'
    ],
    [
      chainable.zip(iterableOne, generators.range(1, 5)),
      iterableRef,
      'zip quits when shortest iterable is exhausted'
    ],
    [
      // as with all previous tests, input iterables are synchronous
      chainable.zip(iterableOne.slice(0, 5), generators.range(1, 5)),
      iterableRef,
      'handles synchronous iterables'
    ],
    [
      // make range async by wrapping with chainable
      chainable.zip(iterableOne.slice(0, 5), chainable(generators.range(1, 5))),
      iterableRef,
      'handles mix of async and synchronous iterables'
    ]
  ]
  await testRunner(testCases, assert)
})

test('zipAll', async assert => {
  const testCases = [
    [
      chainable.zipAll(iterableOne.slice(0, 5), generators.range(1, 5)),
      iterableRef,
      'equal length iterables are all exhausted'
    ],
    [
      chainable.zipAll(iterableOne, generators.range(1, 5)),
      iterableRef.concat([['forbidden', undefined]]),
      'keeps going until longest iterable is exhausted, missing values are undefined'
    ],
    [
      // as with all previous tests, input iterables are synchronous
      chainable.zipAll(iterableOne.slice(0, 5), generators.range(1, 5)),
      iterableRef,
      'handles synchronous iterables'
    ],
    [
      // make range async by wrapping with chainable
      chainable.zipAll(iterableOne.slice(0, 5), chainable(generators.range(1, 5))),
      iterableRef,
      'handles mix of async and synchronous iterables'
    ]
  ]
  await testRunner(testCases, assert)
})
