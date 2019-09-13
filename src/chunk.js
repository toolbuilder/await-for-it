import { isAsyncIterable, isSyncIterable } from './is.js'
import { isFiniteNumber } from '@toolbuilder/isnumber/src/isnumber.js'
import { waitToCall } from './timeouts.js'
import { RingBuffer } from './ringbuffer.js'

/**
 * Chunk every n items into an array, and output that array in the output sequence.
 * Chunks are yielded after `timeout` milliseconds even if not full, so that values
 * can be processed in a timely manner. Never yields empty chunks.
 *
 * Backpressure is provided by the iterator when a chunk is yielded. Stopping the
 * iterator will stop chunking and the input iterable.
 *
 * @param {Number} n - size of arrays
 * @param {Number} timeout - number of milliseconds before yielding chunk if not full
 * @param {AsyncIterable|Iterable} iterable - the iterable to chunk
 * @returns {AsyncGenerator} - provides each chunk in order
 */
export const chunk = async function * (n, timeout, iterable) {
  // I've called this method incorrectly often enough to throw in some checks
  if (!(isFiniteNumber(n) && n > -1)) throw new RangeError(`chunk parameter 'n' must be a positive number: ${n}`)
  if (!(isFiniteNumber(timeout) && timeout > -1)) throw new RangeError(`chunk parameter 'timeout' must be a positive number: ${timeout}`)
  if (!(isAsyncIterable(iterable) || isSyncIterable(iterable))) throw new RangeError(`chunk parameter 'iterable' must be iterable: ${iterable}`)

  const buffer = new RingBuffer(n + 1) // '+1' isn't necessary, but just in case testing missed something...
  const iterator = isSyncIterable(iterable) ? iterable[Symbol.iterator]() : iterable[Symbol.asyncIterator]()
  let nextValuePromise = null // iterator.next()

  const shiftUpTo = count => {
    const chunk = []
    const toShift = Math.min(buffer.length, count)
    for (let i = 0; i < toShift; ++i) {
      chunk.push(buffer.shift())
    }
    return chunk
  }

  const pushValue = ({ value, done }) => {
    if (!done) buffer.push(value)
    return { done }
  }

  const pushNextValue = () => Promise.resolve(iterator.next()).then(pushValue)

  // When pushNextValue() promise is in a Promise.race with timeout, it might not win. To provide
  // backpressure to the input iterator, and to ensure we catch exceptions, keep the losing promise
  // around until it resolves before calling next again.
  const getNextValuePromise = () => {
    if (!nextValuePromise) {
      nextValuePromise = pushNextValue().then(result => { nextValuePromise = null; return result })
    }
    return nextValuePromise
  }

  const fillChunkOrTimeout = async () => {
    let { done } = await getNextValuePromise()
    if (!done && buffer.length < n) {
      let timedOut
      const chunkTimeout = waitToCall(timeout, () => ({ timedOut: true }))
      do {
        ({ done, timedOut } = await Promise.race([getNextValuePromise(), chunkTimeout]))
      } while (!done && !timedOut && buffer.length < n)
    }
    return done
  }

  let done // can be undefined, true, or false
  do {
    done = await fillChunkOrTimeout()
    if (buffer.length > 0) yield shiftUpTo(n)
  } while (!done || buffer.length > 0) // eslint-disable-line
}
