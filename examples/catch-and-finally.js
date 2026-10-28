import { chainable } from '@toolbuilder/await-for-it'

// The catch and finally methods allow a cleaner syntax than writing
// try/catch/finally blocks around iteration, similar to Promise methods.

let testValue = 0

// Case 1: Successful iteration with finally
await chainable([0, 1, 2, 3])
  .catch(error => {
    console.error('Error occurred:', error.message)
  }) // stops iteration if an error occurs
  .finally(() => {
    ++testValue
    console.log(`Finally executed on success. testValue = ${testValue}`)
  }) // always called even if there is an error
  .runAwait() // Run the iterator to completion

// Case 2: Error handled with catch, followed by finally
await chainable([1, 2, 3, 4])
  .map(x => {
    if (x === 3) throw new Error('Something went wrong at 3!')
    return x * 10
  })
  .catch(error => {
    console.log(`Caught error gracefully: ${error.message}`)
  })
  .finally(() => {
    ++testValue
    console.log(`Finally executed after error. testValue = ${testValue}`)
  })
  .runAwait()

