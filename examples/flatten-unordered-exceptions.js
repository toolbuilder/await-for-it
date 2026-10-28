import { chainable } from '@toolbuilder/await-for-it'

// ============================================================================
// flattenUnordered: Exception Handling and Consequences to Iterables
// ============================================================================
//
// Concurrency Model:
// `flattenUnordered(maxPoolSize, inputIterable)` concurrently flattens child
// iterables up to `maxPoolSize` concurrent streams. Items are yielded as soon
// as any active child iterable provides a value.
//
// What Happens When an Exception Occurs?
// An error can arise from three sources:
// 1. A child iterable throws an error or yields a rejected Promise.
// 2. The outer `inputIterable` throws an error or rejects.
// 3. A downstream consumer throws an error or cancels iteration early
//    (e.g., breaking out of a `for await...of` loop or using `take(n)`).
//
// Consequences to the Iterables Passed In:
// When any of these errors occurs, `flattenUnordered` exits its processing loop
// and enters its `finally` block, which calls `closeAll()`:
//
// 1. Automatic Cleanup of Active Child Iterators:
//    `flattenUnordered` calls `.return()` on every active child iterator
//    currently in the pool. For generator functions, this immediately transfers
//    control to their `finally` blocks, allowing them to:
//    - Release resources (database connections, file handles, sockets).
//    - Clear timers or abort active HTTP requests.
//    - Prevent dangling background operations and unhandled promise rejections.
//
// 2. Automatic Cleanup of the Input Stream:
//    `flattenUnordered` calls `.return()` on the outer `inputIterable` iterator.
//    If the input stream is a generator, its `finally` block runs immediately.
//
// 3. Unstarted Child Iterables Are Never Pulled:
//    Because the input iterator is closed immediately, any remaining child
//    iterables waiting further down the input sequence are NEVER pulled or
//    started, avoiding wasted work and orphaned tasks.
//
// 4. Downstream Error Handling:
//    The error propagates to `.catch()` on the chainable pipeline or to the
//    surrounding try/catch block, and downstream `.finally()` cleanup runs.
// ============================================================================

// ----------------------------------------------------------------------------
// Scenario 1: A child iterable throws an error during iteration
// ----------------------------------------------------------------------------
console.log('--- Scenario 1: Child iterable throws an error ---')

const scenario1Events = []

// Factory for child async generators with lifecycle logging and finally cleanup
const createWorker = (name, delayMs, shouldFail = false) => async function * () {
  scenario1Events.push(`${name}: started`)
  try {
    for (let step = 1; step <= 3; step++) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
      if (shouldFail && step === 2) {
        scenario1Events.push(`${name}: throwing error at step ${step}`)
        throw new Error(`${name} encountered unrecoverable failure`)
      }
      scenario1Events.push(`${name}: yielded item ${step}`)
      yield `${name}-item-${step}`
    }
  } finally {
    // When flattenUnordered calls .return(), this finally block runs immediately!
    scenario1Events.push(`${name}: finally cleanup executed (closed)`)
  }
}

// Outer generator stream yielding child iterables
async function * createJobStream () {
  scenario1Events.push('JobStream: started')
  try {
    // Worker A runs fast and fails on step 2
    yield createWorker('Worker-A', 20, true)()
    // Worker B runs slower and would still be active when Worker A fails
    yield createWorker('Worker-B', 60, false)()
    // Worker C is queued at the end of the input stream
    yield createWorker('Worker-C', 20, false)()
  } finally {
    scenario1Events.push('JobStream: finally cleanup executed (closed)')
  }
}

/** @type {any} */
let caughtError1 = null

await chainable(createJobStream())
  .flattenUnordered(2) // maxPoolSize = 2: Worker-A and Worker-B run concurrently
  .callAwait(async item => {
    console.log(`Consumer received: ${item}`)
  })
  .catch(error => {
    caughtError1 = error
    console.log(`Pipeline caught error: ${error.message}`)
  })
  .finally(() => {
    console.log('Pipeline 1 completed.')
  })
  .runAwait()

