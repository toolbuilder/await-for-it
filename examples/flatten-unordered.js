import { chainable, transforms } from '@toolbuilder/await-for-it'

// ============================================================================
// flattenUnordered: Concurrency and Symbol.isConcatSpreadable
// ============================================================================
//
// `flattenUnordered` concurrently flattens nested iterables (both sync and async)
// up to `maxPoolSize` concurrent streams. Items are yielded as soon as they become
// available, so the output order is non-deterministic.
//
// Default Flattening Rules:
// - Standard iterables (Arrays, Sets, generator objects) are FLATTENED by default.
// - Primitives (strings) and built-in value/dictionary types (TypedArrays, Buffers,
//   Maps, URLSearchParams, Headers, FormData) are NOT flattened by default, even
//   though they implement Symbol.iterator.
//
// Controlling Flattening with `Symbol.isConcatSpreadable`:
// `flattenUnordered` respects JavaScript's standard `Symbol.isConcatSpreadable`
// protocol (the same symbol used by Array.prototype.concat):
//
// 1. Opting OUT: Set `item[Symbol.isConcatSpreadable] = false`
//    Prevents an otherwise spreadable iterable (like an Array or custom collection)
//    from being flattened. The item is passed through intact as a single element.
//    Common use cases:
//    - Preserving coordinate tuples [x, y] or [lat, lng].
//    - Keeping batch chunks or table rows intact.
//
// 2. Opting IN: Set `item[Symbol.isConcatSpreadable] = true`
//    Forces a non-spreadable type (such as Uint8Array, Buffer, or Map) to be
//    flattened into individual items or entries.
//    Common use cases:
//    - Unpacking binary byte streams from Uint8Array / Buffer into individual bytes.
//    - Unpacking Map instances into [key, value] entries.
// ============================================================================

// Helper to simulate an async source yielding items with a delay
const asyncSource = async function * (sourceId, items, delayMs) {
  for (const item of items) {
    await new Promise(resolve => setTimeout(resolve, delayMs))
    yield `${sourceId}:${item}`
  }
}

// ----------------------------------------------------------------------------
// Part 1: Basic Concurrent Flattening of Async Iterables
// ----------------------------------------------------------------------------
console.log('--- Part 1: Concurrent Flattening of Multiple Async Iterables ---')

// We start three async sources with different timing.
// With maxPoolSize = 3, all three run concurrently, and items are interleaved.
const fastSource = asyncSource('Fast', [1, 2, 3], 20)
const slowSource = asyncSource('Slow', ['A', 'B'], 50)
const mediumSource = asyncSource('Med', ['x', 'y'], 35)

const mixedResults = await chainable([fastSource, slowSource, mediumSource])
  .flattenUnordered(3)
  .toArray()

console.log('Yielded items in order of arrival:')
console.log(mixedResults)

// ----------------------------------------------------------------------------
// Part 2: Opting OUT of Flattening (Symbol.isConcatSpreadable = false)
// ----------------------------------------------------------------------------
console.log('\n--- Part 2: Opting OUT with Symbol.isConcatSpreadable = false ---')

// By default, JavaScript Arrays are flattened one level deep.
// If you have arrays that represent atomic units—such as coordinate pairs or
// header rows—you can opt out of flattening.

const pointA = [37.7749, -122.4194] // San Francisco
const pointB = [40.7128, -74.0060] // New York
const pointC = [51.5074, -0.1278] // London

// Opt out of flattening for point A and point B:
pointA[Symbol.isConcatSpreadable] = false
pointB[Symbol.isConcatSpreadable] = false
// pointC is left without the symbol, so it will be flattened by default.

const coordinatesInput = [
  pointA,
  pointB,
  pointC // will be unpacked into 51.5074, -0.1278
]

const coordResults = await chainable(coordinatesInput)
  .flattenUnordered(2)
  .toArray()

console.log('Result with opt-out:')
console.log('pointA preserved as single item:', coordResults.includes(pointA))
console.log('pointB preserved as single item:', coordResults.includes(pointB))
console.log('pointC flattened into numbers:', coordResults.includes(51.5074) && coordResults.includes(-0.1278))
console.log('All elements:', coordResults)

// ----------------------------------------------------------------------------
// Part 3: Opting IN to Flattening (Symbol.isConcatSpreadable = true)
// ----------------------------------------------------------------------------
console.log('\n--- Part 3: Opting IN with Symbol.isConcatSpreadable = true ---')

// By default, TypedArrays (like Uint8Array) and Maps are NOT flattened:
const normalBytes = new Uint8Array([0xAA, 0xBB])
const spreadableBytes = new Uint8Array([0x01, 0x02, 0x03])
// Opt IN: Flatten the byte array into individual numeric bytes
// @ts-ignore
spreadableBytes[Symbol.isConcatSpreadable] = true

// By default, Maps are NOT flattened:
const normalMap = new Map([['key1', 'val1'], ['key2', 'val2']])
const spreadableMap = new Map([['status', 'ready'], ['region', 'us-east']])
// Opt IN: Flatten the Map into its [key, value] entries
// @ts-ignore
spreadableMap[Symbol.isConcatSpreadable] = true

const mixedTypes = [
  normalBytes,
  spreadableBytes,
  normalMap,
  spreadableMap
]

const typeResults = await chainable(mixedTypes)
  .flattenUnordered(2)
  .toArray()

console.log('normalBytes kept as Uint8Array instance:', typeResults.includes(normalBytes))
console.log('spreadableBytes unpacked into numbers (0x01, 0x02, 0x03):', typeResults.includes(1) && typeResults.includes(2) && typeResults.includes(3))
console.log('normalMap kept as Map instance:', typeResults.includes(normalMap))
console.log('spreadableMap unpacked into entries:', typeResults.some(item => Array.isArray(item) && item[0] === 'status'))

// ----------------------------------------------------------------------------
// Part 4: Standalone Transform Function Usage
// ----------------------------------------------------------------------------
console.log('\n--- Part 4: Using transforms.flattenUnordered standalone ---')

// The same behavior is available via the standalone generator function:
const packet = new Uint8Array([10, 20])
// @ts-ignore
packet[Symbol.isConcatSpreadable] = true

const customInput = [
  ['hello', 'world'],
  packet
]

const collected = []
for await (const item of transforms.flattenUnordered(2, customInput)) {
  collected.push(item)
}

console.log('Collected via transforms.flattenUnordered:', collected)
console.log('flattenUnordered example completed.')
