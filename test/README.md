# Testing

Ordinarily, I'd keep tests fully decoupled. For example, transforms_test.js would only import and use ../src/transforms.js.
Doing so promotes good design by keeping code decoupled.

However, in this case it just creates more work, so I use ../src/chainable.js throughout for testing, which fully
tests chainable (which is dynamically created from the underlying code), as well as the underlying code. It also makes
the tests much easier to read.
