# Reducers

Reducers pull and process each value produced by the iterable. Although they can have any parameters, and output anything, the last parameter **must** be an iterable.

This documentation is for the functional API, although sometimes the examples use the [chainable](./ChainableClass.md) API for now.

## Table of Contents

-   [forEach][1]
-   [publish][4]
-   [reduce][7]
-   [run][10]
-   [runAwait][13]
-   [toArray][16]

## forEach

Executes function fn(item, index) for each item in the iterable sequence provided. Each function
call must resolve before the function is called again.

-   `fn` **(AsyncFunction | [Function][25])** a function(item, index), where item is the current item in the sequence, and index
    is the index of the current item.
-   `iterable` **Iterable** the sequence of items to call fn(item, index) with.

```javascript
const fn = (item, index) => console.log(`item - ${item}, index - ${index}`)
forEach(fn, [1, 2, 3]) // prints the following...
// item - 1, index - 0
// item - 2, index - 1
// item - 3, index - 2
```

Returns **[undefined][26]**

## publish

Publishes values from iterable to any subscribing function. Functions can
be added and removed during iteration.

Functions are passed the each value from the iterable. Only values provided
after subscribing are provided. Any return value is ignored.

-   `iterable` **(AsyncIterable | Iterable)** that provides the values

```javascript
const publisher = chainable([0, 1, 2, 3]).throttle(50, 50).publish()
const key = publisher.subscribe(console.log) // prints 0, 1 - then unsubscribed
wait(110, publisher.unsubscribe(key)) // console.log is no longer called after 110ms
```

Returns **[Object][27]** Returns an object with subscribe and unsubscribe
methods. The subscribe method accepts a function and returns an unsubscribe
key. The unsubscribe method accepts an unsubscribe key, to remove the function.
Also has start, stop, and running just like the run function.

## reduce

The reduce() method executes a reducer function on each element of
the input iterable, resulting in a single output value.

-   `fn` **(AsyncFunction | [Function][25])** fn(accumulator, item) that returns (or resolves to)
    the new accumulator value.
-   `accumulator` **any** the initial accumulator value
-   `iterable` **Iterable** the sequence to execute fn over.

```javascript
const add = (a, b) => a + b
const sum = reduce(add, 0, [0, 1, 2, 3, 4]) // sum === 10
```

Returns **any** the final accumulator value

## run

Iterates over an iterable asynchronously. It is sort of like
starting a thread, and the returned controller allows you to
start and stop iteration.

-   `iterable` **(AsyncIterable | Iterable)** input iterable

```javascript
const control = run(longRunningIterable)
if (control.running) control.stop()
control.start()
```

Returns **[Object][27]** Has a start() method to start iteration, although
it is already started when controllable returns. Has a stop method to
stop iteration. Has a running attribute to check if iteration is running.

## runAwait

Iterates over iterable asynchronously. It is sort of like starting
a thread. Unlike `run(iterable)`, there is no control over iteration.

-   `iterable` **(AsyncIterable | Iterable)** iterable to iterate over

```javascript
await runAwait([0, 1, 2, 3, 4])
```

## toArray

Creates an  Array from the items in iterable.

-   `iterable` **(AsyncIterable | Iterable)** the iterable to create the array from

```javascript
const a = await toArray([0, 1, 2, 3, 4]) // a is [0, 1, 2, 3, 4]
```

Returns **[Array][28]** the array

[1]: #foreach

[2]: #parameters

[3]: #examples

[4]: #publish

[5]: #parameters-1

[6]: #examples-1

[7]: #reduce

[8]: #parameters-2

[9]: #examples-2

[10]: #run

[11]: #parameters-3

[12]: #examples-3

[13]: #runawait

[14]: #parameters-4

[15]: #examples-4

[16]: #toarray

[17]: #parameters-5

[18]: #examples-5

[19]: #semaphore

[20]: #parameters-6

[21]: #available

[22]: #acquiresync

[23]: #acquire

[24]: #release

[25]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function

[26]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/undefined

[27]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object

[28]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array

[29]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number

[30]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean

[31]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise
