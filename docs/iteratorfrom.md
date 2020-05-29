## iteratorFrom

Returns an iterator given any iterable.

-   `iterable` **(AsyncIterable | Iterable)** the iterable to get an iterator from.


```javascript
import { iteratorFrom } from '@toolbuilder/await-for-it'

// Here's an example that exists only because a bundler was
// removing the empty loop version. That bug has been fixed btw.
const iterator = iteratorFrom(iterable)
let { done } = await iterator.next()
while (!done) {
  ({ done } = await iterator.next())
}
```
