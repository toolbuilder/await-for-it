# Generators

The functions here create a sequence of values from other input values. This is part of the functional API. The chainable API is [here](./chainable.md).

The concept of 'generator' is a bit overloaded in JavaScript. There is the generator function, and the Generator object it produces. This package tries to distinguish between `transform` and `generator`. Although both are technically generator functions, `transforms` are intended to transform an input iterable. Whereas `generators` are intended to produce an iterable from other parameters. Sorry for any confusion.

### Table of Contents

-   [from][1]
-   [merge][3]
-   [range][4]
-   [zip][5]
-   [zipAll][8]

## from

This function exists as a generator solely so that the dynamically generated ChainableIterable class has a static constructor.

-   `iterable` **(AsyncIterable | Iterable)** input iterable

Returns **(AsyncIterable | Iterable)** the input iterable

## merge

Merge the output of one or more async (or sync) iterables into a single async iterable. Each
async iterable is advanced as fast as possible, so that slow iterators do not hold
up faster ones. Equal speed iterables are advanced at roughly the same pace.

Backpressure is provided by the iterating code. Iteration can be stopped by stopping
the iterating code.

### Parameters

-   `iterables` **...(AsyncIterable | Iterable)**

Returns **AsyncGenerator** merged iterables as async iterable

## range

Creates a sequence of numbers matching the Python range function. This can be useful for unit tests.

### Parameters

 -   `args` **...(number)** arguments matching Python's `range`:
     -   `range()` produces an empty sequence
     -   `range(stop)` starts at 0 and increments by 1 up to (not including) `stop`
     -   `range(start, stop)` starts at `start` and increments by 1 up to (not including) `stop`
     -   `range(start, stop, step)` starts at `start` and increments by `step` up to (or down to) `stop`

### Examples

```javascript
import { generators } from '@toolbuilder/await-for-it'

// zero arguments produces an empty sequence
console.log([...generators.range()]) // prints []

// one argument specifies stop (starts with zero, step 1)
console.log([...generators.range(5)]) // prints [0, 1, 2, 3, 4]

// two arguments specify start and stop (step 1)
console.log([...generators.range(2, 5)]) // prints [2, 3, 4]

// three arguments specify start, stop, and step
console.log([...generators.range(2, 5, 2)]) // prints [2, 4]

// negative step counts down
console.log([...generators.range(5, 0, -1)]) // prints [5, 4, 3, 2, 1]
```

Returns **Generator** that provides the defined sequence of numbers

## zip

Creates a sequence of arrays the same length as the _shortest_ iterable provided. The first array contains the first
element from each of the iterables provided. The second array contains the second element from each of the
iterables provided, and so on. For each array, zip must wait for all iterables to advance. For this reason, zip can be
no faster than the slowest iterable. Backpressure is provided by the iterating code.

Use zipAll if you want all iterables to be consumed. Use merge if you want to consume iterables as fast as possible, and
don't need the elements paired.

-   `iterables` **...(AsyncIterable | Iterable)**

### Examples

```javascript
const a = [0, 1, 2]
const b = ['a', 'b', 'c', 'd'] // this array is longer than a
const c = await toArray(zip(a, b))
console.log(c) // prints [[0, 'a'], [1, 'b'], [2, 'c']]
```

Returns **AsyncGenerator** zipped iterables as async iterable

## zipAll

Creates a sequence of arrays the same length as the _longest_ iterable provided. The first array contains the first
element from each of the iterables provided. The second array contains the second element from each of the
iterables provided, and so on. Missing elements from the shorter iterables are set to undefined. For each array,
zipAll must wait for all active iterables to advance. For this reason, zipAll can be no faster than the slowest iterable.
Backpressure is provided by the iterating code.

Use zip if you want iteration to stop when any iterable is consumed. Use merge if you want to consume iterables as
fast as possible, and don't need the elements paired.

-   `iterables` **...(AsyncIterable | Iterable)**

### Examples

```javascript
const a = [0, 1, 2]
const b = ['a', 'b', 'c', 'd'] // this array is longer than a
const c = await toArray(zipAll(a, b))
console.log(c) // prints [[0, 'a'], [1, 'b'], [2, 'c'], [undefined, 'd']]
```

Returns **AsyncGenerator** zipped iterables as async iterable

[1]: #from

[2]: #parameters

[3]: #merge

[4]: #range

[5]: #zip

[6]: #parameters-2

[7]: #examples

[8]: #zipall

[9]: #parameters-3

[10]: #examples-1
