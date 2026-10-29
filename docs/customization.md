# Customization

There are three main levels of customization for `await-for-it`:

* **Ad-hoc Customization**: Use your own generator iterables with [chainable](./chainable.md) and transform streams with [mapWith](./transforms.md#mapwith).
* **Subclassing [ChainableClass](./ChainableClass.md)**: Extend `ChainableClass` to add methods with full TypeScript type safety, and optionally wrap your class with [makeFactory](https://github.com/toolbuilder/make-factory).
* **Custom Composition with [makeChainableFactory](./makechainable.md)**: Dynamically compose custom generator, transform, and reducer methods into a tailored chainable factory or class.

## Table of Contents

* [Basic Customization](#basic-customization)
* [Subclassing ChainableClass](#subclassing-chainableclass)
* [Composing with makeChainableFactory](#composing-with-makechainablefactory)
  * [Why Not Tree-Shaking?](#why-not-tree-shaking)
  * [Imports](#imports)
  * [Generators](#generators)
  * [Transform Functions](#transform-functions)
  * [Reducer Functions](#reducer-functions)
  * [Putting It Together](#putting-it-together)
  * [TypeScript Considerations](#typescript-considerations)
* [Building from a Minimal Base Class](#building-from-a-minimal-base-class)

## Basic Customization

The simplest way to customize your pipeline is to pass your own iterables into existing `await-for-it` methods.

### Generator Iterables

If you have a generator function that yields a sequence of data, call it to obtain an iterable and pass that iterable to the [chainable](./chainable.md) factory function:

```javascript
import { chainable } from '@toolbuilder/await-for-it'

// This generator can be async (e.g. 'async function *') or sync
const simpleRange = function * (length) {
  for (let i = 0; i < length; i++) {
    yield i
  }
}

// Pass the iterable returned by simpleRange(5)
const a = await chainable(simpleRange(5)).toArray()
console.log(a) // prints [0, 1, 2, 3, 4]
```

> **Note:** The `chainable` factory expects an iterable instance (sync or async), not the uninvoked generator function itself.

### Custom Transforms with `mapWith`

If you have a transform generator that accepts an input iterable and returns a transformed iterable, use [mapWith](./transforms.md#mapwith). You can pass anything that is iterable (async or synchronous):

```javascript
import { chainable } from '@toolbuilder/await-for-it'

const squareTransform = async function * (iterable) {
  for await (const x of iterable) {
    yield x * x
  }
}

const a = await chainable([0, 1, 2, 3]).mapWith(squareTransform).toArray()
console.log(a) // prints [0, 1, 4, 9]
```

## Subclassing ChainableClass

If you want to add reusable instance methods while preserving all existing `await-for-it` methods, subclass [ChainableClass](./ChainableClass.md) directly.

This is the **recommended approach for TypeScript users**, because standard ES class inheritance preserves full static type checking, generic type inference, and autocomplete without the dynamic reflection issues of `makeChainableFactory`.

```javascript
import { ChainableClass, makeFactory } from '@toolbuilder/await-for-it'

class ExtendedChainable extends ChainableClass {
  double () {
    return this.map(x => x * 2)
  }
}

// Optionally wrap with makeFactory so consumers can call it without 'new'
const chainable = makeFactory(ExtendedChainable)

const result = await chainable([1, 2, 3]).double().toArray()
console.log(result) // prints [2, 4, 6]
```

## Composing with makeChainableFactory

The [makeChainableFactory](./makechainable.md#makechainablefactory) function dynamically constructs a chainable factory with static generator methods and chainable prototype methods.

Use `makeChainableFactory` when you want to build a customized, fluent API—for example, exposing a curated subset of methods for an application or mixing domain-specific transforms directly into the fluent chain.

### Why Not Tree-Shaking?

You might wonder whether `makeChainableFactory` can be used to "tree-shake" unused methods from your client bundle. In practice, modern JavaScript bundlers (such as Rollup, esbuild, or Webpack) cannot tree-shake dynamically composed classes:

1. **Dynamic prototype mutation:** Bundlers rely on static ES module `import`/`export` syntax to identify unused code. `makeChainableFactory` assigns methods to prototypes at runtime inside `for...in` loops (`Chainable.prototype[methodName] = ...`). Bundlers cannot statically analyze which properties are accessed on instances.
2. **Namespace imports:** Spreading module namespace objects (e.g. `{ ...generators }` or `{ ...transforms }`) statically references every exported function in those modules, preventing bundlers from eliminating any of them.

If your primary goal is minimizing bundle size, prefer importing and calling individual functional utilities directly:

```javascript
import { map } from '@toolbuilder/await-for-it/src/transforms.js'
import { toArray } from '@toolbuilder/await-for-it/src/reducers.js'

const result = await toArray(map(x => x * 2, [1, 2, 3]))
```

Use `makeChainableFactory` for API ergonomics and custom composition, not as a tree-shaking mechanism.

### Imports

Import `makeChainableFactory` along with the functional modules: [generators](generators.md), [transforms](transforms.md), and [reducers](reducers.md):

```javascript
import { makeChainableFactory, generators, transforms, reducers } from '@toolbuilder/await-for-it'
```

### Generators

Each generator function in the `generators` object becomes a **static factory method** on your custom chainable class/factory.

* Your generator functions may accept any arguments and return an async or sync iterable.
* All existing transforms and reducers in `await-for-it` support either async or sync iterables.
* If your generator needs to convert an arbitrary iterable to an iterator, use [iteratorFrom](./iteratorfrom.md), which supports both sync and async iterables.

```javascript
const simpleRange = async function * (length) {
  for (let i = 0; i < length; i++) {
    yield i
  }
}
```

### Transform Functions

Transform functions become chainable instance methods on the class.

* Transform functions can accept any number of parameters, but the **last parameter is always the iterable to transform**.
* When invoked as a chainable method on an instance, the trailing iterable parameter is omitted because the chain provides it automatically.
* Transforms should always accept either synchronous or asynchronous iterables.
* Transforms do not have to be generator functions; any function returning an iterable (or async iterable) works.

```javascript
// A transform returning an async iterable object
const multiply = (n, iterable) => {
  return {
    async * [Symbol.asyncIterator] () {
      for await (const x of iterable) {
        yield n * x
      }
    }
  }
}

// A transform implemented using an existing functional API method
const byTwo = function (iterable) {
  return transforms.map(x => 2 * x, iterable)
}
```

### Reducer Functions

Reducer functions become non-chainable, terminal instance methods on the class.

* Like transforms, the **last parameter must be the iterable to reduce**.
* Reducers typically consume the iterable and return a Promise or scalar value.

```javascript
const toSet = async function (iterable) {
  const set = new Set()
  for await (const value of iterable) {
    set.add(value)
  }
  return set
}
```

### Putting It Together

The `makeChainableFactory` function takes three arguments: `generators`, `transforms`, and `reducers`. Any of these can be empty objects (`{}`).

```javascript
import { makeChainableFactory, generators, transforms, reducers } from '@toolbuilder/await-for-it'

// Add custom methods alongside built-in ones
const customSequences = { ...generators, simpleRange }
const customTransforms = { ...transforms, multiply, byTwo }
const customReducers = { ...reducers, toSet }

const customChainable = makeChainableFactory(customSequences, customTransforms, customReducers)

// Use static generator methods
const set1 = await customChainable.simpleRange(3).multiply(2).toSet()
console.log(set1) // Set(3) { 0, 2, 4 }

// Call the factory directly with an existing iterable
const set2 = await customChainable([0, 1, 2]).multiply(2).toSet()
console.log(set2) // Set(3) { 0, 2, 4 }
```

If you prefer constructing instances with `new CustomClass(iterable)` rather than a factory function, use [makeChainableClass](./makechainable.md#makechainableclass) instead:

```javascript
import { makeChainableClass } from '@toolbuilder/await-for-it'

const CustomChainableClass = makeChainableClass(customSequences, customTransforms, customReducers)
const instance = new CustomChainableClass([0, 1, 2])
```

### TypeScript Considerations

`await-for-it` includes TypeScript declaration types for `makeChainableFactory` and `makeChainableClass`, but there are key limitations to be aware of when using them in TypeScript:

1. **Generic Type Erasure on Custom Transforms:**
   Built-in methods (`map`, `filter`, `chunk`, `pool`, `pluck`, etc.) have explicit conditional type mappings in `makechainable.js`. However, arbitrary custom transform functions fall through to a generic fallback type:
   `(...args: OmitLastParam<Tr[K]>) => CustomChainableIterable<Tr, R, IterableElement<ReturnType<Tr[K]>>>`
   Because TypeScript evaluates `ReturnType<Tr[K]>` without inferring generic type arguments from the calling instance, generic transform functions (e.g. `<T>(iterable: AsyncIterable<T>) => AsyncGenerator<T>`) lose their generic type parameter `T`, causing the stream element type to degrade to `unknown` or `any`.

2. **Loss of Item Type in Custom Reducers:**
   Similarly, custom generic reducers (e.g. `<T>(iterable: AsyncIterable<T>) => Promise<Set<T>>`) lose connection to the stream's item type `T`, resolving to e.g. `Promise<Set<unknown>>`.

3. **Loss of Overloads and Type Guards:**
   Custom methods with multiple function overloads or type predicate return types (e.g. `item is S`) cannot preserve those signatures across the dynamic mapped type.

> [!TIP]
> **TypeScript Recommendation:** If you are writing TypeScript and need custom chainable methods with strong typing, autocompletion, and generic type flow, **[subclass ChainableClass](#subclassing-chainableclass)** instead of using `makeChainableFactory`.

## Building from a Minimal Base Class

If you call [makeChainableClass](./makechainable.md#makechainableclass) with empty objects, it returns a minimal chainable class containing only:

* `this.iterable`
* `catch(fn)` error handling
* `finally(fn)` cleanup handler
* `[Symbol.asyncIterator]()`

```javascript
import { makeChainableClass, makeFactory } from '@toolbuilder/await-for-it'

// Minimal base class with only catch, finally, and async iteration
const MinimalChainable = makeChainableClass({}, {}, {})

class CustomPipeline extends MinimalChainable {
  async toArray () {
    const items = []
    for await (const item of this) {
      items.push(item)
    }
    return items
  }
}

const customFactory = makeFactory(CustomPipeline)
const result = await customFactory([1, 2, 3]).toArray()
console.log(result) // prints [1, 2, 3]
```
