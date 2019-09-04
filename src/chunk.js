import { isAsyncIterable, isSyncIterable } from './is.js'
import { isFiniteNumber } from '@toolbuilder/isnumber/src/isnumber.js'
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

  // state for chunking process
  let buffer = [] // store values from input iterable while building chunk
  let fillListException = null // store exception thrown in fillList for later throwing
  let done = false // true if iteration of iterable is done
  let timer = null // timeout timer reference so it can be cleared when a chunk is ready
  let restartFillBuffer = null // Promise resolve function to restart fillBuffer
  let restartMainLoop = null // Promise resolve function to restart output loop

  // Runs promise resolve functions
  const runFunction = (resolver) => {
    if (resolver != null) {
      resolver()
      resolver = null
    }
  }

  // state management functions
  const onFirstPushOfChunk = () => { timer = setTimeout(() => onTimeout(), timeout) }
  const onTimeout = () => { runFunction(restartMainLoop) }
  const onChunkReady = () => { clearTimeout(timer); runFunction(restartMainLoop) }
  const onDone = () => { done = true; clearTimeout(timer); runFunction(restartMainLoop) }
  const onFillNextChunk = () => { if (!done) runFunction(restartFillBuffer) }

  // asynchronously fill buffer, stop when full, restarted by main loop
  const fillBuffer = async function () {
    try {
      for await (const value of iterable) {
        buffer.push(value)
        if (buffer.length === 1) onFirstPushOfChunk()
        if (buffer.length === n) {
          onChunkReady()
          // Wait until iterator wanting chunks requests more data before filling buffer again.
          // This allows iterator wanting chunks to provide back pressure to iterable
          await new Promise((resolve, reject) => { restartFillBuffer = resolve })
        }
      }
    } catch (error) {
      fillListException = error // save error from iterable to rethrow in main loop
    } finally {
      onDone()
    }
  }

  fillBuffer()
  // main loop yields chunks from fillBuffer to iterator
  while (!done || buffer.length > 0) { // eslint-disable-line
    if (buffer.length === 0) {
      // fillBuffer or timeout will resolve this promise to restart loop
      await new Promise((resolve, reject) => { restartMainLoop = resolve })
    }
    if (buffer.length > 0) {
      const chunk = buffer
      buffer = []
      yield chunk
      onFillNextChunk()
    }
  }
  // exception can be caught while awaiting, or yielding
  // either way done === true now, so loop will end ensuring this check
  if (fillListException != null) throw fillListException
}
