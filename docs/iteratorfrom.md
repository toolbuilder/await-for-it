# iteratorFrom

Returns an iterator from either an asynchronous or synchronous iterable. If an object implements both `[Symbol.asyncIterator]` and `[Symbol.iterator]`, the asynchronous iterator (`[Symbol.asyncIterator]()`) is returned, matching JavaScript's `for await...of` semantics.

- `iterable` **(AsyncIterable | Iterable)** the async or sync iterable to obtain an iterator from.
- Throws **TypeError** if `iterable` is neither an `AsyncIterable` nor an `Iterable`.
- Returns **(AsyncIterator | Iterator)** the iterator created by `iterable`.

```javascript
import { iteratorFrom } from '@toolbuilder/await-for-it'

const iterator = iteratorFrom([1, 2, 3])
let { value, done } = await iterator.next()
while (!done) {
  console.log(value)
  ;({ value, done } = await iterator.next())
}
```
