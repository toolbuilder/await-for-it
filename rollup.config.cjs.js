import { isAbsolute } from 'node:path'
/**
 * Builds the CommonJS code used to support CommonJS users. Since the package is STATELESS,
 * the CommonJS code can be completely separate without creating a dual package hazard.
 * The code is not minimized to better support tooling that uses CommonJS code.
 */
export default [
  {
    input: 'src/await-for-it.js',
    external: (id) => !(id.startsWith('.') || isAbsolute(id)),
    output: {
      dir: 'cjs',
      format: 'cjs',
      preserveModules: true
    }
  }
]
