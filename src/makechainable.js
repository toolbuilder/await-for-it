/**
 * @template [F=any]
 * @typedef {F extends (...args: [...infer Args, any]) => any ? Args : any[]} OmitLastParam
 */

/**
 * @template [I=any]
 * @typedef {I extends AsyncIterable<infer U> ? Awaited<U> : I extends Iterable<infer U> ? Awaited<U> : any} IterableElement
 */

/**
 * @template {Record<string, (...args: any[]) => any>} [Tr=Record<string, (...args: any[]) => any>]
 * @template {Record<string, (...args: any[]) => any>} [R=Record<string, (...args: any[]) => any>]
 * @template [T=any]
 * @template {keyof Tr} [K=keyof Tr]
 * @typedef {K extends 'arrayToObject' ? (propertyNames: Iterable<PropertyKey>) => CustomChainableIterable<Tr, R, Record<PropertyKey, any>>
 *   : K extends 'callAwait' | 'callNoAwait' ? (fn: (item: T) => any) => CustomChainableIterable<Tr, R, T>
 *   : K extends 'chunk' ? (n: number, timeout: number) => CustomChainableIterable<Tr, R, T[]>
 *   : K extends 'diff' ? <U = any>(fn: (previous: T, current: T) => U) => CustomChainableIterable<Tr, R, Awaited<U>>
 *   : K extends 'filter' ? { <S extends T>(fn: (item: T) => item is S): CustomChainableIterable<Tr, R, S>; (fn: (item: T) => any): CustomChainableIterable<Tr, R, T> }
 *   : K extends 'reject' ? (fn: (item: T) => any) => CustomChainableIterable<Tr, R, T>
 *   : K extends 'flatten' | 'flattenRecursive' ? () => CustomChainableIterable<Tr, R, any>
 *   : K extends 'flattenUnordered' ? (maxPoolSize: number) => CustomChainableIterable<Tr, R, any>
 *   : K extends 'map' ? <U = any>(fn: (item: T) => U) => CustomChainableIterable<Tr, R, Awaited<U>>
 *   : K extends 'mapWith' ? <U = any>(generatorFunction: (iterable: AsyncIterable<T> | Iterable<T>) => AsyncIterable<U> | Iterable<U>) => CustomChainableIterable<Tr, R, Awaited<U>>
 *   : K extends 'nth' ? (index: number) => CustomChainableIterable<Tr, R, T extends readonly (infer U)[] ? Awaited<U> : any>
 *   : K extends 'pluck' ? <P extends keyof T>(propertyName: P) => CustomChainableIterable<Tr, R, Awaited<T[P]>>
 *   : K extends 'pool' ? (maxPoolSize: number) => CustomChainableIterable<Tr, R, T extends (...args: any[]) => infer U ? Awaited<U> : Awaited<T>>
 *   : K extends 'take' ? (n: number) => CustomChainableIterable<Tr, R, T>
 *   : K extends 'throttle' ? (period: number, initialWait: number) => CustomChainableIterable<Tr, R, T>
 *   : (...args: OmitLastParam<Tr[K]>) => CustomChainableIterable<Tr, R, IterableElement<ReturnType<Tr[K]>>>} TransformMethod
 */

/**
 * @template [T=any]
 * @template {Record<string, (...args: any[]) => any>} [R=Record<string, (...args: any[]) => any>]
 * @template {keyof R} [K=keyof R]
 * @typedef {K extends 'forEach' ? (fn: (item: T, index: number) => any) => Promise<void>
 *   : K extends 'publish' ? () => import('./reducers.js').PublishController<T>
 *   : K extends 'reduce' ? <U = any>(fn: (accumulator: U extends never[] ? any[] : Awaited<U>, item: T, index: number) => (U extends never[] ? any[] : Awaited<U>) | PromiseLike<U extends never[] ? any[] : Awaited<U>>, accumulator: U) => Promise<U extends never[] ? any[] : Awaited<U>>
 *   : K extends 'run' ? () => import('./reducers.js').RunController
 *   : K extends 'runAwait' ? () => Promise<void>
 *   : K extends 'toArray' ? () => Promise<Awaited<T>[]>
 *   : (...args: OmitLastParam<R[K]>) => ReturnType<R[K]>} ReducerMethod
 */

