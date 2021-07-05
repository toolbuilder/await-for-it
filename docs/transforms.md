# Transforms

These are the functional counterparts to the [chainable](./chainable.md) methods. In fact, these are the functions used by the chainable code.

Transform methods can have any number of parameters, but the last parameter is **always** the iteratable to transform. Transform methods should **always** accept either synchronous iterables or async iterables to transform.

-   [arrayToObject][1]
-   [callAwait][4]
-   [callNoAwait][7]
-   [diff][10]
-   [filter][13]
-   [flatten][16]
-   [flattenRecursive][19]
-   [flattenUnordered][20]
-   [map][22]
-   [mapWith][25]
-   [nth][28]
-   [pluck][31]
-   [reject][34]
-   [take][37]
-   [throttle][40]
-   [pool][43]
-   [chunk][45]
-   [callWithTimeout][47]
-   [wait][49]
-   [waitToCall][51]

## arrayToObject

Converts a sequence of Arrays to a sequence of Objects by assigning the property names
to each array element in turn. The input sequence doesn't have to provide arrays, it can
provide any iterable object.

If the arrays in iterable are too long, extra values are ignored.

If the arrays in iterable are too short, the remaining properties are assigned undefined.
See example.

-   `propertyNames` **Iterable** a sequence of property names
-   `iterable` **(AsyncIterable | Iterable)** a sequence of arrays (or any iterable objects)

```javascript
const objects = await toArray(arrayToObject(['a', 'b'], [[0, 1], [2, 3, 'a'], [4]]))
// objects is [{'a': 0, 'b': 1 }, {'a': 2, 'b': 3 }, {'a': 4, 'b': undefined }]
```

Returns **AsyncGenerator** for the sequence of created Objects

## callAwait

Pass the input sequence to the output sequence without change, but execute `fn(item)` for each
item in the sequence. Awaits the result of each function call before yielding the value.

-   `fn` **(AsyncFunction | [Function][53])** function, `fn(item)` is called for each item in the sequence
-   `iterable` **(AsyncIterable | Iterable)** the input sequence

```javascript
const a = callAwait(console.log, [1, 2, 3, 4, 5])
[...a] // iterates over `a` and prints each value on a separate line
```

Returns **AsyncGenerator** that is equivalent to the input iterable

## callNoAwait

Pass the input sequence to the output sequence without change, but execute `fn(item)` for each
item in the sequence. Will not await the result before yielding the value.

-   `fn` **(AsyncFunction | [Function][53])** synchronous function, `fn(item)` is called for each item in the sequence
-   `iterable` **(AsyncIterable | Iterable)** the input sequence

```javascript
const a = callNoAwait(console.log, [1, 2, 3, 4, 5]) // logs each value
```

Returns **AsyncGenerator** that is equivalent to the input iterable

## diff

Execute fn(previous, current) and yields the result for each pair.
Would be useful for calculating time differences between timestamps.

-   `fn` **(AsyncFunction | [Function][53])** fn(previous, current), yielding return value
-   `iterable` **(AsyncIterable | Iterable)** the input iterable

```javascript
const a = diff((n, m) => m - n, [0, 1, 2, 3, 4])
console.log(await toArray(a)) // prints [1, 1, 1, 1]
```

Returns **AsyncGenerator** if input has two or more items, output sequence
is one shorter than input sequence. Otherwise, no items are output.

## filter

Keeps item from input sequence when fn(item) returns truthy. Remove items from input sequence when
fn(item) returns !truthy.

-   `fn` **[Function][53]** synchronous fn(item) returns truthy when item should be removed
-   `iterable` **(AsyncIterable | Iterable)** the sequence to filter

```javascript
const isEvenNumber = x => x % 2 === 0
const a = filter(isEvenNumber, [0, 1, 2, 3, 4, 5, 6])
console.log(await toArray(a)) // prints even numbers [0, 2, 4, 6]
```

Returns **AsyncGenerator** for the filtered sequence

## flatten

Flattens a sequence of items one level deep. It does not flatten strings, even
though they are iterable. Can flatten async and sync iterables within the provided
iterable.

-   `iterable` **(AsyncIterable | Iterable)** the iterable sequence to flatten

```javascript
const a = flatten([[0, 1], [2, 3], toAsync([4, 5]), [6]])
console.log(await toArray(a)) // prints [0, 1, 2, 3, 4, 5, 6]
```

Returns **AsyncGenerator** for the flattened sequence

## flattenRecursive

Flattens a sequence by recursively returning items from each iterable in the sequence.
Does not flatten strings even though they are iterable. Can flatten combinations of
async and sync iterables within the provided iterable.

