import tape from 'tape'
import { chainable } from '../src/chainable.js'

tape('from', async test => {
  const output = await chainable.from([0, 1, 2, 3, 4]).toArray()
  test.deepEqual(output, [0, 1, 2, 3, 4], 'output matches input iterable')
  test.end()
})
