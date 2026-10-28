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

Executable examples demonstrating these patterns are available in the [`examples`](../examples) directory:

- [Polling Indefinitely Until `done()` is Called](../examples/poll-indefinite.js)
- [Backpressure: Downstream Processing Pauses Polling](../examples/poll-backpressure.js)
- [Finite Iteration (`take` or `break`)](../examples/poll-finite.js)
