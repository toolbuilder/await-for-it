import fs from 'fs'
import MultiStream from 'multistream'

const inputStreams = process.argv.slice(2).map(filename => fs.createReadStream(filename))
new MultiStream(inputStreams).pipe(process.stdout)
