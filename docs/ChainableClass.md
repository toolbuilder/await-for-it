# ChainableClass

The `ChainableClass` provides a chainable async iterable with lots of chaining methods. Typically, you would create instances using the [chainable](./chainable.md) constructor function/class.

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

* Static constructors
  * [from](#from)
  * [merge](#merge)
  * [zip](#zip)
  * [zipAll](#zipAll)
* Transforms - modify the contents of an iterable stream
  * [arrayToObject](#arraytoobject)
  * [callAwait](#callawait)
  * [callNoAwait](#callnoawait)
  * [chunk](#chunk)
  * [diff](#diff)
  * [filter](#filter)
  * [flatten](#flatten)
  * [flattenRecursive](#flattenrecursive)
  * [map](#map)
  * [mapWith](#mathwith)
  * [nth](#nth)
  * [pluck](#pluck)
  * [pool](#pool)
  * [reject](#reject)
  * [take](#take)
  * [throttle](#throttle)
* Reducers - pump your iterable like a for...await loop
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

-   `iterable` **(AsyncIterable | Iterable)** input iterable

Returns **ChainableClass** instance that yields the same values as the input iterable

## merge

Merge the output of one or more async (or sync) iterables into a single async iterable. Each
async iterable is advanced as fast as possible, so that slow iterators do not hold
up faster ones. Equal speed iterables are advanced at roughly the same pace.

Backpressure is provided by the iterating code. Iteration can be stopped by stopping
the iterating code.

-   `iterables` **...(AsyncIterable | Iterable)**

Returns **ChainableClass** instance that will merge the iterables

## zip

Creates a sequence of arrays the same length as the _shortest_ iterable provided. The first array contains the first
element from each of the iterables provided. The second array contains the second element from each of the
iterables provided, and so on. For each array, zip must wait for all iterables to advance. For this reason, zip can be
no faster than the slowest iterable. Backpressure is provided by the iterating code.

Use zipAll if you want all iterables to be consumed. Use merge if you want to consume iterables as fast as possible, and
don't need the elements paired.

-   `iterables` **...(AsyncIterable | Iterable)**

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
iterables provided, and so on. Missing elements from the shorter iterables are set to undefined. For each array,
zip must wait for all iterables to advance. For this reason, zip can be no faster than the slowest iterable.
Backpressure is provided by the iterating code.

Use zip if you want iteration to stop when any iterable is consumed. Use merge if you want to consume iterables as
fast as possible, and don't need the elements paired.

-   `iterables` **...(AsyncIterable | Iterable)**

Returns **ChainableClass** instance that yields the zipped values.

```javascript
const a = [0, 1, 2]
const b = ['a', 'b', 'c', 'd'] // this array is longer than a
const c = await chainable.zipAll(a, b).toArray()
console.log(c) // prints [[0, 'a'], [1, 'b'], [2, 'c'], [undefined, 'd']]
```

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
const objects = await chainable([[0, 1], [2, 3, 'a'], [4]]).arrayToObject(['a', 'b']).toArray()
// objects is [{'a': 0, 'b': 1 }, {'a': 2, 'b': 3 }, {'a': 4, 'b': undefined }]
```

Returns **ChainableClass** for the sequence of created Objects

## callAwait

Pass the input sequence to the output sequence without change, but execute `fn(item)` for each
item in the sequence. Awaits the result of each function call before yielding the value.

-   `fn` **(AsyncFunction | [Function][92])** function, `fn(item)` is called for each item in the sequence
-   `iterable` **(AsyncIterable | Iterable)** the input sequence

```javascript
chainable([1, 2, 3, 4, 5]).callAwait(console.log).run()
// iterates over `a` and prints each value on a separate line
```

Returns **ChainableClass** that is equivalent to the input iterable

## callNoAwait

Pass the input sequence to the output sequence without change, but execute `fn(item)` for each
item in the sequence. Will not await the result before yielding the value.

-   `fn` **(AsyncFunction | [Function][92])** synchronous function, `fn(item)` is called for each item in the sequence

```javascript
chainable([1, 2, 3, 4, 5]).callNoAwait(console.log) // logs each value
```

Returns **ChainableClass** that is equivalent to the input iterable

## chunk

Chunk every n items into an array, and output that array in the output sequence.
Chunks are yielded after `timeout` milliseconds even if not full, so that values
can be processed in a timely manner. Never yields empty chunks.

Backpressure is provided by the iterator when a chunk is yielded. Stopping the
iterator will stop chunking and the input iterable.

-   `n` **[Number][93]** size of arrays
-   `timeout` **[Number][93]** number of milliseconds before yielding chunk if not full

Returns **ChainableClass** that chunks the input iterable.


## diff

Execute fn(previous, current) and yields the result for each pair.
Would be useful for calculating time differences between timestamps.

-   `fn` **(AsyncFunction | [Function][92])** fn(previous, current), yielding return value

Returns **ChainableClass**. If input has two or more items, output sequence
is one shorter than input sequence. Otherwise, no items are output.

```javascript
chainable([0, 1, 2, 3, 4]).diff((n, m) => m - n).callNoAwait(console.log).run()
// prints [1, 1, 1, 1]
```

## filter

Keeps item from input sequence when fn(item) returns truthy. Remove items from input sequence when
fn(item) returns !truthy.

-   `fn` **[Function][92]** synchronous fn(item) returns truthy when item should be removed

Returns **ChainableClass** for the filtered sequence

```javascript
const isEvenNumber = x => x % 2 === 0
chainable([0, 1, 2, 3, 4, 5, 6]).filter(isEvenNumber).callNoAwait(console.log).run()
// prints even numbers [0, 2, 4, 6]
```

## flatten

Flattens a sequence of items one level deep. It does not flatten strings, even
though they are iterable. Can flatten async and sync iterables within the provided
iterable.

-   `iterable` **(AsyncIterable | Iterable)** the iterable sequence to flatten

Returns **ChainableClass** for the flattened sequence

```javascript
chainable([[0, 1], [2, 3], [4, 5], [6]]).flatten().callNoAwait(console.log).run()
// prints [0, 1, 2, 3, 4, 5, 6]
```

## flattenRecursive

Flattens a sequence by recursively returning items from each iterable in the sequence.
Does not flatten strings even though they are iterable. Can flatten combinations of
async and sync iterables within the provided iterable.

-   `iterable` **(AsyncIterable | Iterable)** the sequence to flatten

```javascript
const input = [0, [1, 2, 3], [[4, 5], [[[6, 7]], [8, 9], 10]], 11, 12]
chainable(input).flattenRecursive().callNoAwait(console.log).run()
// prints [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
```

Returns **ChainableClass** for the flattened sequence

## map

Generates a sequence of items by calling fn(item) for each item of the input iterable.

-   `fn` **(AsyncFunction | [Function][92])** fn(item) returns the output item

```javascript
chainable([0, 1, 2, 3]).map(x => 2 * x).callNoAwait(console.log).run()
// prints [0, 2, 4, 6]
```

Returns **ChainableClass** for the mapped sequence

## mapWith

Map the input sequence to the output sequence with an async generator that maps one iterator to another.

This method exists solely so that ChainableClass supports chaining for an arbitrary generator function.

-   `generatorFunction` **AsyncGeneratorFunction** a function that returns an async iterable object,
    and takes an async iterable as a parameter.

```javascript
const fn = async function * (iterable) {
  for await (let x of iterable) {
    yield x * x
  }
}
const a = await chainable([0, 1, 2, 3]).mapWith(fn).toArray()
console.log(a) // prints [0, 1, 4, 9]
```

Returns **ChainableClass** for the mapped sequence

## nth

Given a sequence of Arrays, output the nth element of each array as a sequence.

-   `index` **[Number][93]** the index of the Array to output. Negative index values
    are ok. The index of the last element is -1.

```javascript
const input = [[0, 1], [2, 3], [4, 5]]
const a = await chainable(input).nth(1, input).toArray()
console.log(a) // prints [1, 3, 5]
```

Returns **ChainableClass** for the nth elements

## pluck

Given a sequence of Objects, output the specified property of each Object as a sequence.

-   `propertyname` **[string][94]** the property to extract from each Object

```javascript
const input = [{'a': 1, 'b': 2}, {'a': 3, 'b': 4}, {'a': 5, 'b': 6}]
const a = await chainable(input).pluck('a', input).toArray()
console.log(a) // prints [1, 3, 5]
```

Returns **ChainableClass** for the plucked items

## pool

Execute functions provided by input iterable. Returns results as they resolve, with
no more than maxPoolSize promises pending at any time. Results may be out of order with
respect to the input order.

This is the chainable version of the [pool](./pool.md) async generator. The `iterable` parameter is provided
by the `ChainableClass` instance. Returns **ChainableClass** that provides the output values as they occur.

## reject

Reject items when fn(item) returns truthy.

-   `fn` **[Function][92]** synchronous fn(item) returns truthy when item should be removed from output sequence

```javascript
const isEvenNumber = x => x % 2 === 0
const a = chainable([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).reject(isEvenNumber).toArray()
console.log(a) // prints [1, 3, 5, 7, 9]
```

Returns **ChainableClass** for the non-rejected items

## take

Provide the first n values of iterator. Useful to truncate infinite sequences.

-   `n` **[Number][93]** number of items to take

```javascript
const a = await chainable([0, 1, 2, 3, 4]).take(2).toArray()
console.log(await toArray(a)) // prints [0, 1]
```

Returns **ChainableClass** provides the first n values

## throttle

Throttle an async iterator to a maximum iteration speed.

-   `period` **[Number][93]** milliseconds to wait between yielding each value
-   `initialWait` **[Number][93]** milliseconds before yielding first value

```javascript
const a = await chainable([0, 1, 2, 3, 4]).throttle(100, 0).toArray()
console.log(a) // prints [0, 1, 2, 3, 4] with 100ms wait after each element
```

Returns **ChainableClass** the throttled sequence of values

## forEach

Executes function fn(item, index) for each item in the iterable sequence provided. Each function
call must resolve before the function is called again.

-   `fn` **(AsyncFunction | [Function][92])** a function(item, index), where item is the current item in the sequence, and index
    is the index of the current item.

```javascript
const fn = (item, index) => console.log(`item - ${item}, index - ${index}`)
await chainable([1, 2, 3]).forEach(fn) // prints the following...
// item - 1, index - 0
// item - 2, index - 1
// item - 3, index - 2
```

Returns **[undefined][96]**

## publish

Publishes values to any subscribing function. Functions can
be added and removed during iteration.

Functions are passed the each value from the iterable. Only values provided
after subscribing are provided. Any return value is ignored.

You can also start and stop the publisher if you like.

```javascript
import { chainable, wait } from '@toolbuilder/await-for-it'

const publisher = chainable([0, 1, 2, 3]).throttle(50, 50).publish()
const key = publisher.subscribe(console.log) // prints 0, 1 - then unsubscribed
if (publisher.running) publisher.stop()
publisher.start()
wait(110, publisher.unsubscribe(key)) // console.log is no longer called after 110ms
```

Returns **[Object][91]** Returns an object with subscribe and unsubscribe
methods. The subscribe method accepts a function and returns an unsubscribe
key. The unsubscribe method accepts an unsubscribe key, to remove the function.
Also has start, stop, and running just like the run function.

## reduce

The reduce() method executes a reducer function on each element of
the input iterable, resulting in a single output value.

-   `fn` **(AsyncFunction | [Function][92])** fn(accumulator, item) that returns (or resolves to)
    the new accumulator value.
-   `accumulator` **any** the initial accumulator value

```javascript
const add = (a, b) => a + b
const sum = await chainable([0, 1, 2, 3, 4]).reduce(add, 0) // sum === 10
```

Returns **any** the final accumulator value

## run

Iterates over an iterable asynchronously. It is sort of like
starting a thread, and the returned controller allows you to
start and stop iteration.

```javascript
const control = chainable(longRunningIterable).run()
if (control.running) control.stop()
control.start()
```

Returns **[Object][91]** Has a `start` method to start iteration, although
it is already started when controllable returns. Has a `stop` method to
stop iteration. Has a `running` attribute to check if iteration is running.

## runAwait

Iterates over iterable asynchronously. It is sort of like starting
a thread. Unlike `run(iterable)`, there is no control over iteration.

```javascript
await chainable([0, 1, 2, 3, 4]).runAwait()
```

## toArray

Creates an  Array from the items in iterable.

```javascript
const a = await chainable([0, 1, 2, 3, 4]).toArray() // a is [0, 1, 2, 3, 4]
```

Returns **[Array][97]** the array

## catch

Catch an exception thrown from within the iterable. Iteration stops, however `finally` methods are called.

-   `fn` **[Function][92]** fn(error) that handles the error

Returns **ChainableClass** that can be chained further.

```javascript
const a = await chainable(someIterableThatCanThrow).catch(error => handleError(error)).toArray()
```

## finally

Run a function when iteration completes.

-   `fn` **[Function][92]** fn() that does whatever you want

Returns **ChainableClass** that can be chained further.

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
