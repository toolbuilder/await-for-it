import { promises } from 'fs'
import { chainable } from 'iterablefu'
import { rollup } from 'rollup'

const bundleDir = 'temp/bundles/'
const srcDir = 'temp/src/'

const transformTestsToUsePackage = async () => {
  await promises.mkdir('temp', { recursive: true })
  await promises.mkdir(bundleDir, { recursive: true })
  await promises.mkdir(srcDir, { recursive: true })
  const filenames = (await promises.readdir('test/')).filter(filename => filename.endsWith('.js'))
  for (const filename of filenames) {
    const lines = (await promises.readFile('test/' + filename, 'utf-8')).split('\n') // inefficient, but easy
    const browserSource = chainable(lines)
      .map(line => {
        return line
          .replace(
            "import * as generators from '../src/generators.js'",
            "import { generators } from 'iterablefu'")
          .replace(
            "import * as transforms from '../src/transforms.js'",
            "import { transforms } from 'iterablefu'")
          .replace(
            "import * as reducers from '../src/reducers.js'",
            "import { reducers } from 'iterablefu'")
          .replace(
            "import { makeChainableIterable } from '../src/makechainable.js'",
            "import { makeChainableIterable } from 'iterablefu'")
          .replace(
            "import { chainable } from '../src/chainable.js'",
            "import { chainable } from 'asynciterablefu'")
      })
      .toArray()
      .join('\n')
    await promises.writeFile(srcDir + '/' + filename, browserSource, 'utf-8')
  }
}

const inputOptionsBase = {
  // input can also take an array of input names, or an object that provides name: inputfile pairs
  input: 'temp/src/reducers_test.js',
  external: ['iterablefu', 'zora']
}

const outputOptionsBase = {
  output: {
    file: 'temp/bundles/reducers_test.iife.js',
    // sourcemap: true,
    format: 'iife',
    name: 'reducers',
    globals: {
      iterablefu: 'iterablefu',
      zora: 'zora'
    }
  }
}

const bundleTest = async (filename) => {
  const inputOptions = {
    ...inputOptionsBase,
    input: srcDir + filename
  }
  const outputOptions = {
    ...outputOptionsBase
  }
  outputOptions.output.name = filename.replace('.js', '')
  outputOptions.output.file = bundleDir + filename

  const bundle = await rollup(inputOptions)
  await bundle.write(outputOptions)
}

const makeBundles = async () => {
  const filenames = (await promises.readdir(srcDir)).filter(filename => filename.endsWith('.js'))
  for (const filename of filenames) {
    await bundleTest(filename)
  }
}

const makeTestBundle = async () => {
  const source = []
  source.push(await promises.readFile('umd/iterablefu.umd.js', 'utf-8'))
  source.push(await promises.readFile('node_modules/zora/dist/bundle/zora.js', 'utf-8'))
  const filenames = (await promises.readdir(bundleDir)).filter(filename => filename.endsWith('.js'))
  for (const filename of filenames) {
    source.push(await promises.readFile(bundleDir + filename, 'utf-8'))
  }
  await promises.writeFile('temp/bundle.js', source.join('\n'), 'utf-8')
}

const main = async () => {
  await transformTestsToUsePackage()
  await makeBundles()
  await makeTestBundle()
}

main()
