# Make Chainable

Use the two methods here to build your own custom chainable async iterables. See [customization](./customization.md) for a walkthrough.

The file 'src/chainable.js' shows how this package uses these methods to create [ChainableClass](./ChainableClass.md) and [chainable](./chainable.md) from the functional API.

-   [makeChainableClass][1]
-   [makeChainableFactory][3]

## makeChainableClass

Dynamically create a ChainableClass. This differs from makeChainableFactory only in that the class can't be
called as a function.

### Parameters

-   `generators` **[Object][5]** Each key is the name of a generator, the value is a generator function.
-   `transforms` **[Object][5]** Each key is the name of a transform, the value is a generator function that takes
    an iterable as the last argument.
-   `reducers` **[Object][5]** Each key is the name of a reducer, the value is a function that takes the iterable
    to reduce as the last argument.

Returns **Class** chainable class. In addition to the transforms you provide, `catch` and `finally` are added.

## makeChainableFactory

Dynamically create a ChainableIterable class/function.

### Parameters

-   `generators` **[Object][5]** Each key is the name of a generator, the value is a generator function.
-   `transforms` **[Object][5]** Each key is the name of a transform, the value is a generator function that takes
    the iterable to transform as the last argument.
-   `reducers` **[Object][5]** Each key is the name of a reducer, the value is a function that takes the iterable to
    reduce as the last argument.

Returns **[Function][6]** Chainable class factory, with static methods

[1]: #makechainableclass

[2]: #parameters

[3]: #makechainablefactory

[4]: #parameters-1

[5]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object

[6]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function