/**
 * @template {Record<string, (...args: any[]) => any>} [G=Record<string, (...args: any[]) => any>]
 * @template {Record<string, (...args: any[]) => any>} [Tr=Record<string, (...args: any[]) => any>]
 * @template {Record<string, (...args: any[]) => any>} [R=Record<string, (...args: any[]) => any>]
 * @template {keyof G} [K=keyof G]
 * @typedef {K extends 'from' ? <T = any>(iterable: AsyncIterable<T> | Iterable<T>) => CustomChainableIterable<Tr, R, Awaited<T>>
 *   : K extends 'merge' ? <T extends (Iterable<any> | AsyncIterable<any>)[]>(...iterables: T) => CustomChainableIterable<Tr, R, T extends [] ? any : IterableElement<T[number]>>
 *   : K extends 'range' ? { (): CustomChainableIterable<Tr, R, number>; (stop: number | undefined): CustomChainableIterable<Tr, R, number>; (start: number | undefined, stop: number | undefined, step?: number): CustomChainableIterable<Tr, R, number>; (start?: number, stop?: number, step?: number): CustomChainableIterable<Tr, R, number> }
 *   : K extends 'zip' ? <T extends (Iterable<any> | AsyncIterable<any>)[]>(...iterables: T) => CustomChainableIterable<Tr, R, import('./zip.js').ZipTuple<T>>
 *   : K extends 'zipAll' ? <T extends (Iterable<any> | AsyncIterable<any>)[]>(...iterables: T) => CustomChainableIterable<Tr, R, import('./zip.js').ZipAllTuple<T>>
 *   : (...args: Parameters<G[K]>) => CustomChainableIterable<Tr, R, IterableElement<ReturnType<G[K]>>>} GeneratorMethod
 */

/**
 * @template {Record<string, (...args: any[]) => any>} [Tr=Record<string, (...args: any[]) => any>]
 * @template {Record<string, (...args: any[]) => any>} [R=Record<string, (...args: any[]) => any>]
 * @template [T=any]
 * @typedef {AsyncIterable<T> & {
 *   iterable: AsyncIterable<T> | Iterable<T>;
 *   catch: (fn: (error: any) => any) => CustomChainableIterable<Tr, R, T>;
 *   finally: (fn: () => any) => CustomChainableIterable<Tr, R, T>;
 * } & {
 *   [K in keyof Tr]: TransformMethod<Tr, R, T, K>;
 * } & {
 *   [K in keyof R]: ReducerMethod<T, R, K>;
 * }} CustomChainableIterable
 */

/**
 * @template {Record<string, (...args: any[]) => any>} [G=Record<string, (...args: any[]) => any>]
 * @template {Record<string, (...args: any[]) => any>} [Tr=Record<string, (...args: any[]) => any>]
 * @template {Record<string, (...args: any[]) => any>} [R=Record<string, (...args: any[]) => any>]
 * @typedef {(new <T = any>(iterable: AsyncIterable<T> | Iterable<T>) => CustomChainableIterable<Tr, R, Awaited<T>>) & {
 *   [K in keyof G]: GeneratorMethod<G, Tr, R, K>;
 * }} CustomChainableClass
 */

/**
 * @template {Record<string, (...args: any[]) => any>} [G=Record<string, (...args: any[]) => any>]
 * @template {Record<string, (...args: any[]) => any>} [Tr=Record<string, (...args: any[]) => any>]
 * @template {Record<string, (...args: any[]) => any>} [R=Record<string, (...args: any[]) => any>]
 * @typedef {(<T = any>(iterable: AsyncIterable<T> | Iterable<T>) => CustomChainableIterable<Tr, R, Awaited<T>>) & {
 *   [K in keyof G]: GeneratorMethod<G, Tr, R, K>;
 * }} CustomChainableFactory
 */

