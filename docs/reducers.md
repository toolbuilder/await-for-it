# Reducers

Reducers pull and process values produced by an iterable. Although a reducer can take additional parameters and return any value, the last parameter **must** be an iterable (`AsyncIterable` or `Iterable`).

This documentation covers the functional API (`import { reducers } from '@toolbuilder/await-for-it'`). For the chainable API, see [ChainableClass](./ChainableClass.md).

## Table of Contents

- [forEach](#foreach)
- [publish](#publish)
- [reduce](#reduce)
- [run](#run)
- [runAwait](#runawait)
- [toArray](#toarray)

## forEach

Executes `fn(item, index)` for each item in the iterable sequence. Each function call is awaited before advancing to the next item.

### Parameters

- `fn` **(AsyncFunction | [Function][fn])** `fn(item, index)`, where `item` is the current resolved item in the sequence and `index` is its zero-based index.
- `iterable` **(AsyncIterable | Iterable)** the sequence of items to iterate over.

### Throws

- **[TypeError][typeerror]** (rejected Promise) if `fn` is not a function or `iterable` is not iterable. Any exception thrown or rejected by `iterable` or `fn` also rejects the returned Promise and closes the iterator.

### Returns

- **[Promise][promise]** resolves to `[undefined][undefined]` when iteration completes.

### Example

```javascript
import { reducers } from '@toolbuilder/await-for-it'

const fn = (item, index) => console.log(`item - ${item}, index - ${index}`)
await reducers.forEach(fn, [1, 2, 3])
// item - 1, index - 0
// item - 2, index - 1
// item - 3, index - 2
```

## publish

Publishes values from `iterable` in the background to any subscribing functions. Subscribers can be added and removed before or during iteration.

Each subscriber is called with `subscriber(value)` for values produced *after* subscribing:
- Adding a subscriber inside another subscriber's callback only affects subsequent values.
- Unsubscribing a subscriber inside a callback immediately prevents it from being called if it has not yet been notified for the current value.
- Any return value from a subscriber is ignored (no backpressure is applied by subscribers).

### Parameters

- `iterable` **(AsyncIterable | Iterable)** the sequence that provides values to publish.

### Throws

- **[TypeError][typeerror]** throws synchronously if `iterable` is not iterable, or if `publisher.subscribe(subscriber)` is called with a non-function.

### Returns

- **[Object][object] (`PublishController`)** controller with the following members:
  - `subscribe(subscriber)` — registers a subscriber function and returns a numeric subscription key.
  - `unsubscribe(key)` — removes the subscriber associated with `key`.
  - `stop()` — pauses background iteration and publishing before pulling or delivering the next value. Safe no-op once iteration has finished.
  - `start()` — resumes paused iteration and publishing. Safe no-op once iteration has finished.
  - `cancel()` — permanently stops iteration, clears all subscribers, closes the upstream iterator via `return()` (running any `finally` handlers), sets `running` to `false`, and returns `finished`.
  - `running` (**[boolean][boolean]**, read-only) — `true` while iteration is active; `false` when paused via `stop()`, cancelled via `cancel()`, or once iteration finishes (normally or with an error).
  - `finished` (**[Promise][promise]**) — resolves to `undefined` when iteration completes or is cancelled; rejects if an unhandled error escapes `iterable` or a subscriber throws synchronously.

### Exception Handling

- **Upstream errors:** If errors from the source iterable are already handled upstream (for example via `chainable(...).catch(...)`), `publisher.finished` resolves cleanly without requiring an additional `.catch()` on `finished`. If an uncaught error escapes `iterable`, `publisher.finished` rejects with that error (and will cause an `UnhandledPromiseRejection` if not observed via `await publisher.finished` or `publisher.finished.catch(...)`).
- **Subscriber errors:** Because `publish` runs at the end of the pipeline (downstream of `chainable.catch()`), a synchronous exception thrown by a subscriber immediately aborts iteration, closes the upstream iterator, sets `running` to `false`, and rejects `publisher.finished`. Because subscriber return values are ignored, `async` subscribers must handle their own Promise rejections internally (`try/catch`).

### Example

```javascript
import { reducers, transforms, waitToCall } from '@toolbuilder/await-for-it'

const throttled = transforms.throttle(50, 50, [0, 1, 2, 3])
const publisher = reducers.publish(throttled)

const key = publisher.subscribe(console.log) // prints 0, 1 - then unsubscribed
waitToCall(110, () => publisher.unsubscribe(key)) // console.log is no longer called after 110ms

await publisher.finished
```

## reduce

Executes a reducer function `fn(accumulator, item, index)` on each element of the input iterable, resulting in a single output value.

### Parameters

- `fn` **(AsyncFunction | [Function][fn])** `fn(accumulator, item, index)` returning (or resolving to) the updated accumulator value.
- `accumulator` **any** the initial accumulator value (if a Promise is passed, it is awaited before the first call to `fn`).
- `iterable` **(AsyncIterable | Iterable)** the sequence to reduce.

### Throws

- **[TypeError][typeerror]** (rejected Promise) if `fn` is not a function or `iterable` is not iterable. Any exception thrown or rejected by `accumulator`, `iterable`, or `fn` rejects the returned Promise and closes the iterator.

### Returns

- **[Promise][promise]** resolves to the final accumulator value.

### Example

```javascript
import { reducers } from '@toolbuilder/await-for-it'

const add = (a, b) => a + b
const sum = await reducers.reduce(add, 0, [0, 1, 2, 3, 4]) // sum === 10
```

## run

Iterates over `iterable` asynchronously in the background (starting automatically after the current microtask turn) and returns a controller to pause, resume, cancel, or await iteration.

### Parameters

- `iterable` **(AsyncIterable | Iterable)** input iterable.

### Throws

- **[TypeError][typeerror]** throws synchronously if `iterable` is not iterable.

### Returns

- **[Object][object] (`RunController`)** controller with the following members:
  - `stop()` — pauses iteration before pulling the next item. Calling `stop()` synchronously right after `run()` prevents even the first item from being pulled until `start()` is called. Safe no-op once iteration has finished.
  - `start()` — resumes paused iteration. Safe no-op once iteration has finished.
  - `cancel()` — permanently stops iteration from the consumer side, closes the upstream iterator via `return()` (running any `finally` handlers), sets `running` to `false`, and returns `finished`. *(Note: for push/timer sources blocked on an internal wait such as an idle [Queue](./queue.md), call `queue.done()` / `poll.done()` to wake the source.)*
  - `running` (**[boolean][boolean]**, read-only) — `true` while iteration is active; `false` when paused via `stop()`, cancelled via `cancel()`, or once iteration finishes (normally or with an error).
  - `finished` (**[Promise][promise]**) — resolves to `undefined` when iteration completes or is cancelled; rejects if an unhandled error escapes `iterable`.

### Exception Handling

- If errors are already handled upstream (for example via `chainable(...).catch(...)`), `control.finished` resolves cleanly without needing a `.catch()` handler on `control.finished`.
- If an uncaught error escapes `iterable`, `control.finished` rejects with that error (and will raise an `UnhandledPromiseRejection` if neither handled upstream nor observed via `await control.finished` or `control.finished.catch(...)`).
- Note that `stop()` only *pauses* iteration—if you want to stop an infinite stream permanently and run `finally` cleanup, call `control.cancel()` (or end the source via `poll.done()` / `queue.done()`).

### Example

```javascript
import { reducers, transforms, Poll, waitToCall } from '@toolbuilder/await-for-it'

const poll = new Poll(() => Date.now(), 25)
const logged = transforms.callNoAwait(console.log, poll)

const control = reducers.run(logged)
if (control.running) control.stop() // pause iteration
control.start() // resume iteration

await waitToCall(100, () => {
  poll.done()
  return control.cancel()
})
```

## runAwait

Drives `iterable` asynchronously until completion and returns a Promise that settles when iteration finishes. Unlike [`run`](#run), there is no pause/resume controller—use `runAwait` when you simply want to `await` completion (and `try/catch` errors) of a side-effecting pipeline.

### Parameters

- `iterable` **(AsyncIterable | Iterable)** iterable to consume.

### Throws

- **[TypeError][typeerror]** (rejected Promise) if `iterable` is not iterable. Any exception thrown or rejected during iteration rejects the returned Promise.

### Returns

- **[Promise][promise]** resolves to `[undefined][undefined]` when iteration completes.

### Example

```javascript
import { reducers, transforms } from '@toolbuilder/await-for-it'

const logged = transforms.callNoAwait(console.log, [0, 1, 2, 3, 4])
await reducers.runAwait(logged)
```

## toArray

Collects all resolved items from `iterable` into an `Array`.

### Parameters

- `iterable` **(AsyncIterable | Iterable)** the iterable to collect.

### Throws

- **[TypeError][typeerror]** (rejected Promise) if `iterable` is not iterable. Any exception thrown or rejected during iteration rejects the returned Promise.

### Returns

- **[Promise][promise]** resolves to an **[Array][array]** containing the sequence items in order.

### Example

```javascript
import { reducers } from '@toolbuilder/await-for-it'

const a = await reducers.toArray([0, 1, 2, 3, 4]) // a is [0, 1, 2, 3, 4]
```

[fn]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function
[undefined]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/undefined
[object]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object
[array]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array
[boolean]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean
[promise]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise
[typeerror]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/TypeError