-   `iterable` **(AsyncIterable | Iterable)** the sequence to flatten

```javascript
const input = [0, [1, 2, 3], [[4, 5], [[toAsync([6, 7])], [8, 9], 10]], 11, 12]
const a = flattenRecursive(input)
console.log(await toArray(a)) // prints [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
```

Returns **AsyncGenerator** for the flattened sequence

## flattenUnordered

Flattens a sequence of items one level deep. Unlike flatten, flattenUnordered attempts
to flatten several iterables at the same time, so the output is not in a predicatable
order. Async and sync iterables within the provided iterable are supported. Strings
are not flattened even though they are iterable.

The number of iterables being flattened at the same time is limited by maxPoolSize. When
this number is reached, flattenUnordered will begin to apply backpressure if it is being
iterated more slowly than the input iterables can supply data. In other words, no more
than maxPoolSize Promises will be pending at any given time.

-   `maxPoolSize` **[Number][3]** maximum number of iterables to flatten at same time
-   `iterable` **(AsyncIterable | Iterable)** the sequence to flatten

```javascript
const a = flattenUnordered(5, [[1, 2, 3], [4, 5], 6, [7, 8]])
console.log(await toArray(a).sort()) // prints [1, 2, 3, 4, 5, 6, 7, 8]
```

Returns **AsyncGenerator** for the flattened sequence

## map

Generates a sequence of items by calling fn(item) for each item of the input iterable.

-   `fn` **(AsyncFunction | [Function][53])** fn(item) returns the output item
-   `iterable` **(AsyncIterable | Iterable)** the sequence to map

```javascript
const a = map(x => 2 * x, [0, 1, 2, 3])
console.log(await toArray(a)) // prints [0, 2, 4, 6]
```

Returns **AsyncGenerator** for the mapped sequence

## mapWith

Map the input sequence to the output sequence with an async generator that maps one iterator to another.

This method exists solely so that ChainableIterable supports chaining for an arbitrary generator function.

-   `generatorFunction` **AsyncGeneratorFunction** a function that returns an async iterable object,
    and takes an async iterable as a parameter.
-   `iterable` **(AsyncIterable | Iterable)** the input sequence

```javascript
const fn = async function * (iterable) {
  for await (let x of iterable) {
    yield x * x
  }
}
const a = mapWith(fn, [0, 1, 2, 3])
console.log(await toArray(a)) // prints [0, 1, 4, 9]
```

Returns **AsyncGenerator** for the mapped sequence

## nth

Given a sequence of Arrays, output the nth element of each array as a sequence.

-   `index` **[Number][54]** the index of the Array to output. Negative index values
    are ok. The index of the last element is -1.
-   `iterable` **(AsyncIterable | Iterable)** the iterable to process

```javascript
const input = [[0, 1], [2, 3], [4, 5]]
const a = nth(1, input)
console.log(await toArray(a)) // prints [1, 3, 5]
```

Returns **AsyncGenerator** for the nth elements

## pluck

Given a sequence of Objects, output the specified property of each Object as a sequence.

-   `propertyName`
-   `iterable` **(AsyncIterable | Iterable)** the input sequence of Objects
-   `propertyname` **[string][55]** the property to extract from each Object

```javascript
const input = [{'a': 1, 'b': 2}, {'a': 3, 'b': 4}, {'a': 5, 'b': 6}]
const a = pluck('a', input)
console.log(await toArray(a))) // prints [1, 3, 5]
```

Returns **AsyncGenerator** for the plucked items

## reject

Reject items when fn(item) returns truthy.

-   `fn` **[Function][53]** synchronous fn(item) returns truthy when item should be removed from output sequence
-   `iterable` **(AsyncIterable | Iterable)** input sequence

```javascript
const isEvenNumber = x => x % 2 === 0
const a = reject(isEvenNumber, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
console.log(await toArray(a)) // prints [1, 3, 5, 7, 9]
```

Returns **AsyncGenerator** for the non-rejected items

## take

Provide the first n values of iterator. Useful to truncate infinite sequences.

-   `n` **[Number][54]** number of items to take
-   `iterable` **(AsyncIterable | Iterable)** provides the first n values

```javascript
const a = take(2, [0, 1, 2, 3, 4])
console.log(await toArray(a)) // prints [0, 1]
```

Returns **AsyncGenerator** provides the first n values

## throttle

Throttle an async iterator to a maximum iteration speed.

-   `period` **[Number][54]** milliseconds to wait between yielding each value
-   `initialWait` **[Number][54]** milliseconds before yielding first value
-   `iterable` **(AsyncIterable | Iterable)** the async iterable to throttle

