/**
 * Promise based semaphore.
 */
// NOTE: if acquire was to return a release function, this would be a Mutex (roughly)
export class Semaphore {
  constructor (max = 1) {
    this._max = max
    this._active = 0
    this._resolvers = [] // when locked, each acquire requires a new promise
  }

  available () { return !(this._active >= this._max) }

  acquireSync () {
    if (this._active >= this._max) return false
    this._active++
    return true
  }

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

  release () {
    this._active--
    if (this._resolvers.length > 0) {
      this._resolvers.shift()(true) // let awaiting code run by resolving a promise
    }
  }
}

export const semaphore = max => new Semaphore(max)
