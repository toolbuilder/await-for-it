import { shuffle } from './shuffle.js'
import { map } from 'iterablefu/src/transforms.js'
import { isSyncIterable } from './is.js'

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
  const nextPromise = (id, iterator) => {
    return Promise.resolve(iterator.next()).then(iterResult => ({ ...iterResult, id }))
  }
  const states = new Map()
  // initialize states
  iterables.forEach((iterable, id) => { // using iterables index as id
    const iterator = isSyncIterable(iterable) ? iterable[Symbol.iterator]() : iterable[Symbol.asyncIterator]()
    const promise = nextPromise(id, iterator)
    states.set(id, { iterator, promise })
  })
  while (states.size > 0) {
    const promises = map(state => state.promise, states.values())
    // `Promise.race` picks the first resolved promise in `promises`. Since the order
    // of `promises` does not change, a fast iterable near the front could prevent an
    // iterable at the back from advancing. In testing, I don't see this, but to be
    // safe, we'll shuffle the promises with a tested algorithm so you don't see weirdness.
    const { value, done, id } = await Promise.race(shuffle([...promises]))
    if (done) {
      states.delete(id) // remove completed iterable
    } else {
      yield value // yield before advancing to keep iteration synchronized
      const winner = states.get(id)
      // advance the iterable that won the race, leave the others untouched for next race
      winner.promise = nextPromise(id, winner.iterator)
    }
  }
}
