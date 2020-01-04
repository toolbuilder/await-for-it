import { test } from 'zora'
import { RingBuffer } from '../src/asynckronus.js'

test('RingBuffer: push/shift', assert => {
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

  assert.equal(ring.capacity, capacity, 'ring buffer reports capacity')
  assert.equal(ring.length, value, `ring buffer reports length of ${value} correctly`)
  assert.deepEqual([...ring], buffer, `ring buffer has contents of [${[...ring]}]`)
  for (let i = 0; i < capacity; ++i) {
    push()
    assert.equal(ring.back(), value - 1, `ring buffer provides back value of ${ring.back()}`)
    assert.equal(ring.front(), 0, `ring buffer provides front value of ${ring.front()}`)
    assert.equal(ring.length, value, `ring buffer reports length of ${value} correctly`)
    assert.deepEqual([...ring], buffer, `ring buffer has contents of [${[...ring]}]`)
  }
  for (let i = 0; i < 2.5 * capacity; ++i) {
    const shifted = pushFull()
    assert.equal(shifted, buffer[0] - 1, `shift returned ${shifted} correctly`)
    assert.deepEqual([...ring], buffer, `ring buffer has contents of [${[...ring]}]`)
    assert.equal(ring.front(), value - capacity, `front reports the oldest value in the ring buffer ${ring.front()}`)
    assert.equal(ring.back(), value - 1, `back reports the value just pushed, ${ring.back()}`)
    assert.equal(ring.length, capacity, `ring buffer reports length of ${ring.length}`)
  }
  for (let i = 0; i < capacity; ++i) {
    const shifted = ring.shift()
    const expected = buffer.shift()
    assert.equal(ring.length, buffer.length, `ring buffer reports length of ${ring.length}`)
    assert.equal(shifted, expected, `ring buffer shifted ${shifted}`)
    assert.deepEqual([...ring], buffer, `ring buffer has contents of [${[...ring]}]`)
  }
})

test('RingBuffer: unshift/pop', assert => {
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

  assert.equal(ring.capacity, capacity, 'ring buffer reports capacity')
  assert.equal(ring.length, value, `ring buffer reports length of ${value} correctly`)
  assert.deepEqual([...ring], buffer, `ring buffer has contents of [${[...ring]}]`)
  for (let i = 0; i < capacity; ++i) {
    unshift()
    assert.equal(ring.length, value, `ring buffer reports length of ${value} correctly`)
    assert.deepEqual([...ring], buffer, `ring buffer has contents of [${[...ring]}]`)
  }
  for (let i = 0; i < 2.5 * capacity; ++i) {
    const popped = unshiftFull()
    assert.equal(ring.length, capacity, `ring buffer reports length of ${ring.length}`)
    assert.equal(popped, buffer[0] - capacity, `pop returned ${popped} correctly`)
    assert.deepEqual([...ring], buffer, `ring buffer has contents of [${[...ring]}]`)
  }
  for (let i = 0; i < capacity; ++i) {
    const popped = ring.pop()
    const expected = buffer.pop()
    assert.equal(ring.length, buffer.length, `ring buffer reports length of ${ring.length}`)
    assert.equal(popped, expected, `ring buffer pop ${popped}`)
    assert.deepEqual([...ring], buffer, `ring buffer has contents of [${[...ring]}]`)
  }
})
