# Customization

There are several different levels of customization for `await-for-it`:

* Use the constructor function and [mapWith](./transforms.md#mapwith)
* Use the default base class and [makeChainableFactory](./makechainable.md) to add/remove chainable methods
* Subclass [ChainableClass](./chainableclass.md) and use [makeFactory](https://github.com/toolbuilder/make-factory)

## Table of Contents

* [Basic Customization](#basic-customization)
* [Add or Remove Methods](#add-or-remove-methods)
  * [Imports](#imports)
  * [Generators](#generators)
  * [Transform Functions](#transform-functions)
  * [Reducer Functions](#reducer-functions)
  * [Putting It Together](#putting-it-together)
* [Extending ChainableClass](#extending-chainable)

## Basic Customization

The simplest way to extend `Await-For-It` is to use your generators with existing `await-for-it` methods.

If you have a generator or iterable that creates a sequence of data, simply use the [chainable constructor](./chainable.md).

```javascript
import { chainable } from '@toolbuilder/await-for-it'
// This generator can be async (e.g. 'async function *') or sync
// as the situation demands.
const simpleRange = function * (length) {
  for (let i = 0; i < length; i++) {
    yield i
  }
}

const a = await chainable(simpleRange).toArray()
```

If you have a transform generator that accepts an input iterable and returns a transformed iterable, then use [mapWith](./transforms.md#mapwith). You can pass anything that is iterable: async or synchronous.

```javascript
import { chainable } from '@toolbuilder/await-for-it'

const fn = async function * (iterable) {
  for await (let x of iterable) {
    yield x * x
  }
}

const a = chainable([0, 1, 2, 3]).mapWith(fn).toArray()
console.log(a) // prints [0, 1, 4, 9]
```

## Add Or Remove Methods

Perhaps you're tree shaking and need to minimize the amount of code pulled in to your bundle. In that case, use the [makeChainableFactory](./makechainable.md) method to generate your own version of [chainable](./chainable.md). You can use your own methods and methods from `Await-For-It` with `makeChainableFactory`.


This section walks through an example that adds a few simple methods to those already provided by `Await-For-It`.
You can also reduce the number of methods the same way.

### Imports

Import `makeChainableFactory`. If you want to use other `Await-For-It` methods, import the functional versions of those too: [generators](generators.md), [transforms](transforms.md), and [reducers](reducers.md).

```javascript
import { makeChainableFactory, generators, transforms, reducers } from '@toolbuilder/await-for-it'
```

You can also import specific functions directly. However, you're taking a bit of a risk that future releases will move these functions.

```javascript
import { makeChainableFactory } from 'await-for-it/src/makechainable'
import { zip, zipAll } from 'await-for-it/src/generators'
import { pluck, nth } from 'await-for-it/src/transforms'
import { forEach } from 'await-for-it/src/reducers'
```

### Generators

Each `await-for-it` generator will appear as a static factory method on your custom class. Your generators can return anything that supports the [async iterable protocol](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/asyncIterator). The generator **can** support the [iterable protocol](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#The_iterable_protocol) only because all existing transforms and reducers support either async or sync iterables. So it really isn't a best practice to use a sync iterable.

JavaScript automatically converts sync iterables to async iterables in most cases. If your code is explicitly asking for an iterator, you will need something like [iteratorFrom](./iteratorfrom.js), which provides an iterator from either an async or a sync iterable.

Typically, you'll provide [generator functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*). However, any method that returns an iterable object will work just fine. For example, an ordinary method that returns an Array would work because Array is iterable. Your generators may take any number of parameters, and yield any sort of sequence.

```javascript
const simpleRange = async function * (length) {
  for (let i = 0; i < length; i++) {
    yield i
  }
}

// Here's what the callAwait method from 'src/transforms.js' looks like
const callAwait = async function * (fn, iterable) {
  for await (const value of iterable) {
    await fn(value)
    yield value
  }
}
```

### Transform Functions

The transform methods will become chainable methods on the chainable iterable class. These functions can return anything that supports the [async iterable protocol](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/asyncIterator).

Transform methods can have any number of parameters, but the last parameter is **always** the iteratable to transform. Transform methods should **always** accept either synchronous iterables or async iterables to transform. JavaScript automatically converts sync iterables to async iterables in most cases. If your code is explicitly asking for an iterator, you will need something like [iteratorFrom](./iteratorfrom.js), which provides an iterator from either an async or a sync iterable.

Transforms do not have to be [generator functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*). Here are two examples:

```javascript
// This transform method returns an anonymous iterable object just to show
// something different than a generator function.
// As with all transforms, the iterable to be transformed must be the last parameter.
const multiply = (n, iterable) => {
  return {
    async * [Symbol.asyncIterator] () {
      // JavaScript will automatically deal with either
      // an async or sync iterable in a for...await loop
      for await (let x of iterable) {
        yield n * x
      }
    }
  }
}

// You can implement your method using the functional API methods. Do not use 'this', because
// the generated chainable class methods have a different signature (i.e. no iterable parameter).
// In this case, because map returns an iterable object, byTwo shouldn't be a generator
// function itself (no asterisk).
const byTwo = function (iterable) {
  return transforms.map(x => 2 * x, iterable) // returning async generator
}
```

### Reducer Functions

Reducer methods become non-chainable methods on the chainable class. Reducer methods can have any number of parameters,
but the last one must be the iterable to be reduced. The return value can be anything.

```javascript
// The last parameter must be the iterable to be reduced
const toSet = async function (iterable) {
  // Can't just use Set constructor!
  // Need to handle async iterables too...
  // return new Set(iterable)
  const set = new Set()
  for await (const value of iterable) {
    set.add(value)
  }
  return set
}
```

### Putting It Together

The [makeChainableFactory](./makechainable.md#makeChainableFactory) method requires generators, transforms, and reducers. However, any
of those can be empty Objects.

- The generators will have the same method signature as the methods you provide
- The trailing iterable parameter will be removed from the method signatures of the transforms and reducers
  because the iterable is provided by the chainable class.

```javascript
import { makeChainableFactory, generators, transforms, reducers } from '@toolbuilder/await-for-it'
// add your methods to the existing ones.
// In this case, the methods are from the examples above.
const customSequences = { ...generators, simpleRange }
const customTransforms = { ...transforms, multiply, byTwo }
const customReducers = { ...reducers, toSet }

const customChainable = makeChainableFactory(customSequences, customTransforms, customReducers)

// Use your new class
const set = await customChainable.simpleRange(3).multiply(2).toSet()
const anotherSet = await customChainable([0, 1, 2]).multiply(2).toSet()
```

Since `await-for-it` exports both [chainable](chainable.md) and [ChainableIterable](ChainableIterable.md), the method `makeChainableClass` is used instead. It just adds an extra step. See 'src/chainable.js' for details.

## Extending Chainable

The `makeChainableClass` function starts with a super simple class before mixing in the generators, transducers, and reducers. Here's an excerpt.

```javascript
  class Chainable {
    constructor (iterable) {
      this.iterable = iterable
    }

    catch (fn) {
      const catcher = async function * (iterable) {
        try { yield * iterable } catch (error) { fn(error) }
      }
      this.iterable = catcher(this.iterable)
      return this
    }

    finally (fn) {
      const doFinally = async function * (fn, iterable) {
        try { yield * iterable } finally { fn() }
      }
      this.iterable = doFinally(fn, this.iterable)
      return this
    }

    async * [Symbol.asyncIterator] () {
      yield * this.iterable
    }
  }
```
If you call [makeChainableClass](./makechainable.md#makechainableclass) with empty Objects as parameters, you'll get this basic class.
You can subclass the returned class however you wish. Then if you want a static factory class do this:

```javascript
import { makeChainableClass } from '@toolbuilder/await-for-it'
import { makeFactory } from '@toolbuilder/make-factory'

// Of course, you aren't limited to empty parameter Objects
const ChainableIterable = makeChainableClass({}, {}, {})

class Extended extends ChainableIterable {
  /* your extensions here */
}

const chainable = makeFactory(Extended)
const iterable = chainable([0, 1, 3]).toArray()
```

[1]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object
