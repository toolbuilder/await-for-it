/**
 * @template [T=any]
 * @template [ShiftReturn=any]
 * @typedef {import('./queue.js').QueueBuffer<T, ShiftReturn>} QueueBuffer
 */

/**
 * @template [T=any]
 * @typedef {import('./chainable.js').ChainableIterable<T>} ChainableIterable
 */

/**
 * @template [T=any]
 * @typedef {import('./chainable.js').ChainableMethods<T>} ChainableMethods
 */

/**
 * @typedef {import('./chainable.js').ChainableStatic} ChainableStatic
 */

/**
 * @typedef {import('./chainable.js').ChainableClassConstructor} ChainableClassConstructor
 */

/**
 * @typedef {import('./chainable.js').ChainableFactory} ChainableFactory
 */

/**
 * @template {Record<string, (...args: any[]) => any>} [Tr=Record<string, (...args: any[]) => any>]
 * @template {Record<string, (...args: any[]) => any>} [R=Record<string, (...args: any[]) => any>]
 * @template [T=any]
 * @typedef {import('./makechainable.js').CustomChainableIterable<Tr, R, T>} CustomChainableIterable
 */

/**
 * @template {Record<string, (...args: any[]) => any>} [G=Record<string, (...args: any[]) => any>]
 * @template {Record<string, (...args: any[]) => any>} [Tr=Record<string, (...args: any[]) => any>]
 * @template {Record<string, (...args: any[]) => any>} [R=Record<string, (...args: any[]) => any>]
 * @typedef {import('./makechainable.js').CustomChainableClass<G, Tr, R>} CustomChainableClass
 */

/**
 * @template {Record<string, (...args: any[]) => any>} [G=Record<string, (...args: any[]) => any>]
 * @template {Record<string, (...args: any[]) => any>} [Tr=Record<string, (...args: any[]) => any>]
 * @template {Record<string, (...args: any[]) => any>} [R=Record<string, (...args: any[]) => any>]
 * @typedef {import('./makechainable.js').CustomChainableFactory<G, Tr, R>} CustomChainableFactory
 */

/**
 * @template [T=any]
 * @typedef {import('./reducers.js').PublishController<T>} PublishController
 */

/**
 * @typedef {import('./reducers.js').RunController} RunController
 */

export { makeFactory } from '@toolbuilder/make-factory'
export { makeChainableFactory, makeChainableClass } from './makechainable.js'
export { isAsyncIterable, isSyncIterable, isFunction, isString, shouldIterate } from './is.js'
export { chainable, ChainableClass } from './chainable.js'
export { Poll } from './poll.js'
export { Queue, QueueDone, QueueFull } from './queue.js'
export { callWithTimeout, wait, waitToCall } from './timeouts.js'
export { iteratorFrom } from './iteratorfrom.js'

export * as generators from './generators.js'
export * as transforms from './transforms.js'
export * as reducers from './reducers.js'