console.log('\nLifecycle verification for Scenario 1:')
console.log('- Caught expected error:', caughtError1?.message === 'Worker-A encountered unrecoverable failure')
console.log('- Worker-A cleaned up:', scenario1Events.includes('Worker-A: finally cleanup executed (closed)'))
console.log('- Active Worker-B had .return() called and cleaned up:', scenario1Events.includes('Worker-B: finally cleanup executed (closed)'))
console.log('- JobStream had .return() called and cleaned up:', scenario1Events.includes('JobStream: finally cleanup executed (closed)'))
console.log('- Unstarted Worker-C was NEVER pulled or started:', !scenario1Events.some(e => e.startsWith('Worker-C')))

console.log('\nChronological event log:')
for (const event of scenario1Events) {
  console.log(`  ${event}`)
}

// ----------------------------------------------------------------------------
// Scenario 2: A child iterable yields a rejected Promise
// ----------------------------------------------------------------------------
console.log('\n--- Scenario 2: Child iterable yields a rejected Promise ---')

const scenario2Events = []

const createPromiseWorker = (name, shouldReject = false) => async function * () {
  scenario2Events.push(`${name}: started`)
  try {
    yield `${name}-step-1`
    if (shouldReject) {
      scenario2Events.push(`${name}: yielding rejected Promise`)
      yield Promise.reject(new Error(`${name} network timeout`))
    }
    await new Promise(resolve => setTimeout(resolve, 100))
    yield `${name}-step-2`
  } finally {
    scenario2Events.push(`${name}: finally cleanup executed`)
  }
}

/** @type {any} */
let caughtError2 = null

await chainable([
  createPromiseWorker('Worker-P1', true)(),
  createPromiseWorker('Worker-P2', false)()
])
  .flattenUnordered(2)
  .callAwait(async item => {
    console.log(`Consumer received: ${item}`)
  })
  .catch(error => {
    caughtError2 = error
    console.log(`Pipeline caught rejected promise: ${error.message}`)
  })
  .runAwait()

console.log('\nLifecycle verification for Scenario 2:')
console.log('- Caught expected rejection:', caughtError2?.message === 'Worker-P1 network timeout')
console.log('- Sibling Worker-P2 had .return() called and cleaned up:', scenario2Events.includes('Worker-P2: finally cleanup executed'))

// ----------------------------------------------------------------------------
// Scenario 3: Downstream consumer cancellation (early break / take)
// ----------------------------------------------------------------------------
console.log('\n--- Scenario 3: Downstream consumer terminates early (break) ---')

const scenario3Events = []

const createLongRunningWorker = (name) => async function * () {
  scenario3Events.push(`${name}: started`)
  try {
    for (let i = 1; i <= 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 20))
      yield `${name}-${i}`
    }
  } finally {
    scenario3Events.push(`${name}: finally cleanup executed`)
  }
}

async function * createLongStream () {
  scenario3Events.push('LongStream: started')
  try {
    yield createLongRunningWorker('Task-1')()
    yield createLongRunningWorker('Task-2')()
    yield createLongRunningWorker('Task-3')()
  } finally {
    scenario3Events.push('LongStream: finally cleanup executed')
  }
}

console.log('Consumer reading only the first 2 items then breaking...')
let itemsReceived = 0

// When a for-await-of loop breaks early, it invokes .return() on the iterator.
// flattenUnordered cascades .return() to all active child iterators and the input stream.
for await (const item of chainable(createLongStream()).flattenUnordered(2)) {
  console.log(`Consumer received: ${item}`)
  itemsReceived++
  if (itemsReceived === 2) {
    console.log('Consumer breaking out of loop...')
    break
  }
}

console.log('\nLifecycle verification for Scenario 3:')
console.log('- Task-1 cleaned up after early break:', scenario3Events.includes('Task-1: finally cleanup executed'))
console.log('- Task-2 cleaned up after early break:', scenario3Events.includes('Task-2: finally cleanup executed'))
console.log('- LongStream input cleaned up after early break:', scenario3Events.includes('LongStream: finally cleanup executed'))
console.log('- Task-3 was NEVER started:', !scenario3Events.some(e => e.startsWith('Task-3')))

console.log('\nflattenUnordered exceptions example completed.')
