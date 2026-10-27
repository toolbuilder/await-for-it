# Type Guards and Iteration Predicates

Utility functions for testing iterables, callable functions, strings, and flatten eligibility.

- [isAsyncIterable](#isasynciterable)
- [isSyncIterable](#issynciterable)
- [isFunction](#isfunction)
- [isString](#isstring)
- [shouldIterate](#shoulditerate)

## isAsyncIterable

Test whether a value supports asynchronous iteration (`typeof item?.[Symbol.asyncIterator] === 'function'`). Acts as a TypeScript type guard (`item is AsyncIterable<T>`).

- `item` **any** value to test

Returns **boolean** `true` if `item` implements `[Symbol.asyncIterator]`.

```javascript
import { isAsyncIterable, chainable } from '@toolbuilder/await-for-it'

isAsyncIterable(chainable([1, 2, 3])) // true
isAsyncIterable([1, 2, 3]) // false
```

## isSyncIterable

Test whether a value supports synchronous iteration (`typeof item?.[Symbol.iterator] === 'function'`), including primitive strings. Acts as a TypeScript type guard (`item is Iterable<T>`).

- `item` **any** value to test

Returns **boolean** `true` if `item` implements `[Symbol.iterator]`.

```javascript
import { isSyncIterable } from '@toolbuilder/await-for-it'

isSyncIterable([1, 2, 3]) // true
isSyncIterable('') // true
isSyncIterable(42) // false
```

## isFunction

Test whether a value is a callable function, **excluding ES6 `class` constructors** (which require `new`). Recognizes regular functions, arrow functions, `async` functions, sync/async generator functions, and built-in functions. Acts as a TypeScript type guard (`object is (...args: any[]) => any`).

- `object` **any** value to test

Returns **boolean** `true` if `object` is a callable non-class function.

```javascript
import { isFunction } from '@toolbuilder/await-for-it'

class Example {}

isFunction(() => 42) // true
isFunction(async () => 42) // true
isFunction(Example) // false
```

## isString

Test whether a value is a primitive `string` or a boxed `String` object. Safe across realms (`vm` contexts, iframes) and resistant to `Symbol.toStringTag` spoofing. Acts as a TypeScript type guard (`item is string | String`).

- `item` **any** value to test

Returns **boolean** `true` if `item` is a string.

```javascript
import { isString } from '@toolbuilder/await-for-it'

isString('hello') // true
isString(Object('hello')) // true
isString({ [Symbol.toStringTag]: 'String' }) // false
```

## shouldIterate

Determines whether a value should be flattened by [`flatten`](./transforms.md#flatten), [`flattenRecursive`](./transforms.md#flattenrecursive), and [`flattenUnordered`](./transforms.md#flattenunordered).

Returns `true` for synchronous or asynchronous iterable objects, **excluding** primitive values (such as strings) and built-in value or dictionary types that implement iteration (`TypedArray`, Node `Buffer`, `Map`, `URLSearchParams`, `Headers`, and `FormData`).

Any object can explicitly opt in or opt out of flattening by setting `[Symbol.isConcatSpreadable]` to `true` or `false`.

- `value` **any** value to test

Returns **boolean** `true` if `value` should be flattened.

```javascript
import { shouldIterate } from '@toolbuilder/await-for-it'

shouldIterate([1, 2, 3]) // true
shouldIterate(new Set([1, 2])) // true
shouldIterate('hello') // false
shouldIterate(new Uint8Array([1, 2])) // false
shouldIterate(new Map([['a', 1]])) // false

const mapWithSpread = new Map([['a', 1]])
mapWithSpread[Symbol.isConcatSpreadable] = true
shouldIterate(mapWithSpread) // true
```

