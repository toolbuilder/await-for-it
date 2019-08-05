import { zipAll } from 'iterablefu/src/generators.js'
import { flattenRecursive as syncFlattenRecursive } from 'iterablefu/src/transforms.js'

const zipObject = (propertyNames, iterableValues) => {
  const outputObject = {}
  const pairs = zipAll(propertyNames, iterableValues)
  for (const [propertyName, value] of pairs) {
    if (propertyName === undefined) continue
    outputObject[propertyName] = value
  }
  return outputObject
}

export const arrayToObject = function (propertyNames, asyncIterable) {
  return map(iterableValues => zipObject(propertyNames, iterableValues), asyncIterable)
}

export const filter = async function * (fn, asyncIterable) {
  for await (const value of asyncIterable) {
    if (fn(value) === true) {
      yield value
    }
  }
}

// These two functions are used by flatten and flattenRecursive.
// Generally accepted method of checking if something is a string.
const isString = (item) => typeof item === 'string' || item instanceof String
// Generally accepted method of checking if something supports the Iterable protocol
const isSyncIterable = (item) => item && typeof item[Symbol.iterator] === 'function'

export const flatten = async function * (asyncIterable) {
  for await (const value of asyncIterable) {
    if (!isString(value) && isSyncIterable(value)) {
      yield * value
    } else {
      yield value
    }
  }
}

export const flattenRecursive = async function * (asyncIterable) {
  for await (const value of asyncIterable) {
    if (!isString(value) && isSyncIterable(value)) {
      yield * syncFlattenRecursive(value)
    } else {
      yield value
    }
  }
}

export const map = async function * (fn, asyncIterable) {
  for await (const value of asyncIterable) {
    yield fn(value)
  }
}

export const reject = (fn, asyncIterable) => {
  return filter(x => fn(x) !== true, asyncIterable)
}
