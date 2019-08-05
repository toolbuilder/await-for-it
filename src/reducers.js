export const reduce = async (fn, accumulator, asyncIterable) => {
  for await (const value of asyncIterable) {
    accumulator = fn(accumulator, value)
  }
  return accumulator
}

export const toArray = async (asyncIterable) => {
  return reduce((a, v) => { a.push(v); return a }, [], asyncIterable)
}

export const forEach = async (fn, asyncIterable) => {
  for await (const value of asyncIterable) {
    await fn(value)
  }
}
