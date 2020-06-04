import resolve from '@rollup/plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'

const name = 'awaitforit'
const input = 'src/await-for-it.js'
const format = 'umd'
const sourcemap = true

export default [
  {
    input,
    output: {
      file: `umd/${name}.js`,
      sourcemap,
      format,
      name
    },
    plugins: [
      resolve({
        mainFields: ['module'],
        modulesOnly: true
      })
    ]
  },
  {
    input,
    output: {
      file: `umd/${name}.min.js`,
      sourcemap,
      format,
      name
    },
    plugins: [
      resolve({
        mainFields: ['module'],
        modulesOnly: true
      }),
      terser()
    ]
  }
]
