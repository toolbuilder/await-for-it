import { pipeline } from 'node:stream/promises'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chainable } from '@toolbuilder/await-for-it'

// Set up temporary sample files to demonstrate real stream I/O
const tempDir = await mkdtemp(join(tmpdir(), 'await-for-it-stream-'))
const logFile = join(tempDir, 'access.log')
const inputFile = join(tempDir, 'input.txt')
const outputFile = join(tempDir, 'output.txt')

try {
  await writeFile(
    logFile,
    'INFO: Server started successfully\nERROR: Connection timed out\nINFO: Retrying connection\n'
  )
  await writeFile(inputFile, 'hello world\nstreaming with chainable\n')

  // Example 1: Node streams are async iterables, so chainable wraps them directly.
  // You can wrap a stream directly, transform chunks with backpressure, and consume them:
  console.log('--- Example 1: Reading and filtering a stream ---')
  await chainable(createReadStream(logFile, { encoding: 'utf8' }))
    .filter(chunk => chunk.includes('ERROR'))
    .forEach(chunk => console.log('Found error chunk:\n' + chunk.trim()))

  // Example 2: chainable() produces an async iterable, so it integrates directly
  // with Node\'s stream.pipeline for lifecycle management, error handling, and cleanup:
  console.log('\n--- Example 2: Transforming with stream.pipeline ---')
  await pipeline(
    chainable(createReadStream(inputFile, { encoding: 'utf8' }))
      .map(chunk => chunk.toUpperCase()),
    createWriteStream(outputFile)
  )

  const result = await readFile(outputFile, 'utf8')
  console.log('Transformed stream output:\n' + result.trim())
} finally {
  await rm(tempDir, { recursive: true, force: true })
}

