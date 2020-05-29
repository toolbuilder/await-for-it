# merge

Merge the output of one or more async (or sync) iterables into a single async iterable. Each
async iterable is advanced as fast as possible, so that slow iterators do not hold
up faster ones. Equal speed iterables are advanced at roughly the same pace.

Backpressure is provided by the iterating code. Iteration can be stopped by stopping
the iterating code.

-   `iterables` **...(AsyncIterable | Iterable)**

Returns **AsyncGenerator** merged iterables as async iterable

```javascript
import { chainable } from '@toolbuilder/await-for-it'
import { someSlowIterable } from 'your-code'

const initialValues = [0, 1, 2]

chainable.merge(initialValues, someSlowIterable).callAwait(async value => doSomething(value)).run()
// In this case, because initialValues is synchronous, merge will fly through those first.
// If both itereables are async, then the results will probably be interleaved.
```
