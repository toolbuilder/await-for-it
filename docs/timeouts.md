# Timeouts

Some basic Promise based timeout methods. In particular, I couldn't find a package that lets the timeout method itself choose whether to resolve or reject.

-   [callWithTimeout][1]
-   [wait][3]
-   [waitToCall][5]

## callWithTimeout

Create a Promise that calls a timeoutFunction if the promiseFunction does not resolve before
timeoutDuration milliseconds. The promiseFunction is always called, so the timeout cannot stop it.

If the timeoutFunction resolves or rejects first, the promiseFunction resolution will be lost. If
the results are important to you, you'll need to provide access another way.

The timeoutFunction will only be called if the promiseFunction does not resolve before the timeout.

-   `timeoutDuration` **[Number][7]** milliseconds to wait before calling timeoutFunction
-   `promiseFunction` **[Function][8]** normal promise function with resolve, reject as parameters
-   `timeoutFunction` **[Function][8]** normal promise function with resolve, reject as parameters,
    called only if promise times out.

## wait

Create a promise that resolves after `ms` milliseconds.

-   `ms` **[Number][7]** the minimum number of milliseconds to wait before resolving.

## waitToCall

Wait before calling a function and returning the resolved value.

-   `ms` **[Number][7]** milliseconds to wait before calling function 'fn'
-   `fn` **(AsyncFunction | [Function][8])** function to call

Returns **[Promise][9]** that resolves to the return value of fn, or the value it resolves
to if fn is async.

[1]: #callwithtimeout

[2]: #parameters

[3]: #wait

[4]: #parameters-1

[5]: #waittocall

[6]: #parameters-2

[7]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number

[8]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function

[9]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise
