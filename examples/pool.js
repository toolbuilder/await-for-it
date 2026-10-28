import { chainable } from '@toolbuilder/await-for-it'

// Simulated async task with variable duration
const performTask = async (id, duration) => {
  await new Promise(resolve => setTimeout(resolve, duration))
  return `Task ${id} completed in ${duration}ms`
}

// --- Example 1: Async generator input iterator yielding () => promise ---
//
// In JavaScript async generators, if you yield a Promise directly:
//   yield performTask(id, duration)
// the generator automatically awaits the Promise before advancing to the
// next yield. This forces tasks to run strictly one after another (sequentially),
// defeating the concurrency that pool provides.
//
// To achieve concurrent execution, wrap the promise in a zero-argument function:
//   yield () => performTask(id, duration)
//
// The generator yields the function immediately without waiting. Pool then calls
// the function to get the Promise and advances the input iterable immediately
// to keep up to maxPoolSize tasks running concurrently. Results are yielded as
// they resolve (potentially out of order).
async function * taskIterator () {
  const tasks = [
    { id: 1, duration: 60 },
    { id: 2, duration: 20 },
    { id: 3, duration: 50 },
    { id: 4, duration: 10 },
    { id: 5, duration: 30 }
  ]

  for (const { id, duration } of tasks) {
    // If you need to yield a promise from an input iterator, wrap it with a function
    // like so: () => promise
    yield () => performTask(id, duration)
  }
}

console.log('--- Example 1: Async generator input iterator yielding () => promise ---')
await chainable(taskIterator())
  .pool(2) // run up to 2 tasks concurrently
  .callNoAwait(result => console.log(result))
  .catch(err => console.error('Error in pool:', err))
  .finally(() => console.log('Example 1 finished.'))
  .runAwait()

// --- Example 2: Mapping iterable data to () => promise ---
//
// If you start with an iterable of data items, mapping each item to a function:
//   .map(data => () => performTask(data.id, data.duration))
// ensures performTask is not called prematurely. Pool will call each function
// only when a slot in the pool is ready.
console.log('\n--- Example 2: Mapping iterable data to () => promise ---')
const dataItems = [
  { id: 'A', duration: 40 },
  { id: 'B', duration: 10 },
  { id: 'C', duration: 20 }
]

await chainable(dataItems)
  .map(item => () => performTask(item.id, item.duration))
  .pool(2)
  .callNoAwait(result => console.log(result))
  .finally(() => console.log('Example 2 finished.'))
  .runAwait()

