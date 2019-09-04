import { isSyncIterable } from './is.js'

/**
 * This function exists solely so that the generated ChainableIterable class has a static constructor.
 *
 * @param {AsyncIterable|Iterable} iterable - input iterable
 * @returns {AsyncIterable|Iterable} - the input iterable
 */
export const from = (iterable) => {
  return iterable
}

/**
 * Merge the output of one or more async iterables into a single async iterable. Each
 * async iterable is advanced as fast as possible, so that slow iterators do not hold
 * up faster ones. Equal speed iterables are advanced at roughly the same pace.
 *
 * Backpressure is provided by the iterator. Iteration can be stopped by stopping iterator.
 * @param  {...Iterable} iterables - any number of async iterables to be merged
 */
export const merge = async function * (...iterables) {
  let states = iterables.map((iterable, index) => {
    const id = index // can use initial index as unique id since states array will only shrink
    const generator = isSyncIterable(iterable) ? iterable[Symbol.iterator]() : iterable[Symbol.asyncIterator]()
    return {
      id,
      generator,
      promise: Promise.resolve(generator.next()).then(iterResult => ({ ...iterResult, id }))
    }
  })
  while (states.length > 0) {
    const promises = states.map(state => state.promise)
    const { value, done, id } = await Promise.race(promises)
    if (done) {
      states = states.filter(state => state.id !== id) // remove completed iterable
    } else {
      yield value
      const winnerIndex = states.findIndex(state => state.id === id)
      const winner = states[winnerIndex]
      // advance the iterable that won the race, leave the others untouched for next race
      winner.promise = Promise.resolve(winner.generator.next()).then(iterResult => ({ ...iterResult, id }))
      // Promise.race will pick first resolved in array. If a fast iterable is near the front,
      // it could advance faster than a similar one at the back. So move winner to back.
      const backIndex = states.length - 1
      if (backIndex !== winnerIndex) {
        states[winnerIndex] = states[backIndex]
        states[backIndex] = winner
      }
    }
  }
}

/**
 * Periodically call asyncFunction, waiting no less than 'waitBetweenCalls' milliseconds
 * after each call resolves before calling asyncFunction again.
 *
 * Backpressure is provided by the iterating code, so asyncFunction can only be called as fast
 * as the iterating code processes data, regardless of the value of 'waitBetweenCalls'.
 *
 * Because of this, when the iterating code stops, calls to asyncFunction will also stop.
 *
 * @param {Function|AsyncFunction} fn - synchronous or async function that takes no parameters
 * @param {Number} waitBetweenCalls - milliseconds to wait after an asyncFunction call resolves,
 * before calling asyncFunction again.
 * @param {boolean} immediate - If true, make first asyncFunction call immediately, otherwise wait
 * 'waitBetweenCalls' millisceonds before making first call. Defaults to true.
 * @returns {AsyncGenerator} - provides the stream of poll results
 * @example
 * // faster than poll iterating code example
 * const poller = poll(async () => '42', 720)
 * for await (const value of poller) {
 *   console.log(value) // prints '42' once every 720ms
 * }
 * // Slower than poll iterating code example:
 * const fastPoll = poll(async () => 'A', 100)
 * // slowIterator only allows one value every 500ms
 * const slowIterator = throttle(poller), 500)
 * for await (const value of slowIterator) {
 *   console.log(value) // prints 'A' once every 500ms, even though waitBetweenCalls is shorter
 * }
 * // Polling is stopped when iterating code stops
 * const limitedPolls = take(5, poll(async () => 'B', 420))
 * for await (const value of limitedPolls) {
 *   console.log(value) // prints 'B' 5 times, and only calls the async function 5 times
 * }
 */
export const poll = async function * (fn, waitBetweenCalls, immediate = true) {
  if (immediate !== true) {
    await new Promise(resolve => setTimeout(() => resolve(), waitBetweenCalls))
  }
  while (true) {
    yield await Promise.resolve(fn()) // convert sync functions to async, noop for async functions
    await new Promise(resolve => setTimeout(() => resolve(), waitBetweenCalls))
  }
}
