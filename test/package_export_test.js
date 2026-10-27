import test from 'node:test'
import assert from 'node:assert/strict'
import * as rootExports from '@toolbuilder/await-for-it'
import { chainable as subpathChainable, ChainableClass as SubpathChainableClass } from '@toolbuilder/await-for-it/src/chainable.js'
import { isAsyncIterable as subpathIsAsyncIterable, shouldIterate as subpathShouldIterate } from '@toolbuilder/await-for-it/src/is.js'
import { Queue as SubpathQueue } from '@toolbuilder/await-for-it/src/queue.js'

test('package exports: root entry point exposes all expected runtime symbols', () => {
  const expectedFunctions = [
    'makeFactory',
    'makeChainableFactory',
    'makeChainableClass',
    'isAsyncIterable',
    'isSyncIterable',
    'isFunction',
    'isString',
    'shouldIterate',
    'chainable',
    'ChainableClass',
    'Poll',
    'Queue',
    'QueueDone',
    'QueueFull',
    'callWithTimeout',
    'wait',
    'waitToCall',
    'iteratorFrom'
  ]

  for (const name of expectedFunctions) {
    assert.equal(typeof rootExports[name], 'function', `${name} is exported as a function/class`)
  }

  assert.equal(typeof rootExports.generators, 'object')
  assert.equal(typeof rootExports.transforms, 'object')
  assert.equal(typeof rootExports.reducers, 'object')
  assert.deepEqual(
    Object.keys(rootExports).sort(),
    [...expectedFunctions, 'generators', 'transforms', 'reducers'].sort(),
    'root entry point exports exact expected set of runtime bindings'
  )
})

test('package exports: subpath exports match root exports', () => {
  assert.equal(subpathChainable, rootExports.chainable)
  assert.equal(SubpathChainableClass, rootExports.ChainableClass)
  assert.equal(subpathIsAsyncIterable, rootExports.isAsyncIterable)
  assert.equal(subpathShouldIterate, rootExports.shouldIterate)
  assert.equal(SubpathQueue, rootExports.Queue)
})

test('package exports: re-exported public types resolve and typecheck', async () => {
  /** @type {import('@toolbuilder/await-for-it').QueueBuffer<number, number | undefined>} */
  const buffer = []
  const queue = new rootExports.Queue(buffer)
  queue.push(42)
  queue.done()

  /** @type {import('@toolbuilder/await-for-it').ChainableFactory} */
  const factory = rootExports.chainable
  /** @type {import('@toolbuilder/await-for-it').ChainableClassConstructor} */
  const Ctor = rootExports.ChainableClass
  /** @type {import('@toolbuilder/await-for-it').ChainableStatic} */
  const statics = rootExports.chainable

  /** @type {import('@toolbuilder/await-for-it').ChainableIterable<number>} */
  const seq = factory(queue)
  /** @type {import('@toolbuilder/await-for-it').ChainableMethods<number>} */
  const methods = new Ctor([1, 2, 3])
  assert.ok(statics.range(1) instanceof Ctor)
  assert.deepEqual(await seq.toArray(), [42])
  assert.deepEqual(await methods.toArray(), [1, 2, 3])

  const CustomClass = rootExports.makeChainableClass(
    { from: rootExports.generators.from },
    { map: rootExports.transforms.map },
    { toArray: rootExports.reducers.toArray }
  )
  const customFactory = rootExports.makeChainableFactory(
    { from: rootExports.generators.from },
    { map: rootExports.transforms.map },
    { toArray: rootExports.reducers.toArray }
  )

  /** @type {import('@toolbuilder/await-for-it').CustomChainableClass<{ from: typeof rootExports.generators.from }, { map: typeof rootExports.transforms.map }, { toArray: typeof rootExports.reducers.toArray }>} */
  const checkCustomClass = CustomClass
  /** @type {import('@toolbuilder/await-for-it').CustomChainableFactory<{ from: typeof rootExports.generators.from }, { map: typeof rootExports.transforms.map }, { toArray: typeof rootExports.reducers.toArray }>} */
  const checkCustomFactory = customFactory
  /** @type {import('@toolbuilder/await-for-it').CustomChainableIterable<{ map: typeof rootExports.transforms.map }, { toArray: typeof rootExports.reducers.toArray }, number>} */
  const checkCustomSeq = checkCustomFactory([1, 2]).map(x => x * 10)
  assert.deepEqual(await checkCustomSeq.toArray(), [10, 20])
  assert.deepEqual(await new checkCustomClass([3]).toArray(), [3])

  /** @type {import('@toolbuilder/await-for-it').RunController} */
  const runCtrl = rootExports.chainable([1]).run()
  await runCtrl.finished

  /** @type {import('@toolbuilder/await-for-it').PublishController<number>} */
  const pubCtrl = rootExports.chainable([1]).publish()
  await pubCtrl.finished

  const compileTimeChecks = () => {
    // @ts-expect-error - CustomChainableClass requires an iterable argument
    void new CustomClass()
  }
  assert.equal(typeof compileTimeChecks, 'function')
})
