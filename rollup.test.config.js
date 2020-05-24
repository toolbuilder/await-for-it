import createTestPackageJson from 'rollup-plugin-create-test-package-json'
import relativeToPackage from 'rollup-plugin-relative-to-package'
import multiInput from 'rollup-plugin-multi-input'

export default [
  {
    input: ['test/**/*_test.js'],
    preserveModules: true,
    output: {
      format: 'es',
      dir: 'temp'
    },
    plugins: [
      multiInput(),
      relativeToPackage({
        modulePaths: 'src/**/*.js'
      }),
      createTestPackageJson({
        testPackageJson: {
          scripts: {
            test: 'tape -r esm test/*_test.js'
          },
          devDependencies: {
            esm: '^3.2.25',
            tape: '^4.13.2'
          }
        }
      })
    ]
  }
]
