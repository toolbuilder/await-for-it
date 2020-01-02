import resolve from 'rollup-plugin-node-resolve'

const format = 'umd'
const sourcemap = true

export default [
  {
    input: 'temp/all_test.js',
    output: {
      file: 'temp/all_test_umd.js',
      sourcemap,
      format,
      name: 'alltest'
    },
    plugins: [
      resolve({
        mainFields: ['module'],
        modulesOnly: true
      })
    ]
  }
]
