import { chainable, Queue, Poll } from '../src/aynckronus.js'

let pollValue = 0
const poll = new Poll(() => pollValue++, 50, 50)
chainable(poll)
  .callAwait(value => { console.log(`poll value ${value}`) })
  .finally(() => console.log('poller finally called')) // will never be called
  .run()

setTimeout(() => { console.log('stopping poll'); poll.stop() }, 400)
setTimeout(() => { console.log('stopping poll'); poll.stop() }, 500) // redundant
setTimeout(() => { console.log('starting poll'); poll.start() }, 600)
setTimeout(() => { console.log('starting poll'); poll.start() }, 700) // redundant
setTimeout(() => { console.log('stopping poll'); poll.stop() }, 1000)
// once the reference to controller goes away, the whole thing can be garbage collected
// even though there is a pending promise in the run method.

const queue = new Queue(10)
chainable(queue).callAwait(value => { console.log(value) }).finally(() => console.log('queue done')).run()
let pushedValue = 0
const interval = setInterval(() => queue.push(`queue: ${pushedValue++}`), 100)
// need to call done() for finally to be called
setTimeout(() => { clearInterval(interval); queue.done() }, 1500)
