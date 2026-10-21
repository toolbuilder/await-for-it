# chainable

The `chainable` import is a factory function/class for creating chainable async iterables. It provides a function call and several static methods.

All methods return a [ChainableClass](./ChainableClass.md) instance which provides transforms (e.g. map, filter), and reducers (e.g. forEach, toArray).

  * [Function Call][2]
  * [from][3]
  * [merge][4]
  * [range][7]
  * [zip][5]
  * [zipAll][6]

## Function Call

Call `chainable` as a function to create a chainable async iterable from the input iterable.

-   `iterable` **(AsyncIterable | Iterable)** any iterable to make chainable

Returns a [ChainableClass](./ChainableClass.md) that is a chainable version of the input iterable.

```javascript
import { chainable } from '@toolbuilder/await-for-it'

const result = await chainable([0, 1, 2, 3, 4]).map(x => 2 * x).toArray()
console.log(result) // prints [0, 2, 4, 6, 8]
```

## from

Call `chainable.from(iterable)` to create a chainable async iterable from the input iterable. This static factory method mirrors `Array.from`. You can also use [Function Call][2] as an alias to achieve the same result with less typing.

-   `iterable` **(AsyncIterable | Iterable)** any iterable to make chainable

Returns a [ChainableClass](./ChainableClass.md) that is a chainable version of the input iterable.

```javascript
import { chainable } from '@toolbuilder/await-for-it'

const result = await chainable.from([0, 1, 2, 3, 4]).map(x => 2 * x).toArray()
console.log(result) // prints [0, 2, 4, 6, 8]
```

## range

Call `chainable.range(...args)` to generate a sequence of numbers matching Python's `range` function.

 -   `args` **...number** arguments matching Python's `range`:
     -   `range()` produces an empty sequence
     -   `range(stop)` starts at 0 and increments by 1 up to (not including) `stop`
     -   `range(start, stop)` starts at `start` and increments by 1 up to (not including) `stop`
     -   `range(start, stop, step)` starts at `start` and increments by `step` up to (or down to) `stop`

Returns a [ChainableClass](./ChainableClass.md) that provides the sequence of numbers specified. Throws `RangeError` if `step` is 0.

Backpressure is provided by the iterating code. Iteration can be stopped by stopping
the iterating code.

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

## merge

Merge the output of one or more async (or sync) iterables into a single async iterable. Each
async iterable is advanced as fast as possible, so that slow iterators do not hold
up faster ones. Equal speed iterables are advanced at roughly the same pace.

Backpressure is provided by the iterating code. Iteration can be stopped by stopping
the iterating code.

-   `iterables` **...(AsyncIterable | Iterable)**

Returns a [ChainableClass](./ChainableClass.md) that is a chainable version of the merged iterables.

```javascript
import { chainable } from '@toolbuilder/await-for-it'

const array = await chainable.merge([0, 1, 2], [3, 4]).toArray()
console.log(array) // prints [0, 1, 2, 3, 4]
// NOTE: for async iterator inputs, faster iterators will advance faster
```

## zip

Creates a sequence of arrays the same length as the _shortest_ iterable provided. The first array contains the first
element from each of the iterables provided. The second array contains the second element from each of the
iterables provided, and so on. For each array, zip must wait for all iterables to advance. For this reason, zip can be
no faster than the slowest iterable. Backpressure is provided by the iterating code.

Use [zipAll](#zipall) if you want all iterables to be consumed. Use [merge](#merge) if you want to consume iterables as fast as possible, and
don't need the elements paired.

-   `iterables` **...(AsyncIterable | Iterable)**

Returns a [ChainableClass](./ChainableClass.md) that is a chainable version of the zipped iterables.

```javascript
import { chainable } from '@toolbuilder/await-for-it'

const a = [0, 1, 2]
const b = ['a', 'b', 'c', 'd'] // this array is longer than a
const c = await chainable.zip(a, b).toArray()
console.log(c) // prints [[0, 'a'], [1, 'b'], [2, 'c']]
```

## zipAll

Creates a sequence of arrays the same length as the _longest_ iterable provided. The first array contains the first
element from each of the iterables provided. The second array contains the second element from each of the
iterables provided, and so on. Missing elements from the shorter iterables are set to undefined. For each array,
zipAll must wait for all active iterables to advance. For this reason, zipAll can be no faster than the slowest iterable.
Backpressure is provided by the iterating code.

Use [zip](#zip) if you want iteration to stop when any iterable is consumed. Use [merge](#merge) if you want to consume iterables as
fast as possible, and don't need the elements paired.

-   `iterables` **...(AsyncIterable | Iterable)**

Returns a [ChainableClass](./ChainableClass.md) that is a chainable version of the zipped iterables.

```javascript
import { chainable } from '@toolbuilder/await-for-it'

const a = [0, 1, 2]
const b = ['a', 'b', 'c', 'd'] // this array is longer than a
const c = await chainable.zipAll(a, b).toArray()
console.log(c) // prints [[0, 'a'], [1, 'b'], [2, 'c'], [undefined, 'd']]
```

[2]: #function-call
[3]: #from
[4]: #merge
[5]: #zip
[6]: #zipall
[7]: #range
