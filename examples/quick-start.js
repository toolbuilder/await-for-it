import { chainable } from '@toolbuilder/await-for-it'

// Simulated async operation
const someAsyncMethod = async (x) => {
  console.log(`Processing value: ${x}`)
}

const handleTheError = (error) => {
  console.error(`Handled error: ${error.message}`)
}

const cleanup = () => {
  console.log('Cleanup completed')
}

// factory method makes a ChainableIterable instance
const controller = chainable([0, 1, 2, 3, 4])
  .map(x => 2 * x)
  .throttle(10, 50) // wait 50ms to start, then yield every 10ms
  .callAwait(async (x) => someAsyncMethod(x)) // do something for every value
  .catch(error => handleTheError(error)) // Just like Promise.catch
  .finally(() => cleanup()) // always called even if there is an error
  .run() // run the iterable like a pseudo-thread, no await

// Await completion of the pseudo-thread
await controller.finished

