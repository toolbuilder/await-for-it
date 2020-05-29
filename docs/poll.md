# Poll

Periodically calls a function and provides the resolved values as an iterator. Polling will happen no faster than the specified period. If the downstream iterable is processing slowly, the backpressure will slow the polling calls. In fact polling can stop completely if the downstream iterable stops. Poll is a class, because it provides functionality to stop polling from **outside** the class.

## Constructor

-   `fn` **([Function][10] | AsyncFunction)** synchronous or async function that takes no parameters
-   `period` **[Number][11]** call fn every period milliseconds
-   `initialWait` **[Number][11]** make first function call immediately if zero, otherwise wait
    `initialWait` millisceonds before making first call. Defaults to zero. (optional, default `0`)

## done

Stops polling

## Example

```javascript
import { chainable, Poll }  from '@toolbuilder/await-for-it'

// create a data source - could be events or whatever
// Polling will happen no faster than every 1000ms, but
// backpressure from the iterator can slow or stop polling.
let count = 0
const poll = new Poll(async () => count++, 1000)

await chainable(poll)
    .take(5) // stop polling after 5 numbers
    .finally(() => console.log('done'))
    .runAwait() // start the polling process
// After the await, Poll is now stopped because take stopped iterating
// after 5 values. Backpressure has stopped polling in this case.

// Although backpressure has stopped iteration, the poll iterable is not done,
// and finally won't be called unless you do this at some point - probably in
// response to an event...
  poll.done()
```

[10]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function

[11]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number

[12]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise
