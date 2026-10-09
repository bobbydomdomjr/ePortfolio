import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultContent } from '../content.js'
import { validateContent } from './content-validation.js'

test('accepts the included portfolio content', () => {
  assert.equal(validateContent(defaultContent), defaultContent)
})

test('rejects missing collections', () => {
  const content = structuredClone(defaultContent)
  delete content.projects
  assert.throws(() => validateContent(content), /"projects" field must be a list/)
})

test('rejects malformed project data before it reaches the public site', () => {
  const content = structuredClone(defaultContent)
  content.projects[0] = null
  assert.throws(() => validateContent(content), /Project item 1 must be an object/)
})

test('rejects malformed tags', () => {
  const content = structuredClone(defaultContent)
  content.projects[0].tags = 'not a list'
  assert.throws(() => validateContent(content), /"tags" must be a list/)
})

test('rejects oversized portfolio documents', () => {
  const content = structuredClone(defaultContent)
  content.about = 'a'.repeat(250_001)
  assert.throws(() => validateContent(content), /smaller than 250 KB/)
})
