import { map as syncMap } from 'iterablefu/src/transforms.js'

/**
 * Execute functions provided by input iterable. Returns results as they resolve, with
 * no more than maxPoolSize promises pending at any time. Results may be out of order with
 * respect to the input order.
 *
 * The input iterable can yield anything but constructor functions. However, async and sync
 * functions are handled specially. Each function will be called, and the result placed into
 * the pool to be yielded when resolved. Promises will remain in the pool until they resolve,
 * other values will resolve immediately as you would expect. Consider using promiseWithTimeout,
 * or your own favorite timeout promise.
 *
 * As always with async iterables, if the input iterable yields a Promise, pool must wait
 * until the Promise resolves before advancing the input iterable. This
 * defeats the purpose of pool. So if you need to yield a promise from input iterator,
 * wrap it with a function like so: `() => promise`. Pool will call the function to get
 * the Promise, then advance the input iterable to get the next value.
 *
 * The iterating code provides backpressure, and can stop function calls by stopping iteration.
 *
 * @param {Number} maxPoolSize - maximum number of pending promises at any given time
 * @param {AsyncIterable|Iterable} iterable - input iterable, should yield functions for pool
 * to work as intended.
 * @returns {AsyncGenerator} - a generator that provides the output values as they occur
 * @throws - if iterable throws, or if any functions yielded by iterable throws, or if any
 * Promise in the pool rejects, the exception will be caught and rethrown by pool, so that the
 * iterating code can handle it. Once an exception is thrown, the iterator is done.
 */
export const pool = async function * (maxPoolSize, iterable) {
  let idSequence = 31 // generates unique keys for awaiting map, no reason it has to start with 31
  let exception = null // if fillAwaiting catches an exception, it stores it here
  const awaiting = new Map() // key is id, value is { promise, pushed } objects
  let isDone = false
  let restartFillAwaiting = null // Promise resolve function called to restart fillAwaiting function
  let pushedPromiseToAwaiting = null // Promise resolve function called to restart output loop

  // awaiting has a Promise for pushedPromiseToAwaiting in it as well as async function promises.
  // So when ierable is not done:
  // (awaiting.size - 1) === [...awaiting].filter(value => value.pushed === false).length
  // when iterable is done, fillAwaiting is done too, so awaiting won't overfill, and the fact
  // that (awaiting.size - 1) is not entirely correct doesn't matter.
  const awaitingCallCount = () => awaiting.size - 1

  // call when something is pushed to 'awaiting'
  const onPushedPromiseToAwaiting = () => {
    if (pushedPromiseToAwaiting) {
      pushedPromiseToAwaiting()
      pushedPromiseToAwaiting = null
    }
  }

  // Need a way to interrupt the Promise.race in the main iterator loop when something is pushed
  // into awaiting. The onPushedPromiseToAwaiting function will resolve the promise below.
  const makePushedPromise = (awaiting) => {
    const id = idSequence++
    const promise = new Promise((resolve, reject) => { pushedPromiseToAwaiting = resolve }).then(result => ({ result, id }))
    const pushed = true // to indicate that this promise is the onPushedPromiseToAwaiting interrupt
    awaiting.set(id, { promise, pushed })
  }

  // This function pulls values from iterable, calls the resulting function,
  // and pushes the returned Promise into 'awaiting' after tagging it with an id.
  const fillAwaiting = async () => {
    try {
      for await (const value of iterable) {
        const id = idSequence++
        // support async functions, sync functions, and everything else
        const promise = (typeof value === 'function')
          ? Promise.resolve(value()).then(result => ({ result, id }))
          : Promise.resolve(value).then(result => ({ result, id }))
        const pushed = false // indicates promise is part of the pool, not for onPushedPromiseToAwaiting
        awaiting.set(id, { promise, pushed })
        onPushedPromiseToAwaiting()
        if (awaitingCallCount() >= maxPoolSize) {
          await new Promise((resolve, reject) => { restartFillAwaiting = resolve })
        }
      }
    } catch (error) {
      exception = error
    } finally {
      isDone = true
      onPushedPromiseToAwaiting() // if main loop is waiting, need to interrupt it
    }
  }

  // Primary output loop is here.
  fillAwaiting()
  makePushedPromise(awaiting)
  while (awaiting.size > 0 || !isDone) { // eslint-disable-line
    const promises = syncMap(value => value.promise, awaiting.values())
    const { result, id } = await Promise.race(promises)
    if (exception != null) throw exception

    const { pushed } = awaiting.get(id)
    if (pushed === true) {
      if (!isDone) makePushedPromise(awaiting)
    } else {
      yield result
    }
    awaiting.delete(id)

    if (awaitingCallCount() < maxPoolSize && restartFillAwaiting) {
      restartFillAwaiting()
      restartFillAwaiting = null
    }
  }
}
