# Poll

`Poll` periodically calls a function and yields its resolved values as an async iterable stream.

Polling operates at a target cadence of no faster than `period` milliseconds. It is designed around **pull-based backpressure**:
- **Backpressure**: If downstream iteration pauses or processes slowly, polling slows down or pauses accordingly. No intermediate values are buffered or discarded.
- **Single-Use**: A `Poll` instance represents a single polling session. Once finished, stopped, or errored, it cannot be restarted.
- **Fail-Fast**: If `fn` throws a synchronous exception or rejects a Promise, the error immediately propagates out through the iterator and terminates polling permanently. For transient error recovery, wrap the callback in a `try/catch`.

---

## Constructor

```javascript
new Poll(fn, period, [initialWait = 0])
```

- **`fn`** (`() => T | PromiseLike<T>`): A synchronous or async function taking no arguments. Throws `TypeError` if not a function.
- **`period`** (`number`): Target interval in milliseconds between poll invocations. Must be a finite number `> 0`. Throws `RangeError` otherwise.
- **`initialWait`** (`number`, optional, default `0`): Milliseconds to wait before calling `fn` for the first time. Must be a finite number `>= 0`. Throws `RangeError` otherwise.

---

## Methods

### `done()`
Stops polling gracefully.
- If an internal delay (`initialWait` or inter-poll sleep) is active, it is aborted immediately.
- If `fn` is currently executing, it is allowed to settle and yield its value before the generator completes.
- Subsequent calls to `next()` return `{ done: true }`.

---

## Examples

### 1. Polling Indefinitely Until `done()` is Called
Without a downstream limit or break condition, `Poll` will poll indefinitely until `poll.done()` is called.

```javascript
import { chainable, Poll } from '@toolbuilder/await-for-it'

let count = 0
const poll = new Poll(async () => count++, 1000)

// Stop polling when an external event occurs (or from within a consumer step)
setTimeout(() => {
  poll.done() // aborts active wait immediately
}, 3500)

await chainable(poll)
  .callNoAwait(val => console.log('Poll value:', val))
  .finally(() => console.log('Polling finished'))
  .runAwait()
```

### 2. Backpressure: Downstream Processing Pauses Polling
Because `Poll` is pull-based, polling automatically pauses when downstream iteration pauses or runs slower than `period`.

```javascript
import { chainable, Poll } from '@toolbuilder/await-for-it'

let count = 0
// Poller wants to run every 100ms
const poll = new Poll(() => count++, 100)

const controller = chainable(poll)
  .callNoAwait(x => console.log('Value:', x))
  .run()

// Pausing the consumer stops calls to fn()
controller.stop()

// Resuming the consumer restarts polling
setTimeout(() => {
  controller.start()
}, 2000)
```

### 3. Finite Iteration (`take` or `break`)
When consumer iteration finishes (e.g. `take(5)` or `break`), iteration completes cleanly and any `finally` handlers run automatically without needing to call `poll.done()`.

```javascript
import { chainable, Poll } from '@toolbuilder/await-for-it'

const poll = new Poll(async () => fetchMetrics(), 500)

// take(5) completes after 5 items and terminates the generator
const metrics = await chainable(poll)
  .take(5)
  .toArray()

console.log('Collected 5 samples:', metrics)
```

