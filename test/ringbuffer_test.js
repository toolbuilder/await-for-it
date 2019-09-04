import tape from 'tape'
import { RingBuffer } from '../src/ringbuffer.js'

tape('push/shift', test => {
  let value = 0
  const capacity = 9
  const buffer = []
  const queue = new RingBuffer(capacity)
  const push = () => { queue.push(value); buffer.push(value); ++value }
  const pushFull = () => {
    const shifted = queue.shift()
    buffer.shift()
    push()
    return shifted
  }

  test.equal(queue.capacity, capacity, 'queue reports capacity')
  test.equal(queue.length, value, `queue reports length of ${value} correctly`)
  test.deepEqual([...queue], buffer, `queue has contents of [${[...queue]}]`)
  for (let i = 0; i < capacity; ++i) {
    push()
    test.equal(queue.back(), value - 1, `queue provides back value of ${queue.back()}`)
    test.equal(queue.front(), 0, `queue provides front value of ${queue.front()}`)
    test.equal(queue.length, value, `queue reports length of ${value} correctly`)
    test.deepEqual([...queue], buffer, `queue has contents of [${[...queue]}]`)
  }
  for (let i = 0; i < 2.5 * capacity; ++i) {
    const shifted = pushFull()
    test.equal(shifted, buffer[0] - 1, `shift returned ${shifted} correctly`)
    test.deepEqual([...queue], buffer, `queue has contents of [${[...queue]}]`)
    test.equal(queue.front(), value - capacity, `front reports the oldest value in the queue ${queue.front()}`)
    test.equal(queue.back(), value - 1, `back reports the value just pushed, ${queue.back()}`)
    test.equal(queue.length, capacity, `queue reports length of ${queue.length}`)
  }
  for (let i = 0; i < capacity; ++i) {
    const shifted = queue.shift()
    const expected = buffer.shift()
    test.equal(queue.length, buffer.length, `queue reports length of ${queue.length}`)
    test.equal(shifted, expected, `queue shifted ${shifted}`)
    test.deepEqual([...queue], buffer, `queue has contents of [${[...queue]}]`)
  }

  test.end()
})

tape('unshift/pop', test => {
  let value = 0
  const capacity = 7
  const buffer = []
  const queue = new RingBuffer(capacity)
  const unshift = () => { queue.unshift(value); buffer.unshift(value); ++value }
  const unshiftFull = () => {
    const shifted = queue.pop()
    buffer.pop()
    unshift()
    return shifted
  }

  test.equal(queue.capacity, capacity, 'queue reports capacity')
  test.equal(queue.length, value, `queue reports length of ${value} correctly`)
  test.deepEqual([...queue], buffer, `queue has contents of [${[...queue]}]`)
  for (let i = 0; i < capacity; ++i) {
    unshift()
    test.equal(queue.length, value, `queue reports length of ${value} correctly`)
    test.deepEqual([...queue], buffer, `queue has contents of [${[...queue]}]`)
  }
  for (let i = 0; i < 2.5 * capacity; ++i) {
    const popped = unshiftFull()
    test.equal(queue.length, capacity, `queue reports length of ${queue.length}`)
    test.equal(popped, buffer[0] - capacity, `pop returned ${popped} correctly`)
    test.deepEqual([...queue], buffer, `queue has contents of [${[...queue]}]`)
  }
  for (let i = 0; i < capacity; ++i) {
    const popped = queue.pop()
    const expected = buffer.pop()
    test.equal(queue.length, buffer.length, `queue reports length of ${queue.length}`)
    test.equal(popped, expected, `queue pop ${popped}`)
    test.deepEqual([...queue], buffer, `queue has contents of [${[...queue]}]`)
  }

  test.end()
})
