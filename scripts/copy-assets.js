import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const source = resolve('assets', 'img')
const destination = resolve('public', 'assets', 'img')

if (!existsSync(source)) {
  throw new Error(`Portfolio image directory not found: ${source}`)
}

mkdirSync(destination, { recursive: true })
cpSync(source, destination, { recursive: true, force: true })
