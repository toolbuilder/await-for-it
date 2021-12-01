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

Creates a sequence of numbers similar to the Python range function. This can be useful for unit tests.

### Parameters

 -   `args` **...(Integer)** args as shown in examples

### Examples

```javascript
let output

// zero arguments produces an empty sequence
output = await toArray(range())
console.log(output) // prints []

// one Number produces a sequence that starts with zero
// the number specifies how many elements are in the sequence
output = await toArray(range(5))
console.log(output) // prints [0, 1, 2, 3, 4]

// two Numbers produces a sequence starting from the first number
// the second number specifies how many elements are in the sequence
output = await toArray(range(2, 5))
console.log(output) // prints [2, 3, 4, 5, 6]

// three numbers produces a sequence starting from the first number
// the second number specifies how many elements are in the sequence
// the third number specifies the increment - in this case add three to the previous value
output = await toArray(range(2, 5, 3)
console.log(output)  // prints [2, 5, 8, 11, 14]
```

Returns **AsyncIterable** that provides the defined sequence of Numbers

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

Returns **AsyncGenerator** merged iterables as async iterable

## zipAll

Creates a sequence of arrays the same length as the _longest_ iterable provided. The first array contains the first
element from each of the iterables provided. The second array contains the second element from each of the
iterables provided, and so on. Missing elements from the shorter iterables are set to undefined. For each array,
zip must wait for all iterables to advance. For this reason, zip can be no faster than the slowest iterable.
Backpressure is provided by the iterating code.

Use zip if you want iteration to stop when any iterable is consumed. Use merge if you want to consume iterables as
fast as possible, and don't need the elements paired.

-   `iterables` **...(AsyncIterable | Iterable)**

```javascript
const a = [0, 1, 2]
const b = ['a', 'b', 'c', 'd'] // this array is longer than a
const c = await toArray(zipAll(a, b))
console.log(c) // prints [[0, 'a'], [1, 'b'], [2, 'c'], [undefined, 'd']]
```

Returns **AsyncGenerator** merged iterables as async iterable

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
