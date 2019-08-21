import { reduce, toArray, forEach } from '../src/reducers.js'
import { toAsync } from '../src/generators.js'
import tape from 'tape'

tape('reduce', async test => {
  const asyncIterable = toAsync([0, 1, 2, 3, 4])
  const output = await reduce((a, v) => { a.push(v); return a }, [], asyncIterable)
  test.deepEqual(output, [0, 1, 2, 3, 4], 'fn called on each value in order')
  test.end()
})

tape('toArray', async test => {
  const asyncIterable = toAsync([0, 1, 2, 3, 4])
  const output = await toArray(asyncIterable)
  test.deepEqual(output, [0, 1, 2, 3, 4], 'toArray processed each value in order')
  test.end()
})

tape('forEach', async test => {
  const asyncIterable = toAsync([0, 1, 2, 3, 4])
  const accumulator = []
  await forEach(x => accumulator.push(x), asyncIterable)
  test.deepEqual(accumulator, [0, 1, 2, 3, 4], 'forEach processed each value in order')
  test.end()
})
