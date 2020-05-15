import { test } from 'zora'
import { chainable } from '../src/await-for-it'

test('from', async assert => {
  const output = await chainable.from([0, 1, 2, 3, 4]).toArray()
  assert.deepEqual(output, [0, 1, 2, 3, 4], 'output matches input iterable')
})
