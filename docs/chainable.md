# chainable

The `chainable` import is a factory function for creating chainable async iterables. It can be called directly as a function and also provides static generator methods.

All calls return a [ChainableClass](./ChainableClass.md) instance, which provides transforms (e.g. `map`, `filter`), reducers (e.g. `forEach`, `toArray`), and error-handling methods (`catch`, `finally`). If you need a class constructor for `new`, subclassing, or `instanceof` checks, import [ChainableClass](./ChainableClass.md) instead.

- [Function Call](#function-call)
- [from](#from)
- [merge](#merge)
- [range](#range)
- [zip](#zip)
- [zipAll](#zipall)

## Function Call

Call `chainable(iterable)` as a function to create a chainable async iterable from the input iterable.

- `iterable` **(AsyncIterable | Iterable)** any sync or async iterable to make chainable

Returns a [ChainableClass](./ChainableClass.md) instance that yields the items of the input iterable.

```javascript
import { chainable } from '@toolbuilder/await-for-it'

const result = await chainable([0, 1, 2, 3, 4]).map(x => 2 * x).toArray()
console.log(result) // prints [0, 2, 4, 6, 8]
```

## from

Call `chainable.from(iterable)` to create a chainable async iterable from the input iterable. This static factory method is equivalent to calling [`chainable(iterable)`](#function-call) directly.

- `iterable` **(AsyncIterable | Iterable)** any sync or async iterable to make chainable

Returns a [ChainableClass](./ChainableClass.md) instance that yields the items of the input iterable.

```javascript
import { chainable } from '@toolbuilder/await-for-it'

const result = await chainable.from([0, 1, 2, 3, 4]).map(x => 2 * x).toArray()
console.log(result) // prints [0, 2, 4, 6, 8]
```

## merge

Merge the output of zero or more async (or sync) iterables into a single chainable async iterable (`chainable.merge()` with no arguments produces an empty sequence). Each iterable is advanced as fast as possible so that slower iterators do not hold up faster ones. Equal-speed iterables are interleaved in non-deterministic order.

Backpressure is provided by the iterating code. Iteration can be stopped by stopping the iterating code. Active iterators are closed via `return()` on early termination or if any iterable throws/rejects; see [merge](./merge.md) for details on cleanup and exception handling.

- `iterables` **...(AsyncIterable | Iterable)** zero or more sync or async iterables to merge

Returns a [ChainableClass](./ChainableClass.md) instance for the merged iterables.

```javascript
import { chainable } from '@toolbuilder/await-for-it'

const slow = chainable(['slow1', 'slow2']).throttle(60, 60)
const fast = chainable(['fast1', 'fast2']).throttle(10, 10)

const array = await chainable.merge(slow, fast).toArray()
console.log(array) // prints ['fast1', 'fast2', 'slow1', 'slow2']
```

## range

Call `chainable.range(...args)` to generate a sequence of numbers matching Python's `range` function.

- `args` **...number** arguments matching Python's `range`:
  - `range()` produces an empty sequence
  - `range(stop)` starts at 0 and increments by 1 up to (not including) `stop`
  - `range(start, stop)` starts at `start` and increments by 1 up to (not including) `stop`
  - `range(start, stop, step)` starts at `start` and increments by `step` up to (or down to) `stop`

Returns a [ChainableClass](./ChainableClass.md) instance that provides the sequence of numbers specified. Throws `RangeError` if `step` is 0.

Backpressure is provided by the iterating code. Iteration can be stopped by stopping the iterating code.

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

Creates a sequence of arrays the same length as the _shortest_ iterable provided (`chainable.zip()` with no arguments produces an empty sequence). The first array contains the first element from each of the iterables provided, the second array contains the second element from each of the iterables provided, and so on. For each array, `zip` must wait for all iterables to advance, so it can be no faster than the slowest iterable. Backpressure is provided by the iterating code.

When the shortest iterable finishes, on early termination, or if an iterable throws/rejects, all remaining active iterators are closed via `return()`. Rejects with `TypeError` when iterated if any argument is not iterable.

Use [zipAll](#zipall) if you want all iterables to be consumed. Use [merge](#merge) if you want to consume iterables as fast as possible and don't need the elements paired.

- `iterables` **...(AsyncIterable | Iterable)** zero or more sync or async iterables to zip

Returns a [ChainableClass](./ChainableClass.md) instance for the zipped iterables.

```javascript
import { chainable } from '@toolbuilder/await-for-it'

const a = [0, 1, 2]
const b = ['a', 'b', 'c', 'd'] // this array is longer than a
const c = await chainable.zip(a, b).toArray()
console.log(c) // prints [[0, 'a'], [1, 'b'], [2, 'c']]
```

## zipAll

Creates a sequence of arrays the same length as the _longest_ iterable provided (`chainable.zipAll()` with no arguments produces an empty sequence). The first array contains the first element from each of the iterables provided, the second array contains the second element from each of the iterables provided, and so on. Missing elements from shorter iterables are set to `undefined`. For each array, `zipAll` must wait for all active iterables to advance, so it can be no faster than the slowest active iterable. Backpressure is provided by the iterating code.

On completion, early termination, or if an iterable throws/rejects, active iterators are closed via `return()`. Rejects with `TypeError` when iterated if any argument is not iterable.

Use [zip](#zip) if you want iteration to stop when any iterable is consumed. Use [merge](#merge) if you want to consume iterables as fast as possible and don't need the elements paired.

- `iterables` **...(AsyncIterable | Iterable)** zero or more sync or async iterables to zip

Returns a [ChainableClass](./ChainableClass.md) instance for the zipped iterables.

```javascript
import { chainable } from '@toolbuilder/await-for-it'

const a = [0, 1, 2]
const b = ['a', 'b', 'c', 'd'] // this array is longer than a
const c = await chainable.zipAll(a, b).toArray()
console.log(c) // prints [[0, 'a'], [1, 'b'], [2, 'c'], [undefined, 'd']]
```
