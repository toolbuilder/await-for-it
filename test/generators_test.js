import { test } from 'zora'
import { chainable } from '../src/await-for-it.js'

test('from', async assert => {
  const output = await chainable.from([0, 1, 2, 3, 4]).toArray()
  assert.deepEqual(output, [0, 1, 2, 3, 4], 'output matches input iterable')
})

test('range', async assert => {
  const testData = [
    // Generating tests from data:
    // shortArgList and fullArgList should produce equivalent output
    // [ partialName, shortArgList, fullArgList, expectedOutputAsArray]
    ['zero arguments', [], [0, 0, 1], []],
    ['one argument', [5], [0, 5, 1], [0, 1, 2, 3, 4]],
    ['two arguments', [2, 5], [2, 5, 1], [2, 3, 4, 5, 6]],
    ['three arguments', [2, 5, 3], [2, 5, 3], [2, 5, 8, 11, 14]],
    ['four arguments', [2, 5, 3, 6], [2, 5, 3], [2, 5, 8, 11, 14]]
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
