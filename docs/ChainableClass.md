# ChainableClass

The `ChainableClass` provides a chainable async iterable with transform, reducer, and error-handling methods. Typically, you create instances using the [chainable](./chainable.md) factory.

Constructing a `ChainableClass` like this:

```javascript
import { chainable } from '@toolbuilder/await-for-it'
const chainableClassInstance = chainable([0, 1, 2])
```

Is equivalent to constructing one like this:

```javascript
import { ChainableClass } from '@toolbuilder/await-for-it'
const chainableClassInstance = new ChainableClass([0, 1, 2])
```

> **Note:** Chaining transform or error-handling methods (`map`, `filter`, `catch`, `finally`, etc.) mutates the `ChainableClass` instance in place and returns `this`. Each instance represents a single pipeline rather than creating independent branched copies.

* Static constructors
  * [from](#from)
  * [merge](#merge)
  * [range](#range)
  * [zip](#zip)
  * [zipAll](#zipall)
* Transforms - modify the contents of an iterable stream
  * [arrayToObject](#arraytoobject)
  * [callAwait](#callawait)
  * [callNoAwait](#callnoawait)
  * [chunk](#chunk)
  * [diff](#diff)
  * [filter](#filter)
  * [flatten](#flatten)
  * [flattenRecursive](#flattenrecursive)
  * [flattenUnordered](#flattenunordered)
  * [map](#map)
  * [mapWith](#mapwith)
  * [nth](#nth)
  * [pluck](#pluck)
  * [pool](#pool)
  * [reject](#reject)
  * [take](#take)
  * [throttle](#throttle)
* Reducers - pump your iterable like a `for await...of` loop
  * [forEach](#foreach)
  * [publish](#publish)
  * [reduce](#reduce)
  * [run](#run)
  * [runAwait](#runawait)
  * [toArray](#toarray)
* Error Handling
  * [catch](#catch)
  * [finally](#finally)

## from

Static constructor to create a chainable iterable from an input iterable.

- `iterable` **(AsyncIterable | Iterable)** input iterable

Returns **ChainableClass** instance that yields the same values as the input iterable.

## merge

Merge the output of one or more async (or sync) iterables into a single async iterable. Each
async iterable is advanced as fast as possible, so that slow iterators do not hold
up faster ones. Equal speed iterables are advanced at roughly the same pace.

Backpressure is provided by the iterating code. Iteration can be stopped by stopping
the iterating code. See [merge](./merge.md) for details on cleanup and exception handling.

- `iterables` **...(AsyncIterable | Iterable)**

Returns **ChainableClass** instance that merges the iterables.

## range

Call `chainable.range(...args)` to create a sequence of numbers matching Python's `range` function. This can be useful for unit tests.

- `args` **...(number)** arguments matching Python's `range`:
  - `range()` produces an empty sequence
  - `range(stop)` starts at 0 and increments by 1 up to (not including) `stop`
  - `range(start, stop)` starts at `start` and increments by 1 up to (not including) `stop`
  - `range(start, stop, step)` starts at `start` and increments by `step` up to (or down to) `stop`

Returns a **ChainableClass** that provides the sequence of numbers specified. Throws `RangeError` if `step` is 0.

```javascript
import { chainable } from '@toolbuilder/await-for-it'

let output

// zero arguments produces an empty sequence
output = await chainable.range().toArray()
console.log(output) // prints []

// one argument specifies stop (starts with zero, step 1)
output = await chainable.range(5).toArray()
console.log(output) // prints [0, 1, 2, 3, 4]

// two arguments specify start and stop (step 1)
output = await chainable.range(2, 5).toArray()
console.log(output) // prints [2, 3, 4]

// three arguments specify start, stop, and step
output = await chainable.range(2, 5, 2).toArray()
console.log(output) // prints [2, 4]

// negative step counts down
output = await chainable.range(5, 0, -1).toArray()
console.log(output) // prints [5, 4, 3, 2, 1]
```

## zip

Creates a sequence of arrays the same length as the _shortest_ iterable provided. The first array contains the first
element from each of the iterables provided. The second array contains the second element from each of the
iterables provided, and so on. For each array, `zip` must wait for all iterables to advance. For this reason, `zip` can be
no faster than the slowest iterable. Backpressure is provided by the iterating code.

Use [zipAll](#zipall) if you want all iterables to be consumed. Use [merge](#merge) if you want to consume iterables as fast as possible, and
don't need the elements paired.

- `iterables` **...(AsyncIterable | Iterable)**

Returns **ChainableClass** instance that yields the zipped values.

```javascript
const a = [0, 1, 2]
const b = ['a', 'b', 'c', 'd'] // this array is longer than a
const c = await chainable.zip(a, b).toArray()
console.log(c) // prints [[0, 'a'], [1, 'b'], [2, 'c']]
```

## zipAll

Creates a sequence of arrays the same length as the _longest_ iterable provided. The first array contains the first
element from each of the iterables provided. The second array contains the second element from each of the
iterables provided, and so on. Missing elements from the shorter iterables are set to `undefined`. For each array,
`zipAll` must wait for all active iterables to advance. For this reason, `zipAll` can be no faster than the slowest iterable.
Backpressure is provided by the iterating code.

Use [zip](#zip) if you want iteration to stop when any iterable is consumed. Use [merge](#merge) if you want to consume iterables as
fast as possible, and don't need the elements paired.

- `iterables` **...(AsyncIterable | Iterable)**

Returns **ChainableClass** instance that yields the zipped values.

```javascript
const a = [0, 1, 2]
const b = ['a', 'b', 'c', 'd'] // this array is longer than a
const c = await chainable.zipAll(a, b).toArray()
console.log(c) // prints [[0, 'a'], [1, 'b'], [2, 'c'], [undefined, 'd']]
```

## arrayToObject

Converts a sequence of Arrays to a sequence of Objects by assigning the property names
to each array element in turn. The input sequence doesn't have to provide arrays; it can
provide any iterable object.

If the arrays in iterable are too long, extra values are ignored.

If the arrays in iterable are too short, the remaining properties are assigned `undefined`.
See example.

- `propertyNames` **Iterable** a sequence of property names

```javascript
const objects = await chainable([[0, 1], [2, 3, 'a'], [4]]).arrayToObject(['a', 'b']).toArray()
// objects is [{ a: 0, b: 1 }, { a: 2, b: 3 }, { a: 4, b: undefined }]
```

Returns **ChainableClass** for the sequence of created Objects.

## callAwait

Pass the input sequence to the output sequence without change, executing `fn(item)` for each
item in the sequence. Awaits the result of each function call before yielding the value.

- `fn` **(AsyncFunction | [Function][92])** function `fn(item)` called for each item in the sequence

```javascript
await chainable([1, 2, 3, 4, 5]).callAwait(console.log).runAwait()
// logs each value on a separate line in order
```

Returns **ChainableClass** that yields the same items as the input iterable.

## callNoAwait

Pass the input sequence to the output sequence without change, executing `fn(item)` for each
item in the sequence without awaiting its return value before yielding the item.

- `fn` **(AsyncFunction | [Function][92])** function `fn(item)` called for each item in the sequence (its return value is ignored; async functions must handle their own Promise rejections)

```javascript
await chainable([1, 2, 3, 4, 5]).callNoAwait(console.log).runAwait()
// logs each value on a separate line
```

Returns **ChainableClass** that yields the same items as the input iterable.

## chunk

Chunk every `n` items into an array, and output that array in the output sequence.
Chunks are yielded after `timeout` milliseconds even if not full, so that values
can be processed in a timely manner. Never yields empty chunks.

Backpressure is provided by the iterator when a chunk is yielded. Stopping the
iterator will stop chunking and close the input iterable.

- `n` **[Number][93]** size of arrays (must be an integer `>= 1`; throws `RangeError` otherwise)
- `timeout` **[Number][93]** milliseconds before yielding a partial chunk if not full (must be a finite number `>= 0`; throws `RangeError` otherwise)

```javascript
const chunks = await chainable([0, 1, 2, 3, 4]).chunk(2, 100).toArray()
console.log(chunks) // prints [[0, 1], [2, 3], [4]]
```

Returns **ChainableClass** that chunks the input iterable.

## diff

Execute `fn(previous, current)` and yield the result for each adjacent pair.
Useful for calculating differences between consecutive values (such as timestamps).

- `fn` **(AsyncFunction | [Function][92])** `fn(previous, current)`, yielding the resolved return value

Returns **ChainableClass**. If input has two or more items, output sequence
is one shorter than input sequence. Otherwise, no items are output.

```javascript
const a = await chainable([0, 1, 2, 3, 4]).diff((n, m) => m - n).toArray()
console.log(a) // prints [1, 1, 1, 1]
```

## filter

Keeps items from the input sequence when `await fn(item)` is truthy, and omits all other items.

- `fn` **(AsyncFunction | [Function][92])** `fn(item)` returning (or resolving to) a truthy value when the item should be kept

Returns **ChainableClass** for the filtered sequence.

```javascript
const isEvenNumber = x => x % 2 === 0
const a = await chainable([0, 1, 2, 3, 4, 5, 6]).filter(isEvenNumber).toArray()
console.log(a) // prints [0, 2, 4, 6]
```

## flatten

Flattens a sequence of items one level deep. It does not flatten strings, TypedArrays/Buffers,
Maps, or other built-in record/value types (such as URLSearchParams, Headers, and FormData),
even though they are iterable. Can flatten async and sync iterables within the provided
iterable. Explicit opt-in or opt-out is supported via `Symbol.isConcatSpreadable`.

Returns **ChainableClass** for the flattened sequence.

```javascript
const a = await chainable([[0, 1], [2, 3], [4, 5], [6]]).flatten().toArray()
console.log(a) // prints [0, 1, 2, 3, 4, 5, 6]

// Objects can opt out of flattening:
const nonSpreadable = [7, 8]
nonSpreadable[Symbol.isConcatSpreadable] = false
const b = await chainable([[1, 2], nonSpreadable]).flatten().toArray()
// b is [1, 2, [7, 8]]
```

## flattenRecursive

Flattens a sequence by recursively returning items from each iterable in the sequence.
Does not flatten strings, TypedArrays/Buffers, Maps, or other built-in record/value types
even though they are iterable. Can flatten combinations of async and sync iterables
within the provided iterable. Explicit opt-in or opt-out is supported via `Symbol.isConcatSpreadable`.

```javascript
const input = [0, [1, 2, 3], [[4, 5], [[[6, 7]], [8, 9], 10]], 11, 12]
const a = await chainable(input).flattenRecursive().toArray()
console.log(a) // prints [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
```

Returns **ChainableClass** for the flattened sequence.

## flattenUnordered

Flattens a sequence of items one level deep. Unlike [flatten](#flatten), `flattenUnordered` attempts
to flatten several iterables at the same time, so the output is not in a predictable
order. Async and sync iterables within the provided iterable are supported. Does not
flatten strings, TypedArrays/Buffers, Maps, or other built-in record/value types even
though they are iterable. Explicit opt-in or opt-out is supported via `Symbol.isConcatSpreadable`.

The number of iterables being flattened at the same time is limited by `maxPoolSize`. When
this number is reached, `flattenUnordered` will begin to apply backpressure if it is being
iterated more slowly than the input iterables can supply data. In other words, no more
than `maxPoolSize` Promises will be pending at any given time.

If an exception occurs (or if iteration terminates early via `break`, `take()`, or a downstream error), `flattenUnordered` automatically closes all active child iterators and the input iterator by calling `.return()`, executing their cleanup logic and preventing unhandled operations or leaked resources.

- `maxPoolSize` **[Number][93]** maximum number of iterables to flatten at the same time (must be an integer `>= 1`; throws `RangeError` otherwise)

```javascript
const a = await chainable([[1, 2, 3], [4, 5], 6, [7, 8]]).flattenUnordered(5).toArray()
console.log(a.sort()) // prints [1, 2, 3, 4, 5, 6, 7, 8]
```

Returns **ChainableClass** for the flattened sequence.

See [flatten-unordered.js](../examples/flatten-unordered.js) for an executable example demonstrating `Symbol.isConcatSpreadable` (opt-in and opt-out), [flatten-unordered-exceptions.js](../examples/flatten-unordered-exceptions.js) for exception handling and child iterable `.return()` cleanup, and [flatten-unordered-task-tracking.js](../examples/flatten-unordered-task-tracking.js) for tracking and recovering unstarted and in-flight tasks with `mapWith`.

## map

Generates a sequence of items by calling `fn(item)` for each item of the input iterable.

- `fn` **(AsyncFunction | [Function][92])** `fn(item)` returning (or resolving to) the output item

```javascript
const a = await chainable([0, 1, 2, 3]).map(x => 2 * x).toArray()
console.log(a) // prints [0, 2, 4, 6]
```

Returns **ChainableClass** for the mapped sequence.

## mapWith

Map the input sequence to the output sequence using a custom generator or transform function that takes an iterable and returns an iterable.

This method exists so that `ChainableClass` supports chaining for arbitrary generator functions.

- `generatorFunction` **[Function][92]** a function that accepts the current `(AsyncIterable | Iterable)` and returns an `(AsyncIterable | Iterable)`

```javascript
const fn = async function * (iterable) {
  for await (const x of iterable) {
    yield x * x
  }
}
const a = await chainable([0, 1, 2, 3]).mapWith(fn).toArray()
console.log(a) // prints [0, 1, 4, 9]
```

Returns **ChainableClass** for the mapped sequence.

## nth

Given a sequence of Arrays, output the `nth` element of each array as a sequence.

- `index` **[Number][93]** the index of the Array to output. Negative index values
  are supported; the index of the last element is `-1`.

```javascript
const input = [[0, 1], [2, 3], [4, 5]]
const a = await chainable(input).nth(1).toArray()
console.log(a) // prints [1, 3, 5]
```

Returns **ChainableClass** for the `nth` elements.

## pluck

Given a sequence of Objects, output the specified property of each Object as a sequence.

- `propertyName` **([String][94] | [Number][93] | Symbol)** the property key to extract from each Object

```javascript
const input = [{ a: 1, b: 2 }, { a: 3, b: 4 }, { a: 5, b: 6 }]
const a = await chainable(input).pluck('a').toArray()
console.log(a) // prints [1, 3, 5]
```

Returns **ChainableClass** for the plucked items.

## pool

Execute functions provided by the input iterable concurrently. Yields resolved results as they complete, with
no more than `maxPoolSize` promises pending at any time. Results may be out of order with
respect to the input order.

This is the chainable version of the [pool](./pool.md) async generator.

- `maxPoolSize` **[Number][93]** maximum number of pending promises at any given time

```javascript
import { chainable, waitToCall } from '@toolbuilder/await-for-it'

const tasks = [
  () => waitToCall(40, () => 'slow'),
  () => waitToCall(10, () => 'fast')
]
const results = await chainable(tasks).pool(2).toArray()
console.log(results) // prints ['fast', 'slow']
```

Returns **ChainableClass** that provides the output values as they resolve.

## reject

Removes items when `await fn(item)` is truthy, keeping all other items.

- `fn` **(AsyncFunction | [Function][92])** `fn(item)` returning (or resolving to) a truthy value when the item should be removed from the output sequence

```javascript
const isEvenNumber = x => x % 2 === 0
const a = await chainable([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).reject(isEvenNumber).toArray()
console.log(a) // prints [1, 3, 5, 7, 9]
```

Returns **ChainableClass** for the non-rejected items.

## take

Provide the first `n` values of the iterable. Useful to truncate infinite sequences.

When `n` values have been yielded, early termination occurs, which triggers the upstream iterator's `return()` method per the iteration protocol. This ensures upstream generators execute their `finally` blocks and cleanly release any allocated resources (such as stopping polling timers or closing streams). If the input sequence has fewer than `n` values, iteration completes when the input sequence ends.

- `n` **[Number][93]** number of items to take

```javascript
const a = await chainable([0, 1, 2, 3, 4]).take(2).toArray()
console.log(a) // prints [0, 1]
```

Returns **ChainableClass** providing the first `n` values.

## throttle

Throttle an iterable to a maximum iteration speed.

- `period` **[Number][93]** milliseconds to wait between yielding each value
- `initialWait` **[Number][93]** milliseconds before yielding the first value

```javascript
const a = await chainable([0, 1, 2, 3, 4]).throttle(100, 0).toArray()
console.log(a) // prints [0, 1, 2, 3, 4] with 100ms wait after each element
```

Returns **ChainableClass** for the throttled sequence of values.

## forEach

Executes `fn(item, index)` for each item in the sequence. Each function
call must resolve before `fn` is called again.

- `fn` **(AsyncFunction | [Function][92])** `fn(item, index)`, where `item` is the current item in the sequence and `index`
  is its zero-based index.

```javascript
const fn = (item, index) => console.log(`item - ${item}, index - ${index}`)
await chainable([1, 2, 3]).forEach(fn)
// item - 1, index - 0
// item - 2, index - 1
// item - 3, index - 2
```

Returns **[Promise][95]** resolving to `[undefined][96]` when iteration completes.

## publish

Publishes values in the background to any subscribing functions. Subscribers can
be added and removed before or during iteration.

Functions are passed each value from the iterable. Only values produced
after subscribing are provided, and unsubscribing during dispatch immediately skips
uncalled subscribers. Any return value is ignored.

You can pause, resume, permanently cancel, or await the publisher via the returned controller:

```javascript
import { chainable, waitToCall } from '@toolbuilder/await-for-it'

const publisher = chainable([0, 1, 2, 3]).throttle(50, 50).publish()
const key = publisher.subscribe(console.log) // prints 0, 1 - then unsubscribed
if (publisher.running) publisher.stop()
publisher.start()
waitToCall(110, () => publisher.unsubscribe(key)) // console.log is no longer called after 110ms
await publisher.finished
```

Returns **[Object][91] (`PublishController`)** with:
- `subscribe(subscriber)` — registers a subscriber function (throws `TypeError` if not a function) and returns a subscription key.
- `unsubscribe(key)` — removes the subscriber with that key.
- `stop()` / `start()` — pauses or resumes iteration and publishing (no-op once finished).
- `cancel()` — permanently terminates iteration, clears subscribers, closes the upstream iterator (running any `finally` blocks), sets `running` to `false`, and returns `finished`.
- `running` (**[Boolean][98]**, read-only) — `true` while active; `false` when paused, cancelled, or finished.
- `finished` (**[Promise][95]**) — resolves when iteration completes or is cancelled; rejects if an uncaught error escapes the chain or a subscriber throws synchronously. If upstream errors are caught via [catch](#catch), `finished` resolves cleanly. Because subscriber return values are ignored, `async` subscribers must handle their own rejections internally.

## reduce

Executes a reducer function `fn(accumulator, item, index)` on each element of
the sequence, resulting in a single output value.

- `fn` **(AsyncFunction | [Function][92])** `fn(accumulator, item, index)` returning (or resolving to)
  the new accumulator value.
- `accumulator` **any** the initial accumulator value (or a Promise resolving to it)

```javascript
const add = (a, b) => a + b
const sum = await chainable([0, 1, 2, 3, 4]).reduce(add, 0) // sum === 10
```

Returns **[Promise][95]** resolving to the final accumulator value.

## run

Iterates over the chainable sequence asynchronously in the background, returning a controller
to pause, resume, cancel, inspect, or await iteration.

```javascript
const control = chainable(longRunningIterable)
  .catch(error => handleError(error))
  .run()

if (control.running) control.stop() // pause
control.start() // resume
await control.finished
```

Returns **[Object][91] (`RunController`)** with:
- `stop()` — pauses iteration before pulling the next item (calling `stop()` synchronously right after `run()` prevents even the first pull until `start()`). No-op once finished.
- `start()` — resumes paused iteration. No-op once finished.
- `cancel()` — permanently stops iteration, closes the upstream iterator via `return()` (so [finally](#finally) handlers run), sets `running` to `false`, and returns `finished`.
- `running` (**[Boolean][98]**, read-only) — `true` while active; `false` when paused, cancelled, or finished.
- `finished` (**[Promise][95]**) — resolves when iteration completes or is cancelled; rejects if an uncaught error escapes the chain. If errors are already handled upstream via [catch](#catch), `control.finished` resolves cleanly without needing another `.catch()`.

## runAwait

Drives the sequence asynchronously until completion and returns a Promise that settles when all items are consumed. Unlike [run](#run), there is no pause/resume controller.

```javascript
await chainable([0, 1, 2, 3, 4]).callNoAwait(console.log).runAwait()
```

Returns **[Promise][95]** resolving to `[undefined][96]` when iteration completes.

## toArray

Creates an Array from the items in the sequence.

```javascript
const a = await chainable([0, 1, 2, 3, 4]).toArray() // a is [0, 1, 2, 3, 4]
```

Returns **[Promise][95]** resolving to an **[Array][97]** of the items.

## catch

Catch an exception thrown or rejected by upstream steps in the chain. When an error is caught, upstream iteration stops, downstream `finally` methods still run, and downstream consumers see normal completion unless `fn` rethrows.

- `fn` **[Function][92]** synchronous `fn(error)` error handler (its return value is not awaited)

Returns **ChainableClass** (`this`) that can be chained further.

```javascript
const a = await chainable(someIterableThatCanThrow).catch(error => handleError(error)).toArray()
```

## finally

Run a cleanup function when iteration completes, throws an error, or terminates early (such as via [take](#take), `break` in `for await...of`, or `control.cancel()`).

- `fn` **[Function][92]** synchronous `fn()` cleanup callback (its return value is not awaited)

Returns **ChainableClass** (`this`) that can be chained further.

```javascript
const a = await chainable([1, 2, 3]).finally(() => doSomething()).toArray()
```

[91]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object
[92]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function
[93]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number
[94]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String
[95]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise
[96]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/undefined
[97]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array
[98]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean
