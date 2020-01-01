import { Semaphore } from './semaphore.js'

const once = fn => {
  let alreadyCalled = false
  return () => {
    if (!alreadyCalled) {
      alreadyCalled = true
      fn()
    }
  }
}

/**
 * Simple mutex class.
 * @example
 * const mutex = new Mutex()
 * const release = await mutex.acquire()
 * release() // to release mutex
 */
export class Mutex {
  constructor () {
    this._semaphore = new Semaphore(1)
  }

  /**
   * Determine if the lock is available.
   * @returns {Boolean} - true if lock is available, false otherwise
   */
  available () { return this._semaphore.available() }

  /**
   * Get a lock if available.
   *
   * @returns {null|Function} - if the lock is available, returns a
   * function to release it. Otherwise returns null. The release function can
   * be called multiple times, it will only release once.
   * @example
   * const mutex = new Mutex()
   * const release = mutex.acquireSync()
   * if (release) release()
   */
  acquireSync () {
    const release = once(() => this._semaphore.release())
    return (this._semaphore.acquireSync()) ? release : null
  }

  /**
   * Acquire a lock.
   * @returns {Promise} - returns a Promise that resolves to a release function. The release
   * function can be called multiple times, it will only release once.
   */
  acquire () {
    const release = once(() => this._semaphore.release())
    return this._semaphore.acquire().then(() => release)
  }
}
