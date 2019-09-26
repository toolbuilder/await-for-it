import { promises } from 'fs'
import path from 'path'
import os from 'os'
import shell from 'shelljs'

const pkgName = 'asynckronus' // pick up from package.json

const exec = async (cmd) => {
  return new Promise((resolve, reject) => {
    shell.exec(cmd, (code, stdout, stderr) => {
      if (code !== 0) reject(new Error(stderr))
      resolve(code)
    })
  })
}

const main = async () => {
  let exitCode = 0
  const cleanupTemp = true
  const tempDir = await promises.mkdtemp(path.join(os.tmpdir(), `${pkgName}-`))
  try {
    shell.cp('scripts/package.json', `${tempDir}/package.json`)
    shell.cp('-R', 'temp/src', `${tempDir}/test`) // forBrowsers.js dropped test files in test/src
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