```javascript
const a = throttle(100, 0, [0, 1, 2, 3, 4])
console.log(await toArray(a)) // prints [0, 1, 2, 3, 4] with 100ms wait after each element
```

Returns **AsyncGenerator** the throttled sequence of values

## pool

Execute functions provided by input iterable. Returns results as they resolve, with
no more than maxPoolSize promises pending at any time. Results may be out of order with
respect to the input order.

The input iterable can yield anything but constructor functions. However, async and sync
functions are handled specially. Each function will be called, and the result placed into
the pool to be yielded when resolved. Promises will remain in the pool until they resolve,
other values will resolve immediately as you would expect. Consider using promiseWithTimeout,
or your own favorite timeout promise.

As always with async iterables, if the input iterable yields a Promise, pool must wait
until the Promise resolves before advancing the input iterable. This
defeats the purpose of pool. So if you need to yield a promise from input iterator,
wrap it with a function like so: `() => promise`. Pool will call the function to get
the Promise, then advance the input iterable to get the next value.

The iterating code provides backpressure, and can stop function calls by stopping iteration.

-   `maxPoolSize` **[Number][54]** maximum number of pending promises at any given time
-   `iterable` **(AsyncIterable | Iterable)** input iterable, should yield functions for pool
    to work as intended.


-   Throws **any** if iterable throws, or if any functions yielded by iterable throws, or if any
    Promise in the pool rejects, the exception will be caught and rethrown by pool, so that the
    iterating code can handle it. Once an exception is thrown, the iterator is done.

Returns **AsyncGenerator** a generator that provides the output values as they occur

## chunk

Chunk every n items into an array, and output that array in the output sequence.
Chunks are yielded after `timeout` milliseconds even if not full, so that values
can be processed in a timely manner. Never yields empty chunks.

Backpressure is provided by the iterator when a chunk is yielded. Stopping the
iterator will stop chunking and the input iterable.

-   `n` **[Number][54]** size of arrays
-   `timeout` **[Number][54]** number of milliseconds before yielding chunk if not full
-   `iterable` **(AsyncIterable | Iterable)** the iterable to chunk

Returns **AsyncGenerator** provides each chunk in order

## callWithTimeout

Create a Promise that calls a timeoutFunction if the promiseFunction does not resolve before
timeoutDuration milliseconds. The promiseFunction is always called, so the timeout cannot stop it.

If the timeoutFunction resolves or rejects first, the promiseFunction resolution will be lost. If
the results are important to you, you'll need to provide access another way.

The timeoutFunction will only be called if the promiseFunction does not resolve before the timeout.

-   `timeoutDuration` **[Number][54]** milliseconds to wait before calling timeoutFunction
-   `promiseFunction` **[Function][53]** normal promise function with resolve, reject as parameters
-   `timeoutFunction` **[Function][53]** normal promise function with resolve, reject as parameters,
    called only if promise times out.

## wait

Create a promise that resolves after `ms` milliseconds.

-   `ms` **[Number][54]** the minimum number of milliseconds to wait before resolving.

## waitToCall

Wait before calling a function and returning the resolved value.

-   `ms` **[Number][54]** milliseconds to wait before calling function 'fn'
-   `fn` **(AsyncFunction | [Function][53])** function to call

Returns **[Promise][56]** that resolves to the return value of fn, or the value it resolves
to if fn is async.

[1]: #arraytoobject

[2]: #parameters

[3]: #examples

[4]: #callawait

[5]: #parameters-1

[6]: #examples-1

[7]: #callnoawait

[8]: #parameters-2

[9]: #examples-2

[10]: #diff

[11]: #parameters-3

[12]: #examples-3

[13]: #filter

[14]: #parameters-4

[15]: #examples-4

[16]: #flatten

[17]: #parameters-5

[18]: #examples-5

[19]: #flattenrecursive

[20]: #flattenunordered

[21]: #examples-6

[22]: #map

[23]: #parameters-7

[24]: #examples-7

[25]: #mapwith

[26]: #parameters-8

[27]: #examples-8

[28]: #nth

[29]: #parameters-9

[30]: #examples-9

[31]: #pluck

[32]: #parameters-10

[33]: #examples-10

[34]: #reject

[35]: #parameters-11

[36]: #examples-11

[37]: #take

[38]: #parameters-12

[39]: #examples-12

[40]: #throttle

[41]: #parameters-13

[42]: #examples-13

[43]: #pool

[44]: #parameters-14

[45]: #chunk

[46]: #parameters-15

[47]: #callwithtimeout

[48]: #parameters-16

[49]: #wait

[50]: #parameters-17

[51]: #waittocall

[52]: #parameters-18

[53]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function

[54]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number

[55]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String

[56]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise
