import { isAsyncIterable, isSyncIterable } from './is.js'
import { iteratorFrom } from './iteratorfrom.js'
import { isFiniteNumber } from '@toolbuilder/isnumber'
import { RingBuffer } from '@toolbuilder/ring-buffer'

/**
 * Chunk every n items into an array, and output that array in the output sequence.
 * Chunks are yielded after `timeout` milliseconds even if not full, so that values
 * can be processed in a timely manner. Never yields empty chunks.
 *
 * Backpressure is provided by the iterator when a chunk is yielded. Stopping the
 * iterator will stop chunking and the input iterable.
 *
 * @type {<T = any>(n: number, timeout: number, iterable: AsyncIterable<T> | Iterable<T>) => AsyncGenerator<Awaited<T>[], void, unknown>}
 * @param {number} n - size of arrays
 * @param {number} timeout - number of milliseconds before yielding chunk if not full
 * @param {AsyncIterable<any> | Iterable<any>} iterable - the iterable to chunk
 * @returns {AsyncGenerator<any[], void, unknown>} - provides each chunk in order
 */
export const chunk = async function * (n, timeout, iterable) {
  // I've called this method incorrectly often enough to throw in some checks
  if (!Number.isInteger(n) || n < 1) throw new RangeError(`chunk parameter 'n' must be an integer >= 1: ${n}`)
  if (!(isFiniteNumber(timeout) && timeout >= 0)) throw new RangeError(`chunk parameter 'timeout' must be a non-negative number: ${timeout}`)
  if (!(isAsyncIterable(iterable) || isSyncIterable(iterable))) throw new TypeError(`chunk parameter 'iterable' must be iterable: ${iterable}`)

  const buffer = new RingBuffer(n)
  const iterator = iteratorFrom(iterable)

  /** @type {Promise<{ done?: boolean }> | null} */
  let inFlight = null
  /** @type {any} */
  let pendingError = null

  const shiftUpTo = count => {
    /** @type {any[]} */
    const chunk = []
    const toShift = Math.min(buffer.length, count)
    for (let i = 0; i < toShift; ++i) {
      chunk.push(buffer.shift())
    }
    return chunk
  }

  // When fetchNext() promise is in a Promise.race with timeout, it might not win. To provide
  // backpressure to the input iterator, and to ensure we catch exceptions, keep the losing promise
  // around until it settles before calling next again.
  const fetchNext = () => {
    if (pendingError) {
      const err = pendingError
      pendingError = null
      return Promise.reject(err)
    }
    if (!inFlight) {
      inFlight = Promise.resolve()
        .then(() => iterator.next())
        .then(
          res => {
            inFlight = null
            if (!res.done) {
              buffer.push(res.value)
            }
            return { done: res.done }
          },
          err => {
            inFlight = null
            pendingError = err
            throw err
          }
        )
      // Prevent unhandled promise rejection if inFlight settles while waiting on yield
      inFlight.catch(() => {})
    }
    return inFlight
  }

  try {
    let done = false
    while (!done || buffer.length > 0) {
      // 1. If buffer is empty, wait for the first item without a timeout (never yields empty chunks)
      if (buffer.length === 0) {
        const result = await fetchNext()
        done = Boolean(result.done)
        if (done) break
      }

      // 2. If buffer has items but is not full, race next items against the timeout
      if (!done && buffer.length < n) {
        /** @type {any} */
        let timerId
        let timedOut = false
        const timerPromise = new Promise(resolve => {
          timerId = setTimeout(() => {
            timedOut = true
            resolve({ timedOut: true })
          }, timeout)
        })

        try {
          while (!done && !timedOut && buffer.length < n) {
            const result = await Promise.race([fetchNext(), timerPromise])
            if (result.done) {
              done = true
            }
          }
        } finally {
          clearTimeout(timerId)
        }
      }

      // 3. Yield full or timed-out partial chunk
      if (buffer.length > 0) {
        yield shiftUpTo(n)
      }
    }
  } finally {
    try {
      await iterator.return?.()
    } catch {}
  }
}
