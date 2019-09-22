import { test as tape } from 'zora'
import { RingBuffer } from '../src/ringbuffer.js'

tape('RingBuffer: push/shift', test => {
  let value = 0
  const capacity = 5
  const buffer = []
  const ring = new RingBuffer(capacity)
  const push = () => { ring.push(value); buffer.push(value); ++value }
  const pushFull = () => {
    const shifted = ring.shift()
    buffer.shift()
    push()
    return shifted
  }

  test.equal(ring.capacity, capacity, 'ring buffer reports capacity')
  test.equal(ring.length, value, `ring buffer reports length of ${value} correctly`)
  test.deepEqual([...ring], buffer, `ring buffer has contents of [${[...ring]}]`)
  for (let i = 0; i < capacity; ++i) {
    push()
    test.equal(ring.back(), value - 1, `ring buffer provides back value of ${ring.back()}`)
    test.equal(ring.front(), 0, `ring buffer provides front value of ${ring.front()}`)
    test.equal(ring.length, value, `ring buffer reports length of ${value} correctly`)
    test.deepEqual([...ring], buffer, `ring buffer has contents of [${[...ring]}]`)
  }
  for (let i = 0; i < 2.5 * capacity; ++i) {
    const shifted = pushFull()
    test.equal(shifted, buffer[0] - 1, `shift returned ${shifted} correctly`)
    test.deepEqual([...ring], buffer, `ring buffer has contents of [${[...ring]}]`)
    test.equal(ring.front(), value - capacity, `front reports the oldest value in the ring buffer ${ring.front()}`)
    test.equal(ring.back(), value - 1, `back reports the value just pushed, ${ring.back()}`)
    test.equal(ring.length, capacity, `ring buffer reports length of ${ring.length}`)
  }
  for (let i = 0; i < capacity; ++i) {
    const shifted = ring.shift()
    const expected = buffer.shift()
    test.equal(ring.length, buffer.length, `ring buffer reports length of ${ring.length}`)
    test.equal(shifted, expected, `ring buffer shifted ${shifted}`)
    test.deepEqual([...ring], buffer, `ring buffer has contents of [${[...ring]}]`)
  }
})

tape('RingBuffer: unshift/pop', test => {
  let value = 0
  const capacity = 7
  const buffer = []
  const ring = new RingBuffer(capacity)
  const unshift = () => { ring.unshift(value); buffer.unshift(value); ++value }
  const unshiftFull = () => {
    const shifted = ring.pop()
    buffer.pop()
    unshift()
    return shifted
  }

  test.equal(ring.capacity, capacity, 'ring buffer reports capacity')
  test.equal(ring.length, value, `ring buffer reports length of ${value} correctly`)
  test.deepEqual([...ring], buffer, `ring buffer has contents of [${[...ring]}]`)
  for (let i = 0; i < capacity; ++i) {
    unshift()
    test.equal(ring.length, value, `ring buffer reports length of ${value} correctly`)
    test.deepEqual([...ring], buffer, `ring buffer has contents of [${[...ring]}]`)
  }
  for (let i = 0; i < 2.5 * capacity; ++i) {
    const popped = unshiftFull()
    test.equal(ring.length, capacity, `ring buffer reports length of ${ring.length}`)
    test.equal(popped, buffer[0] - capacity, `pop returned ${popped} correctly`)
    test.deepEqual([...ring], buffer, `ring buffer has contents of [${[...ring]}]`)
  }
  for (let i = 0; i < capacity; ++i) {
    const popped = ring.pop()
    const expected = buffer.pop()
    test.equal(ring.length, buffer.length, `ring buffer reports length of ${ring.length}`)
    test.equal(popped, expected, `ring buffer pop ${popped}`)
    test.deepEqual([...ring], buffer, `ring buffer has contents of [${[...ring]}]`)
  }
})
