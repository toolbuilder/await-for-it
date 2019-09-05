import { knuthShuffle } from 'knuth-shuffle'
import { map } from 'iterablefu/src/transforms.js'
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
 * Backpressure is provided by the iterating code. Iteration can be stopped by stopping
 * the iterating code.
 * @param  {...Iterable} iterables - any number of async iterables to be merged
 * @returns {AsyncGenerator} - merged iterables
 */
export const merge = async function * (...iterables) {
  // use Promise.resolve in case generator is NOT async, there is no reliable test for async.
  // add id to result so we can tell which iterator it came from
  const nextPromise = (id, generator) => {
    return Promise.resolve(generator.next()).then(iterResult => ({ ...iterResult, id }))
  }
  const states = new Map()
  // initialize states
  iterables.forEach((iterable, id) => { // using iterables index as id
    const generator = isSyncIterable(iterable) ? iterable[Symbol.iterator]() : iterable[Symbol.asyncIterator]()
    const promise = nextPromise(id, generator)
    states.set(id, { generator, promise })
  })
  while (states.size > 0) {
    const promises = map(state => state.promise, states.values())
    // `Promise.race` picks the first resolved promise in `promises`. Since the order
    // of `promises` does not change, a fast iterable near the front could prevent an
    // iterable at the back from advancing. In testing, I don't see this, but to be
    // safe, we'll shuffle the promises with a tested algorithm so you don't see weirdness.
    const { value, done, id } = await Promise.race(knuthShuffle([...promises]))
    if (done) {
      states.delete(id) // remove completed iterable
    } else {
      yield value // yield before advancing to keep iteration synchronized
      const winner = states.get(id)
      // advance the iterable that won the race, leave the others untouched for next race
      winner.promise = nextPromise(id, winner.generator)
    }
  }
}

/**
 * Periodically call asyncFunction, waiting no less than 'waitBetweenCalls' milliseconds
 * between calls. If the polling period is faster than the iteration rate, then the interation rate
 * will control the polling period.
 *
 * Backpressure is provided by the iterating code, so asyncFunction can only be called as fast
 * as the iterating code processes data, regardless of the value of 'waitBetweenCalls'.
 *
 * Because of this, when the iterating code stops, calls to asyncFunction will also stop.
 *
 * @param {Function|AsyncFunction} fn - synchronous or async function that takes no parameters
 * @param {Number} period - milliseconds to wait between calls to fn, before calling asyncFunction again.
 * @param {boolean} immediate - If true, make first function call immediately, otherwise wait
 * `waitBetweenCalls` millisceonds before making first call. Defaults to true.
 * @returns {AsyncGenerator} - provides the stream of poll results
 * @example
 * // iteration faster than polling period example
 * const poller = poll(async () => '42', 720)
 * for await (const value of poller) {
 *   console.log(value) // prints '42' once every 720ms
 * }
 * // iteration slower than polling period example
 * const fastPoller = poll(async () => 'A', 100)
 * // slowIterator only allows one value every 500ms
 * const slowIterator = throttle(500, true, fastPoller)
 * for await (const value of slowIterator) {
 *   console.log(value) // prints 'A' once every 500ms, even though waitBetweenCalls is 100ms
 * }
 * // polling stops when iteration stops
 * const limitedPolls = take(5, poll(async () => 'B', 420))
 * for await (const value of limitedPolls) {
 *   console.log(value) // prints 'B' 5 times, and only calls the async function 5 times
 * }
 */
export const poll = async function * (fn, period, initialWait = 0) {
  if (initialWait !== 0) {
    await new Promise(resolve => setTimeout(() => resolve(), initialWait))
  }
  while (true) {
    const startTime = Date.now()
    yield await Promise.resolve(fn()) // Promise.resolve converts sync functions to async
    const yieldDuration = Date.now() - startTime
    if (yieldDuration < period) {
      await new Promise(resolve => setTimeout(() => resolve(), period - yieldDuration))
    }
  }
}
