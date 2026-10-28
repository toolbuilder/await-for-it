import { chainable, Poll } from '@toolbuilder/await-for-it'

// Example 3: Finite Iteration (take or break)
// When consumer iteration finishes (e.g. take(5) or break), iteration
// completes cleanly and any finally handlers run automatically without
// needing to call poll.done().

let sampleId = 0
// Simulated async metrics fetch (e.g., CPU / memory readings)
const fetchMetrics = async () => ({
  id: sampleId++,
  timestamp: Date.now(),
  cpu: Math.round(Math.random() * 100)
})

const poll = new Poll(async () => fetchMetrics(), 50)

// take(5) completes after 5 items and terminates the generator
const metrics = await chainable(poll)
  .take(5)
  .toArray()

console.log('Collected 5 samples:', metrics)

