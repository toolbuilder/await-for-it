# chainable

The `chainable` import is a factory function/class for creating chainable async iterables. It provides a function call and several static methods.

All methods return a [ChainableClass](./ChainableClass.md) instance.

  * [Function Call][2]
  * [from][3]
  * [merge][4]
  * [zip][5]
  * [zipAll][6]

## Functioncall

Call `chainable` as a function to create a chainable async iterable from the input iterable.

-   `iterable` **(AsyncIterable | Iterable)** any iterable to make chainable

Returns a [ChainableClass](./ChainableClass.md) that is a chainable version of the input iterable.

```javascript
import { chainable } from 'await-for-it'
chainable([0, 1, 3, 4]).map(x => 2 * x).run()
```

## from

Call `chainable.from(iterable)` to create a chainable async iterable from the input iterable. You can use the [Functioncall][2] to achieve the same thing with less typing. This method exists to support the dynamic class construction method.

-   `iterable` **(AsyncIterable | Iterable)** any iterable to make chainable

Returns a [ChainableClass](./ChainableClass.md) that is a chainable version of the input iterable.

```javascript
import { chainable } from 'await-for-it'
chainable.from([0, 1, 3, 4]).map(x => 2 * x).run()
```

## merge

Merge the output of one or more async (or sync) iterables into a single async iterable. Each
async iterable is advanced as fast as possible, so that slow iterators do not hold
up faster ones. Equal speed iterables are advanced at roughly the same pace.

Backpressure is provided by the iterating code. Iteration can be stopped by stopping
the iterating code.

-   `iterables` **...(AsyncIterable | Iterable)**

Returns [ChainableClass](./ChainableClass.md) that is a chainable version of the merged iterables.

```javascript
import { chainable } from 'await-for-it'

const main = async () => {
  const array = await chainable([0, 1, 2], [3, 4]).toArray()
  console.log(array) // prints [0, 1, 2, 3, 4]
  // NOTE: for async iterator inputs, faster iterators will advance faster
}
```

## zip

Creates a sequence of arrays the same length as the _shortest_ iterable provided. The first array contains the first
element from each of the iterables provided. The second array contains the second element from each of the
iterables provided, and so on. For each array, zip must wait for all iterables to advance. For this reason, zip can be
no faster than the slowest iterable. Backpressure is provided by the iterating code.

Use zipAll if you want all iterables to be consumed. Use merge if you want to consume iterables as fast as possible, and
don't need the elements paired.

-   `iterables` **...(AsyncIterable | Iterable)**

Returns [ChainableClass](./ChainableClass.md) that is a chainable version of the zipped iterables.

```javascript
const a = [0, 1, 2]
const b = ['a', 'b', 'c', 'd'] // this array is longer than a
const c = await chainable.zip(a, b).toArray()
console.log(c) // prints [[0, 'a'], [1, 'b'], [2, 'c']]
```

## zipAll

Creates a sequence of arrays the same length as the _longest_ iterable provided. The first array contains the first
element from each of the iterables provided. The second array contains the second element from each of the
iterables provided, and so on. Missing elements from the shorter iterables are set to undefined. For each array,
zip must wait for all iterables to advance. For this reason, zip can be no faster than the slowest iterable.
Backpressure is provided by the iterating code.

Use zip if you want iteration to stop when any iterable is consumed. Use merge if you want to consume iterables as
fast as possible, and don't need the elements paired.

-   `iterables` **...(AsyncIterable | Iterable)**

Returns [ChainableClass](./ChainableClass.md) that is a chainable version of the zipped iterables

```javascript
const a = [0, 1, 2]
const b = ['a', 'b', 'c', 'd'] // this array is longer than a
const c = await chainable.zipAll(a, b).toArray()
console.log(c) // prints [[0, 'a'], [1, 'b'], [2, 'c'], [undefined, 'd']]
```

[2]: #functioncall
[3]: #from
[4]: #merge
[5]: #zip
[6]: #zipAll
