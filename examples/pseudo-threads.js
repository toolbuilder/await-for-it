import { chainable } from '@toolbuilder/await-for-it'

const doSomething = async (x) => {
  console.log(`Pseudo-thread processing item: ${x}`)
}

// You can start and stop iterators from outside the iterable, sort of like pseudo-threads.
const controller = chainable([0, 1, 2, 3, 4])
  .callAwait(async x => doSomething(x))
  .run() // we're off and running now

if (controller.running) controller.stop()
controller.start()

// Wait for the pseudo-thread to complete
await controller.finished
console.log('Pseudo-thread completed.')

