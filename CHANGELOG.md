# Changelog

All notable changes to this project will be documented in this file. See [Conventional Commits](https://www.conventionalcommits.org/) for commit guidelines.

## v2.0.0

[compare changes](https://github.com/toolbuilder/await-for-it/compare/v1.4.0...v2.0.0)

### 🚀 Enhancements

- ⚠️  Centralize shouldIterate and support Symbol.isConcatSpreadable ([5733203](https://github.com/toolbuilder/await-for-it/commit/5733203))
- **generators:** ⚠️  Align range with Python semantics and fix generator docs ([bbfb0f2](https://github.com/toolbuilder/await-for-it/commit/bbfb0f2))
- **reducers:** Enhance controllers, error handling, validation, and docs ([7a8921a](https://github.com/toolbuilder/await-for-it/commit/7a8921a))
- Add eager fail-fast parameter validation and fix take(0) ([ba705ae](https://github.com/toolbuilder/await-for-it/commit/ba705ae))
- Add subpath exports, bundle docs and examples, and add llms.txt ([b2137a5](https://github.com/toolbuilder/await-for-it/commit/b2137a5))

### 🩹 Fixes

- Support empty string and falsy values in isSyncIterable ([45b6a22](https://github.com/toolbuilder/await-for-it/commit/45b6a22))
- Exclude ES6 classes from isFunction ([3396a9e](https://github.com/toolbuilder/await-for-it/commit/3396a9e))
- Make isString cross-realm safe and spoof-proof ([4f1af7d](https://github.com/toolbuilder/await-for-it/commit/4f1af7d))
- Validate maxPoolSize in flattenUnordered and expand test coverage ([279986b](https://github.com/toolbuilder/await-for-it/commit/279986b))
- Implement early termination iterator cleanup in flattenUnordered ([9d626bd](https://github.com/toolbuilder/await-for-it/commit/9d626bd))
- Resolve stalls, timer leaks, parameter validation, and cleanup in chunk ([1324980](https://github.com/toolbuilder/await-for-it/commit/1324980))
- Implement iterator cleanup, error handling, and unhandled rejection protection in merge ([1a3bb96](https://github.com/toolbuilder/await-for-it/commit/1a3bb96))
- Enhance Poll with parameter validation, abortable sleep, detached callback, and fail-fast semantics ([a8198b9](https://github.com/toolbuilder/await-for-it/commit/a8198b9))
- Enhance Queue with reject waking, parameter validation, typing, and doc fixes ([b82e4ec](https://github.com/toolbuilder/await-for-it/commit/b82e4ec))
- Enhance zip and zipAll with iterator cleanup, error handling, protocol compliance, and doc fixes ([4cfc7bb](https://github.com/toolbuilder/await-for-it/commit/4cfc7bb))
- **chainable:** Refine factory/static types, restore filter/reject truthiness, and update docs ([2b0a3c2](https://github.com/toolbuilder/await-for-it/commit/2b0a3c2))
- ⚠️  Refine entry-point types, prefer asyncIterator in iteratorFrom, fix timeouts, and update docs ([2d67df7](https://github.com/toolbuilder/await-for-it/commit/2d67df7))
- Revert default Queue buffer to Array instead of null ([9d4bd49](https://github.com/toolbuilder/await-for-it/commit/9d4bd49))

### 💅 Refactors

- ⚠️  Modernize to pure ESM, migrate to node:test, and prune devDependencies ([017e1f5](https://github.com/toolbuilder/await-for-it/commit/017e1f5))

### 📖 Documentation

- Add example with node streams, and test case ([f6fb58c](https://github.com/toolbuilder/await-for-it/commit/f6fb58c))
- Migrate markdown examples to executable scripts in examples directory ([a978ecf](https://github.com/toolbuilder/await-for-it/commit/a978ecf))
- Clarify take early termination and update polling example state ([e032804](https://github.com/toolbuilder/await-for-it/commit/e032804))
- Extract poll examples into standalone executable scripts ([b16e7d2](https://github.com/toolbuilder/await-for-it/commit/b16e7d2))
- Extract pool example to executable script demonstrating function-wrapped promises ([181e0db](https://github.com/toolbuilder/await-for-it/commit/181e0db))
- Extract queue example into standalone scripts demonstrating buffer safety and rejection ([67d97ff](https://github.com/toolbuilder/await-for-it/commit/67d97ff))
- Add flattenUnordered examples demonstrating Symbol.isConcatSpreadable and exception handling ([7840bcd](https://github.com/toolbuilder/await-for-it/commit/7840bcd))
- Update 2.0.0 breaking changes in README and chunk documentation ([96be5c6](https://github.com/toolbuilder/await-for-it/commit/96be5c6))
- Revise customization guide for accuracy, Rollup tree-shaking, and TypeScript ([fc7c9ae](https://github.com/toolbuilder/await-for-it/commit/fc7c9ae))
- Rewrite README for clarity and update package description ([6079e0b](https://github.com/toolbuilder/await-for-it/commit/6079e0b))
- Add flattenUnordered task tracking and error recovery example with mapWith ([03736fb](https://github.com/toolbuilder/await-for-it/commit/03736fb))
- Revise makechainable documentation for clarity, completeness, and accuracy ([101cbaf](https://github.com/toolbuilder/await-for-it/commit/101cbaf))
- Clarify backpressure concept, refine documentation errata, and add prepack build automation ([2b992b3](https://github.com/toolbuilder/await-for-it/commit/2b992b3))

### 📦 Build

- **types:** Clean stale declarations before check:types and build ([c60ed2b](https://github.com/toolbuilder/await-for-it/commit/c60ed2b))

### 🏡 Chore

- Remove unused test files ([1718045](https://github.com/toolbuilder/await-for-it/commit/1718045))

### ✅ Tests

- Add unit tests for isAsyncIterable ([b7e200b](https://github.com/toolbuilder/await-for-it/commit/b7e200b))
- Harden toofast test helper and expand concurrent next coverage ([2487e55](https://github.com/toolbuilder/await-for-it/commit/2487e55))

#### ⚠️ Breaking Changes

- ⚠️  Centralize shouldIterate and support Symbol.isConcatSpreadable ([5733203](https://github.com/toolbuilder/await-for-it/commit/5733203))
- **generators:** ⚠️  Align range with Python semantics and fix generator docs ([bbfb0f2](https://github.com/toolbuilder/await-for-it/commit/bbfb0f2))
- ⚠️  Refine entry-point types, prefer asyncIterator in iteratorFrom, fix timeouts, and update docs ([2d67df7](https://github.com/toolbuilder/await-for-it/commit/2d67df7))
- ⚠️  Modernize to pure ESM, migrate to node:test, and prune devDependencies ([017e1f5](https://github.com/toolbuilder/await-for-it/commit/017e1f5))

### ❤️ Contributors

- Toolbuilder <k_d_hudson@yahoo.com>

## [1.4.0](https://github.com/toolbuilder/await-for-it/compare/v1.3.1...v1.4.0) (2024-11-10)


### Features

* filter and reject can now use async functions ([7d41335](https://github.com/toolbuilder/await-for-it/commit/7d413356a4355ec27fbe881e7d7c1b5526c95fcc))


### Bug Fixes

* cleanup package.json exports from resolving Node.js deprecation warning [DEP0148] ([abf921d](https://github.com/toolbuilder/await-for-it/commit/abf921d9861c40bb4e0d884cf36e805c0488daaf))

### [1.3.1](https://github.com/toolbuilder/await-for-it/compare/v1.3.0...v1.3.1) (2021-12-23)


### Bug Fixes

* resolved Node.js deprecation warning [DEP0148] Use of deprecated folder mapping ./src/ ([d76a1f3](https://github.com/toolbuilder/await-for-it/commit/d76a1f35d6702b28d295125a3eab875fa84d5ab0))

## [1.3.0](https://github.com/toolbuilder/await-for-it/compare/v1.2.0...v1.3.0) (2021-12-01)


### Features

* added Python like range generator ([9759b51](https://github.com/toolbuilder/await-for-it/commit/9759b516b09edb019bbfde4b9006eeccff39b1f5))

## [1.2.0](https://github.com/toolbuilder/await-for-it/compare/v1.1.0...v1.2.0) (2021-07-24)


### Features

* dual package - ES module with CommonJS support ([3b7305e](https://github.com/toolbuilder/await-for-it/commit/3b7305e7ae2c7f44295fe27c421916f012576ec8))

## 1.1.0 (2021-07-05)


### Features

* added flattenUnordered transform ([0130bf2](https://github.com/toolbuilder/await-for-it/commit/0130bf2e59ec86c04b4c22a72120477a5c5d90eb))

### [1.0.0](https://github.com/toolbuilder/await-for-it/tree/1.0.0) (2020-06-05)

### Bug Fixes

* Queue broken when iterator.next() called without waiting for previous call to resolve ([c57d395](https://github.com/toolbuilder/await-for-it/commit/c57d395))


### BREAKING CHANGES

* Queue no longer throws QueueFull, ctor no longer accepts Number ([ef3724e](https://github.com/toolbuilder/await-for-it/commit/ef3724e))
  * See the updated [docs](docs/queue.md).
  * `Queue` no longer throws `QueueFull` when the buffer reaches capacity. That's properly the buffer's job.
  * `Queue` constructor no longer accepts a `Number` to specify buffer capacity. The constructor only accepts a buffer.
  * `Queue` the default buffer is an empty `Array` although that is probably not what you want.
  * `Queue` no longer provides a `capacity` property since Arrays don't have one.

* Moved Semaphore and Mutex to @toolbuilder/semaphore package ([adf700a](https://github.com/toolbuilder/await-for-it/commit/adf700a))
  * `RingBuffer` is no longer exported by `Await-For-It`. It is now [here](https://github.com/toolbuilder/ring-buffer).
  * `Semaphore` and `Mutex` are no longer exported by `Await-For-It`. If you really need them they are [here](https://github.com/toolbuilder/semaphore).
