/**
 * Promise based semaphore.
 */
export class Semaphore {
  /**
   * Create a semaphore.
   *
   * @param {Number} max - maximum number of locks that can be acquired at any given time
   */
  constructor (max = 1) {
    this._max = max
    this._active = 0
    this._resolvers = [] // when locked, each acquire requires a new promise
  }

  /**
   * Returns the number of available locks remaining.
   */
  available () { return !(this._active >= this._max) }

  /**
   * Acquires a lock synchronously.
   * @returns {Boolean} - true if lock was acquired, false otherwise
   */
  acquireSync () {
    if (this._active >= this._max) return false
    this._active++
    return true
  }

  /**
   * Acquires a lock asynchronously.
   * @returns {Promise} - promise resolves when a lock has been acquired.
   */
  acquire () {
    this._active++
    if (this._active > this._max) {
      let resolver
      const promise = new Promise(resolve => (resolver = resolve))
      this._resolvers.push(resolver)
      return promise
    } else {
      return Promise.resolve(true)
    }
  }

  /**
   * Releases a lock so that it is available to be acquired.
   */
  release () {
    this._active--
    if (this._resolvers.length > 0) {
      this._resolvers.shift()(true) // let awaiting code run by resolving a promise
    }
  }
}
