# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

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
