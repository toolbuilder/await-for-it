import { promises } from 'fs'
import { chainable } from 'iterablefu'
import path from 'path'
import os from 'os'
import shell from 'shelljs'

const pkgName = 'asynckronus' // pick up from package.json
const testDir = 'temp/test/'

const exec = async (cmd) => {
  return new Promise((resolve, reject) => {
    shell.exec(cmd, (code, stdout, stderr) => {
      if (code !== 0) reject(new Error(stderr))
      resolve(code)
    })
  })
}

const transformTestsToUsePackage = async () => {
  await promises.mkdir('temp', { recursive: true })
  await promises.mkdir(testDir, { recursive: true })
  const filenames = (await promises.readdir('test/')).filter(filename => filename.endsWith('_test.js'))
  for (const filename of filenames) {
    const lines = (await promises.readFile('test/' + filename, 'utf-8')).split('\n') // inefficient, but easy
    const browserSource = chainable(lines)
      .map(line => {
        return line
          .replace(
            '../src/asynckronus.js',
            'asynckronus')
      })
      .toArray()
      .join('\n')
    await promises.writeFile(testDir + '/' + filename, browserSource, 'utf-8')
  }
}

const main = async () => {
  let exitCode = 0
  const cleanupTemp = true
  const tempDir = await promises.mkdtemp(path.join(os.tmpdir(), `${pkgName}-`))
  console.log(`Testing package in ${tempDir}`)
  await transformTestsToUsePackage()
  try {
    shell.cp('scripts/package.json', `${tempDir}/package.json`)
    await promises.mkdir(`${tempDir}/test`, { recursive: true })
    shell.cp('-R', testDir, `${tempDir}`)
    await exec('npm pack', {})
    shell.mv('*.tgz', `${tempDir}/${pkgName}.tgz`)
    shell.pushd(tempDir)
    await exec('npm install')
    await exec('npm run test')
  } catch (e) {
    console.log(e)
    exitCode = 1
  } finally {
    shell.popd()
    if (cleanupTemp) shell.rm('-rf', tempDir)
  }
  process.exit(exitCode)
}

main()
