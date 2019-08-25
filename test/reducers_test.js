import { chainable } from '../src/chainable.js'
import tape from 'tape'

tape('reduce', async test => {
  const input = [0, 1, 2, 3, 4]
  const output = await chainable(input).reduce((a, v) => { a.push(v); return a }, [])
  test.deepEqual(output, [0, 1, 2, 3, 4], 'fn called on each value in order')
  test.end()
})

tape('toArray', async test => {
  const input = [0, 1, 2, 3, 4]
  const output = await chainable(input).toArray()
  test.deepEqual(output, [0, 1, 2, 3, 4], 'toArray processed each value in order')
  test.end()
})

tape('forEach', async test => {
  const input = [0, 1, 2, 3, 4]
  const accumulator = []
  await chainable(input).forEach(x => accumulator.push(x))
  test.deepEqual(accumulator, [0, 1, 2, 3, 4], 'forEach processed each value in order')
  test.end()
})
