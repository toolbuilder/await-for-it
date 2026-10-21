import test from 'node:test'
import assert from 'node:assert/strict'
import { chainable, generators } from '../src/await-for-it.js'

test('from', async () => {
  const output = await chainable.from([0, 1, 2, 3, 4]).toArray()
  assert.deepEqual(output, [0, 1, 2, 3, 4], 'output matches input iterable')
})

test('range: python matching semantics', async () => {
  /** @type {Array<[string, number[], number[], number[]]>} */
  const testData = [
    // Generating tests from data:
    // shortArgList and fullArgList should produce equivalent output
    // [ partialName, shortArgList, fullArgList, expectedOutputAsArray]
    ['zero arguments', [], [0, 0, 1], []],
    ['one argument (positive)', [5], [0, 5, 1], [0, 1, 2, 3, 4]],
    ['one argument (zero)', [0], [0, 0, 1], []],
    ['one argument (negative)', [-5], [0, -5, 1], []],
    ['two arguments (start < stop)', [2, 5], [2, 5, 1], [2, 3, 4]],
    ['two arguments (start >= stop)', [5, 2], [5, 2, 1], []],
    ['two arguments (negative start and stop)', [-5, -2], [-5, -2, 1], [-5, -4, -3]],
    ['three arguments (step > 1)', [2, 5, 2], [2, 5, 2], [2, 4]],
    ['three arguments (step > stop - start)', [2, 5, 3], [2, 5, 3], [2]],
    ['three arguments (negative step)', [5, 2, -1], [5, 2, -1], [5, 4, 3]],
    ['three arguments (countdown to zero)', [5, 0, -1], [5, 0, -1], [5, 4, 3, 2, 1]],
    ['three arguments (negative step > 1)', [5, 0, -2], [5, 0, -2], [5, 3, 1]],
    ['three arguments (negative direction but positive step)', [5, 2, 1], [5, 2, 1], []],
    ['three arguments (positive direction but negative step)', [2, 5, -1], [2, 5, -1], []],
    ['three arguments (negative stop with negative step)', [0, -5, -1], [0, -5, -1], [0, -1, -2, -3, -4]],
    ['four arguments (ignores extra args)', [2, 5, 2, 999], [2, 5, 2], [2, 4]]
  ]

  await chainable(testData)
    .map(testCase => {
      // Transform into test cases
      const [partialName, shortArgList, fullArgList, expectedOutput] = testCase
      return [
        {
          name: `${partialName}: [${shortArgList}]`,
          args: shortArgList,
          expected: expectedOutput
        },
        // Test with the three parameters that are equivalent to the test just above
        {
          name: `parameters equivalent to ${partialName}: [${fullArgList}]`,
          args: fullArgList,
          expected: expectedOutput
        }
      ]
    })
    .flatten()
    .forEach(async ({ name, args, expected }) => {
      const actual = await chainable.range(...args).toArray()
      assert.deepEqual(actual, expected, name)
    })
})

test('range: throws RangeError when step is zero', () => {
  assert.throws(() => generators.range(1, 5, 0), RangeError)
  assert.throws(() => chainable.range(1, 5, 0), RangeError)
})

test('range: defaults undefined parameters', async () => {
  const actual = await chainable.range(2, 5, undefined).toArray()
  assert.deepEqual(actual, [2, 3, 4], 'undefined step defaults to 1')
})

test('range: synchronous generator usage', () => {
  const values = [...generators.range(5)]
  assert.deepEqual(values, [0, 1, 2, 3, 4], 'direct generator call can be spread synchronously')
})
