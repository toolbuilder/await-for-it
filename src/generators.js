import { List } from '@toolbuilder/list/src/list.js'
// So this executes asyncFunction one at a time
// What about a pool of currently executing the same asyncFunction with the input values?
// What about a promise queue (assumes each task has same handling downstream?)
// What about a queue with values processed asynchronously - push in record, write to db, post process, etc
// Subscribe to event - cancelable (if no one is there to call next(), generator stops - even async generators)
// But unregistering an event handler would be a different issue - hmmm
// Multiple subscribers - fan out to multiple downstream chains (cold stream/hot stream issues)
// Insert PouchDB bulk write into middle of chain (to pick up return revisions)
// add/remove iterables to front end of chain
export const mapSyncToAsync = async function * (asyncFunction, syncIterable) {
  for (const syncValue of syncIterable) {
    yield await asyncFunction(syncValue)
  }
}

class Cancelled extends Error {}

// asyncIterable, which you can push promises (or anything?) onto at any time
export class Queue {
  constructor () {
    this.keepGoing = true
    this.inputResolve = null
    this.inputReject = null
    this.queue = new List()
  }

  stop () {
    this.keepGoing = false
    if (this.inputReject != null) {
      this.inputReject(new Cancelled())
      this.inputResolve = null
      this.inputReject = null
    }
  }

  push (value) {
    if (this.inputResolve) {
      this.inputResolve(value)
      this.inputResolve = null
      this.inputReject = null
    } else {
      this.queue.push(value)
    }
  }

  async * [Symbol.asyncIterator] () {
    while (this.keepGoing) {
      if (this.queue.length > 0) {
        yield this.queue.shift()
      } else {
        try {
          yield await new Promise((resolve, reject) => { this.inputResolve = resolve; this.inputReject = reject })
        } catch (error) {
          if (!(error instanceof Cancelled)) throw error
        } finally {
          this.inputResolve = null
          this.inputReject = null
        }
      }
    }
  }
}

export const race = async function * (...asyncIterables) {
  // store state in a fixed size array so that index values don't change
  const states = asyncIterables.map((iterable, index) => {
    return {
      iterable,
      promise: iterable.next().then(iterResult => ({ ...iterResult, index })),
      notDone: true
    }
  })
  // filter state down to promises for Promise.race
  let promises = states.filter(state => state.notDone).map(state => state.promise)
  while (promises.length > 0) {
    const { value, done, index } = await Promise.race(promises)
    const winner = states[index]
    if (done) {
      winner.notDone = false
    } else {
      yield value
      // advance the iterable that won the race, leave the others untouched for next race
      winner.promise = winner.iterable.next().then(iterResult => ({ ...iterResult, index }))
    }
    promises = states.filter(state => state.notDone).map(state => state.promise)
  }
}

export const ticks = async function * (n, period) {
  for (let i = 0; i < n; i++) {
    yield new Promise(resolve => setTimeout(() => resolve(i), period))
  }
}

export const toAsync = async function * (iterable) {
  for (const value of iterable) {
    yield value
  }
}
