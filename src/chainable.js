/**
 * Methods for transforming and reducing a chainable async sequence.
 *
 * @template [T=any]
 * @typedef {object} ChainableMethods
 * @property {AsyncIterable<T> | Iterable<T>} iterable The underlying iterable.
 * @property {(fn: (error: any) => any) => ChainableIterable<T>} catch Catches errors thrown during iteration.
 * @property {(fn: () => any) => ChainableIterable<T>} finally Executes fn when iteration completes.
 * @property {(propertyNames: Iterable<PropertyKey>) => ChainableIterable<Record<string, any>>} arrayToObject Converts sequence of arrays to sequence of objects by assigning property names.
 * @property {(fn: (item: T) => any) => ChainableIterable<T>} callAwait Executes fn(item) and awaits its result before yielding item.
 * @property {(fn: (item: T) => any) => ChainableIterable<T>} callNoAwait Executes fn(item) without awaiting its result before yielding item.
 * @property {(n: number, timeout: number) => ChainableIterable<T[]>} chunk Chunks every n items (or on timeout) into an array in output sequence.
 * @property {<R = any>(fn: (previous: T, current: T) => R) => ChainableIterable<Awaited<R>>} diff Executes fn(previous, current) and yields the result for each adjacent pair.
 * @property {(fn: (item: T) => any) => ChainableIterable<T>} filter Keeps item from sequence when fn(item) returns truthy.
 * @property {() => ChainableIterable<any>} flatten Flattens sequence one level deep (does not flatten strings, TypedArrays/Buffers, Maps, etc.).
 * @property {() => ChainableIterable<any>} flattenRecursive Recursively flattens sequence (does not flatten strings, TypedArrays/Buffers, Maps, etc.).
 * @property {(maxPoolSize: number) => ChainableIterable<any>} flattenUnordered Flattens up to maxPoolSize iterables concurrently (does not flatten strings, TypedArrays/Buffers, Maps, etc.).
 * @property {<R = any>(fn: (item: T) => R) => ChainableIterable<Awaited<R>>} map Generates each output value using provided function fn(item).
 * @property {<R = any>(generatorFunction: (iterable: AsyncIterable<T> | Iterable<T>) => AsyncIterable<R> | Iterable<R>) => ChainableIterable<Awaited<R>>} mapWith Maps sequence using an arbitrary generator function that takes an iterable.
 * @property {(index: number) => ChainableIterable<T extends readonly (infer U)[] ? Awaited<U> : any>} nth Outputs the nth element of each array in the sequence.
 * @property {<K extends keyof T>(propertyName: K) => ChainableIterable<Awaited<T[K]>>} pluck Yields specified property from each object in sequence.
 * @property {(maxPoolSize: number) => ChainableIterable<T extends (...args: any[]) => infer R ? Awaited<R> : Awaited<T>>} pool Executes up to maxPoolSize functions/promises concurrently and yields results as they resolve.
 * @property {(fn: (item: T) => any) => ChainableIterable<T>} reject Removes elements when fn(item) returns truthy.
 * @property {(n: number) => ChainableIterable<T>} take Returns the first n elements of sequence.
 * @property {(period: number, initialWait: number) => ChainableIterable<T>} throttle Throttles sequence to a maximum iteration speed.
 * @property {(fn: (item: T, index: number) => any) => Promise<void>} forEach Executes fn(item, index) for each item in sequence.
 * @property {() => import('./reducers.js').PublishController<T>} publish Publishes values from sequence to subscribing functions.
 * @property {<R = any>(fn: (accumulator: R extends never[] ? any[] : Awaited<R>, item: T, index: number) => (R extends never[] ? any[] : Awaited<R>) | PromiseLike<R extends never[] ? any[] : Awaited<R>>, accumulator: R) => Promise<R extends never[] ? any[] : Awaited<R>>} reduce Executes reducer function on each element, resulting in a single value.
 * @property {() => import('./reducers.js').RunController} run Starts iterating sequence asynchronously and returns a controller.
 * @property {() => Promise<void>} runAwait Iterates over sequence asynchronously until completion.
 * @property {() => Promise<T[]>} toArray Converts sequence to an Array.
 */

/**
 * An async iterable object with chainable transformation and reduction methods.
 *
 * @template [T=any]
 * @typedef {AsyncIterable<T> & ChainableMethods<T>} ChainableIterable
 */

/**
 * Static generator methods for creating ChainableIterables.
 *
 * @typedef {object} ChainableStatic
 * @property {<T = any>(iterable: AsyncIterable<T> | Iterable<T>) => ChainableIterable<Awaited<T>>} from Creates a ChainableIterable sequence from the input iterable.
 * @property {<T extends (Iterable<any> | AsyncIterable<any>)[]>(...iterables: T) => ChainableIterable<T extends [] ? any : T[number] extends Iterable<infer U> | AsyncIterable<infer U> ? Awaited<U> : any>} merge Merges one or more sync or async iterables concurrently.
 * @property {(...args: (number | undefined)[]) => ChainableIterable<number>} range Creates a sequence of numbers (start, stop, step) matching Python range.
 * @property {(...iterables: (Iterable<any> | AsyncIterable<any>)[]) => ChainableIterable<any[]>} zip Creates a sequence of arrays the length of the shortest iterable.
 * @property {(...iterables: (Iterable<any> | AsyncIterable<any>)[]) => ChainableIterable<any[]>} zipAll Creates a sequence of arrays the length of the longest iterable.
 */

/**
 * Constructor for creating ChainableIterable instances, with static generator methods.
 *
 * @typedef {(new <T = any>(iterable?: AsyncIterable<T> | Iterable<T>) => ChainableIterable<Awaited<T>>) & ChainableStatic} ChainableClassConstructor
 */

/**
 * Factory function and constructor for creating ChainableIterable instances, equipped with static generator methods.
 * Can be called as a function `chainable(iterable)` or with `new chainable(iterable)`.
 *
 * @typedef {(<T = any>(iterable?: AsyncIterable<T> | Iterable<T>) => ChainableIterable<Awaited<T>>) & ChainableClassConstructor} ChainableFactory
 */

import { makeFactory } from '@toolbuilder/make-factory'
import { makeChainableClass } from './makechainable.js'
import * as generators from './generators.js'
import * as transforms from './transforms.js'
import * as reducers from './reducers.js'

/**
 * Class constructor for ChainableIterable instances with static generator methods.
 *
 * @type {ChainableClassConstructor}
 */
const ChainableClass = /** @type {any} */ (makeChainableClass(generators, transforms, reducers))

/**
 * Chainable factory function and constructor for creating ChainableIterable instances,
 * equipped with static generator methods.
 *
 * @type {ChainableFactory}
 */
const chainable = /** @type {any} */ (makeFactory(ChainableClass))

export {
  chainable,
  ChainableClass
}