import { makeFactory } from '@toolbuilder/make-factory'
import { isAsyncIterable, isFunction, isSyncIterable } from './is.js'

/**
 * Dynamically create a ChainableClass. This differs from makeChainableFactory only in that the class can't be
 * called as a function.
 *
 * @type {<G extends Record<string, (...args: any[]) => any> = Record<string, (...args: any[]) => any>, Tr extends Record<string, (...args: any[]) => any> = Record<string, (...args: any[]) => any>, R extends Record<string, (...args: any[]) => any> = Record<string, (...args: any[]) => any>>(generators: G, transforms: Tr, reducers: R) => CustomChainableClass<G, Tr, R>}
 * @param {Object} generators - Each key is the name of a generator, the value is a generator function.
 * @param {Object} transforms - Each key is the name of a transform, the value is a generator function that takes
 * an iterable as the last argument.
 * @param {Object} reducers - Each key is the name of a reducer, the value is a function that takes the iterable
 * to reduce as the last argument.
 * @returns {any} - chainable class
 */
export const makeChainableClass = (generators, transforms, reducers) => {
  // construct chainable iterable class using class semantics
  // then add methods using the classic prototype assignment technique
  const Chainable = class {
    constructor (iterable) {
      if (!(isAsyncIterable(iterable) || isSyncIterable(iterable))) {
        throw new TypeError(`Chainable parameter 'iterable' must be iterable: ${iterable}`)
      }
      this.iterable = iterable
    }

    catch (fn) {
      if (!isFunction(fn)) {
        throw new TypeError(`catch parameter 'fn' must be a function: ${fn}`)
      }
      const catcher = async function * (iterable) {
        try { yield * iterable } catch (error) { fn(error) }
      }
      this.iterable = catcher(this.iterable)
      return this
    }

    finally (fn) {
      if (!isFunction(fn)) {
        throw new TypeError(`finally parameter 'fn' must be a function: ${fn}`)
      }
      const doFinally = async function * (fn, iterable) {
        try { yield * iterable } finally { fn() }
      }
      this.iterable = doFinally(fn, this.iterable)
      return this
    }

    async * [Symbol.asyncIterator] () {
      yield * this.iterable
    }
  }

  // Dynamically add static Generator methods to Chainable
  for (const methodName in generators) {
    Chainable[methodName] = function (...args) {
      const iterable = generators[methodName](...args)
      return new Chainable(iterable)
    }
  }

  // Dynamically add Transform methods to Chainable
  for (const methodName in transforms) {
    Chainable.prototype[methodName] = function (...args) {
      this.iterable = transforms[methodName](...args, this.iterable)
      return this
    }
  }

  // Dynamically add Reducer methods to Chainable
  for (const methodName in reducers) {
    Chainable.prototype[methodName] = function (...args) {
      return reducers[methodName](...args, this.iterable)
    }
  }
  return /** @type {any} */ (Chainable)
}

/**
 * Dynamically create a ChainableIterable class/function.
 *
 * @type {<G extends Record<string, (...args: any[]) => any> = Record<string, (...args: any[]) => any>, Tr extends Record<string, (...args: any[]) => any> = Record<string, (...args: any[]) => any>, R extends Record<string, (...args: any[]) => any> = Record<string, (...args: any[]) => any>>(generators: G, transforms: Tr, reducers: R) => CustomChainableFactory<G, Tr, R>}
 * @param {Object} generators - Each key is the name of a generator, the value is a generator function.
 * @param {Object} transforms - Each key is the name of a transform, the value is a generator function that takes
 * the iterable to transform as the last argument.
 * @param {Object} reducers - Each key is the name of a reducer, the value is a function that takes the iterable to
 * reduce as the last argument.
 * @returns {any} - Chainable class factory, with static methods
 */
export const makeChainableFactory = (generators, transforms, reducers) => {
  const ChainableClass = makeChainableClass(generators, transforms, reducers)
  return /** @type {any} */ (makeFactory(ChainableClass))
}
