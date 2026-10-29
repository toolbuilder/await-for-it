# Make Chainable

Use `makeChainableClass` and `makeChainableFactory` to compose custom chainable async iterable APIs from individual generator, transform, and reducer functions. For an in-depth walkthrough and comparison with subclassing, see [customization](./customization.md).

The file [`src/chainable.js`](../src/chainable.js) demonstrates how `await-for-it` uses `makeChainableClass` to construct [`ChainableClass`](./ChainableClass.md) and [`chainable`](./chainable.md) from its functional modules.

- [makeChainableClass](#makechainableclass)
- [makeChainableFactory](#makechainablefactory)

## makeChainableClass

Dynamically creates a custom `ChainableClass`. Instances must be created using `new CustomClass(iterable)`.

Use `makeChainableClass` when you need an ES6 class constructor—such as when subclassing, performing `instanceof` checks, or adhering to strict class instantiation semantics.

```javascript
import { makeChainableClass, generators, transforms, reducers } from '@toolbuilder/await-for-it'

const CustomClass = makeChainableClass(
  { range: generators.range },
  { map: transforms.map },
  { toArray: reducers.toArray }
)

const result = await new CustomClass([1, 2, 3]).map(x => x * 2).toArray()
console.log(result) // [2, 4, 6]
```

### Parameters

- `generators` **Object** Map of static method names to factory functions. Each function accepts any arguments and returns a sync or async iterable. The returned iterable is automatically wrapped in a new instance of the chainable class.
- `transforms` **Object** Map of chainable instance method names to transform functions. Each function takes `(...args, iterable)` where the input `iterable` is passed as the **last argument** and returns a sync or async iterable.
- `reducers` **Object** Map of terminal instance method names to reducer functions. Each function takes `(...args, iterable)` where the input `iterable` is passed as the **last argument**. The method returns whatever the reducer returns (for example, a Promise, an accumulated value, a controller object, or `undefined`). Unlike transforms, reducers return their own result rather than `this`.

> **Note:** Any of `generators`, `transforms`, or `reducers` can be an empty object (`{}`).

### Returns

**Class** An ES6 class with the following characteristics:
- **Constructor (`new CustomClass(iterable)`)**: Validates that `iterable` is a sync or async iterable (throws `TypeError` otherwise) and stores it on `this.iterable`.
- **Static methods**: Each function from `generators` is attached as a static method that returns a new class instance.
- **Instance transforms**: Methods mutate `this.iterable` in place and return `this` for fluent chaining.
- **Instance reducers**: Methods execute the reducer against `this.iterable` and return the result directly.
- **Built-in instance methods**:
  - `catch(fn)`: Catches upstream iteration errors. Throws `TypeError` if `fn` is not a function.
  - `finally(fn)`: Executes cleanup when iteration completes or terminates early. Throws `TypeError` if `fn` is not a function.
  - `[Symbol.asyncIterator]()`: Delegates iteration to `this.iterable` via `yield * this.iterable`.

## makeChainableFactory

Dynamically creates a custom chainable factory function.

`makeChainableFactory` wraps the class created by `makeChainableClass` using [`makeFactory`](https://github.com/toolbuilder/make-factory). The resulting factory can be invoked directly as a function (`customFactory(iterable)`) or with `new`, providing a more ergonomic, functional API.

```javascript
import { makeChainableFactory, generators, transforms, reducers } from '@toolbuilder/await-for-it'

const customChainable = makeChainableFactory(
  { range: generators.range },
  { map: transforms.map },
  { toArray: reducers.toArray }
)

// Call directly as a function
const a = await customChainable([1, 2, 3]).map(x => x * 10).toArray()

// Or call static generator methods
const b = await customChainable.range(1, 4).map(x => x * 10).toArray()
```

### Parameters

- `generators` **Object** Map of static method names to factory functions returning an iterable.
- `transforms` **Object** Map of chainable transform method names `(...args, iterable)`.
- `reducers` **Object** Map of terminal reducer method names `(...args, iterable)`.

### Returns

**Function** A chainable factory function equipped with static generator methods that constructs chainable iterable instances with `catch`, `finally`, `[Symbol.asyncIterator]()`, and the provided transforms and reducers.

## TypeScript Considerations

`await-for-it` includes TypeScript type definitions for `makeChainableClass` and `makeChainableFactory`. However, because TypeScript cannot infer generic parameters across dynamic runtime property assignments, custom generic transforms and reducers lose generic type propagation. 

If you require strong end-to-end static typing and generic type inference in TypeScript, consider [subclassing ChainableClass](./customization.md#subclassing-chainableclass) instead.
