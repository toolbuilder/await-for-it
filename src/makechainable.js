
/**
 * Dynamically create a ChainableClass. This differs from makeChainableIterator only in that the class can't be
 * called as a function.
 *
 * @param {Object} generators - Each key is the name of a generator, the value is a generator function.
 * @param {Object} transforms - Each key is the name of a transform, the value is a generator function that takes
 * an iterable as the last argument.
 * @param {Object} reducers - Each key is the name of a reducer, the value is a function that takes the iterable
 * to reduce as the last argument.
 */
export const makeChainableClass = (generators, transforms, reducers) => {
  // construct chainable iterable class using class semantics
  // then add methods using the classic prototype assignment technique
  class Chainable {
    constructor (iterable) {
      this.iterable = iterable
    }

    catch (fn) {
      const catcher = async function * (iterable) {
        try { yield * iterable } catch (error) { fn(error) }
      }
      this.iterable = catcher(this.iterable)
      return this
    }

    finally (fn) {
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

  // Dynamically add static Sequence methods to Chainable
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
  return Chainable
}

const getMethodsOf = (constructorFunction, stopAt = Object) => {
  // To make iteration consistent, first find the constructorFunction prototype
  // We'll get back to constructorFunction when we access the prototype.constructor
  const instanceMethods = []
  const staticMethods = []
  let prototype = constructorFunction.prototype // not Object.getPrototypeOf
  while (prototype && (prototype !== stopAt.prototype)) {
    const constructor = prototype.constructor
    for (const methodName of Object.getOwnPropertyNames(prototype)) {
      if (methodName === 'constructor') continue
      instanceMethods.push({ constructor, methodName })
    }
    for (const methodName of Object.getOwnPropertyNames(constructor)) {
      if (methodName === 'length') continue
      if (methodName === 'name') continue
      if (methodName === 'prototype') continue
      staticMethods.push({ constructor, methodName })
    }
    prototype = Object.getPrototypeOf(prototype)
  }
  return { instanceMethods, staticMethods }
}

export const makeFactory = (ChainableClass) => {
  const ChainableIterable = function (iterable) {
    return new ChainableClass(iterable)
  }

  getMethodsOf(ChainableClass)
    .staticMethods
    .forEach(({ constructor, methodName }) => {
    // methods are in order from subclass to superclass, so
    // if method already exists, it was created for subclass
      if (!ChainableIterable[methodName]) {
        ChainableIterable[methodName] = function (...args) {
          return constructor[methodName](...args)
        }
      }
    })
  return ChainableIterable
}

/**
 * Dynamically create a ChainableIterable class/function.
 *
 * @param {Object} generators - Each key is the name of a generator, the value is a generator function.
 * @param {Object} transforms - Each key is the name of a transform, the value is a generator function that takes
 * the iterable to transform as the last argument.
 * @param {Object} reducers - Each key is the name of a reducer, the value is a function that takes the iterable to
 * reduce as the last argument.
 */
export const makeChainableFactory = (generators, transforms, reducers) => {
  const ChainableClass = makeChainableClass(generators, transforms, reducers)
  return makeFactory(ChainableClass)
}
