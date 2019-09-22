# Async Iterables and Helpers

## TODO

Check out this fork of emittery which links event handling to async stream: <https://github.com/lorenzofox3/emittery>

<https://nolanlawson.com/2019/08/11/high-performance-input-handling-on-the-web/>

Promise callback is also called a `microtask`. Microtasks execute immediately after any synchronous execution is complete. There’s no chance to fit in any work between the two. So if you think you can break up a long-running task by separating it into microtasks, then it won’t do what you think it’s doing. <https://nolanlawson.com/2018/09/01/a-tour-of-javascript-timers-on-the-web/>

## Note

If both Node and the bundler use `package.json` "module", then the package has to be isomorhic without a build step. The
bundler can define a variable that would otherwise be undefined, and do 'tree shaking'. I think that variable would commonly
be `process.browser`. This is undefined for Node.

## Use Cases

### Event Handlers

If you want an event to trigger an asynchronous process, you could use a Promise chain to handle events. However, if you want to handle the events in order, or want to throttle events, an iterable chain is helpful.

Event Handler -> Queue -> further async processing

### Task Execution

Pool: primary use case is that you want to execute a number of promise chains, but you want to limit the number running at
any given time, or you want to handle the resolved values as a stream of data.

Chunk: you want to group values or promise resolutions for processing as a group, like a single batch HTTP PUT of multiple values. Also, if you don't want a particular value to sit around too long, the timeout lets you ensure liveness.

Queue: you want to process values from some other source, like an event handler, in an async stream of data.

You want to restructure promise chains to async streams. Should show how this looks. Especially since a Promise has
to catch errors or the whole chain blows up. Use async functions. What about a 'transaction'? The async functions handle
the if/then dynamic length issues that require recursion in promise chains. Does chainable notation really help? Or is it
just different.

Promise result to iterable: Promise.then(result => queue.push(result))
Query parameters to iterable: queue.push(queryData)
Periodic execution to iterable: poll(asyncFunction, 1000)
Task pool: pool(n, asyncIterable)
Throttling: throttle(asyncIterable, wait)
