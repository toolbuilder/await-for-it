import { chainable } from '@toolbuilder/await-for-it'

// ============================================================================
// flattenUnordered Task Tracking & Error Recovery with mapWith
// ============================================================================
//
// In `flattenUnordered(maxPoolSize, iterable)`, remaining child iterables
// further down the stream are never pulled or initiated once an exception occurs.
//
// While `new Queue(buffer)` provides a buffer that retains unshifted items
// across failures, `flattenUnordered` is a pull-based stream transform.
//
// You can use `mapWith` directly upstream of `flattenUnordered` to track tasks
// declaratively without an imperative `queue.push()` setup:
//
// 1. Unstarted Tasks: As `flattenUnordered` demands new tasks to fill its pool
//    (up to `maxPoolSize`), `mapWith` intercepts them and marks them as pulled.
//    Any tasks remaining in `unstarted` when an error occurs were never touched.
//
// 2. In-Flight Tasks: `mapWith` wraps each child stream so active execution
//    is tracked in an `inFlight` set. When an error strikes and `flattenUnordered`
//    cascades `.return()` cleanup across the pool, active tasks remain in `inFlight`.
//
// 3. Full Recovery: Unprocessed work (`[...inFlight, ...unstarted]`) is fully
//    accounted for, and can be inspected, routed to a Dead Letter Queue (DLQ),
//    or resumed in a recovery pipeline.
// ============================================================================

console.log('--- flattenUnordered Task Tracking with mapWith ---')

const taskDefinitions = [
  { id: 1, name: 'Task 1 (good)', duration: 20, fails: false },
  { id: 2, name: 'Task 2 (good)', duration: 60, fails: false },
  { id: 3, name: 'Task 3 (bad data)', duration: 30, fails: true },
  { id: 4, name: 'Task 4 (good)', duration: 20, fails: false },
  { id: 5, name: 'Task 5 (good)', duration: 20, fails: false }
]

// Factory to create a child async generator for each task definition
const createTaskStream = (task) => async function * () {
  await new Promise(resolve => setTimeout(resolve, task.duration))
  if (task.fails) {
    throw new Error(`Execution failure in ${task.name}`)
  }
  yield `Result from ${task.name}`
}

// Track task status across the pipeline run
const unstarted = new Set(taskDefinitions)
const inFlight = new Set()
const completed = []

// Transform generator passed to mapWith
const trackTasks = async function * (taskIterable) {
  for await (const task of taskIterable) {
    // 1. flattenUnordered pulled this task into its concurrency pool
    unstarted.delete(task)

    // 2. Wrap child stream to track active execution and completion
    yield (async function * () {
      inFlight.add(task)
      try {
        const stream = createTaskStream(task)()
        for await (const result of stream) {
          yield result
        }
        // Task completed its entire stream successfully
        inFlight.delete(task)
        completed.push(task)
      } finally {
        // If an exception occurs, .return() aborts in-flight tasks.
        // Interrupted tasks remain in inFlight for recovery.
      }
    })()
  }
}

/** @type {any} */
let caughtError = null

await chainable(taskDefinitions)
  .mapWith(trackTasks)
  .flattenUnordered(2) // maxPoolSize = 2 concurrent tasks
  .callAwait(async result => {
    console.log(`Consumer received: ${result}`)
  })
  .catch(error => {
    caughtError = error
    console.log(`Pipeline caught error: ${error.message}`)
  })
  .runAwait()

console.log('\nTask status summary after failure:')
console.log(`- Completed successfully (${completed.length}):`, completed.map(t => t.name))
console.log(`- In-flight when aborted (${inFlight.size}):`, [...inFlight].map(t => t.name))
console.log(`- Never pulled / unstarted (${unstarted.size}):`, [...unstarted].map(t => t.name))

// Combine in-flight and unstarted tasks for recovery
// In practice, use `chainable.from` or `chainable.merge` to asynchronously
// combine the unprocessed tasks
const unprocessedTasks = [...inFlight, ...unstarted]
console.log(`\nTotal unprocessed tasks to recover: ${unprocessedTasks.length}`)

// ----------------------------------------------------------------------------
// Recovery Run: Filter out the faulty task and process the remaining tasks
// ----------------------------------------------------------------------------
console.log('\n--- Resuming Unprocessed Tasks in Recovery Pipeline ---')

const recoverableTasks = unprocessedTasks.filter(t => !t.fails)

await chainable(recoverableTasks)
  .map(task => createTaskStream(task)())
  .flattenUnordered(2)
  .callAwait(async result => {
    console.log(`Recovery worker processed: ${result}`)
  })
  .runAwait()

console.log('\nflattenUnordered task tracking example completed.')
