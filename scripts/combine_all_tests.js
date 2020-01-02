import { promises } from 'fs'
import { chainable } from 'iterablefu'

const tempDir = 'temp/'
const testDir = 'test/'
const testFileEnding = '_test.js'

const main = async () => {
  await promises.mkdir('temp', { recursive: true })
  const filenames = (await promises.readdir(testDir)).filter(filename => filename.endsWith(testFileEnding))
  const testBundleSource = chainable(filenames)
    .map(filename => `import '../${testDir}${filename}'`)
    .toArray()
    .join('\n')

  await promises.writeFile(`${tempDir}all_test.js`, testBundleSource + '\n', 'utf-8')
}

main()
