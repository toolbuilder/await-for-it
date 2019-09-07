import { Semaphore } from './semaphore.js'

export class Mutex {
  constructor () {
    this._semaphore = new Semaphore(1)
  }

  available () { return this._semaphore.available() }

  acquireSync () {
    if (this._semaphore.acquireSync()) {
      let released = false
      const release = () => { if (!released) { this._semaphore.release(); released = true } }
      return release
    }
    return null
  }

  acquire () {
    let released = false
    const release = () => { if (!released) { this._semaphore.release(); released = true } }
    return this._semaphore.acquire().then(bool => release)
  }
}

export const mutex = () => new Mutex()
