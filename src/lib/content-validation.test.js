import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultContent } from '../content.js'
import { validateContent } from './content-validation.js'

test('accepts the included portfolio content', () => {
  assert.equal(validateContent(defaultContent), defaultContent)
})

test('accepts client reviews and older content without a testimonials collection', () => {
  const content = structuredClone(defaultContent)
  content.testimonials = [{
    name: 'Jordan Lee',
    role: 'Project lead',
    organization: 'Example organization',
    project: 'Internal dashboard',
    quote: 'Clear communication and thoughtful delivery.',
  }]
  assert.equal(validateContent(content).testimonials[0].name, 'Jordan Lee')
  delete content.testimonials
  assert.equal(validateContent(content), content)
})

test('rejects malformed client reviews', () => {
  const content = structuredClone(defaultContent)
  content.testimonials = [{ name: 'Jordan Lee', role: '', organization: '', project: '' }]
  assert.throws(() => validateContent(content), /Client review item 1 "quote"/)
})

test('requires a client name and review quote before publishing', () => {
  const content = structuredClone(defaultContent)
  content.testimonials = [{ name: ' ', role: '', organization: '', project: '', quote: 'Thoughtful work.' }]
  assert.throws(() => validateContent(content), /"name" must not be empty/)
  content.testimonials[0].name = 'Jordan Lee'
  content.testimonials[0].quote = '  '
  assert.throws(() => validateContent(content), /"quote" must not be empty/)
})

test('accepts skill objects with proficiency levels and legacy skill strings', () => {
  const content = structuredClone(defaultContent)
  content.skills[0] = { name: 'Database administration', level: 88 }
  content.skills[1] = 'HTML & CSS'
  assert.equal(validateContent(content).skills[0].level, 88)
  assert.equal(validateContent(content).skills[1], 'HTML & CSS')
})

test('rejects invalid skill proficiency levels', () => {
  const content = structuredClone(defaultContent)
  content.skills[0].level = 101
  assert.throws(() => validateContent(content), /level.*number from 0 to 100/)
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

test('preserves optional, structured project case studies', () => {
  const content = structuredClone(defaultContent)
  content.projects[0].caseStudy = {
    challenge: 'Reduce repeated support steps.',
    approach: 'Simplify the core task flow.',
    outcome: 'A clearer prototype for user feedback.',
  }
  assert.equal(validateContent(content).projects[0].caseStudy.outcome, 'A clearer prototype for user feedback.')
})

test('rejects malformed optional case studies', () => {
  const content = structuredClone(defaultContent)
  content.projects[0].caseStudy = 'not an object'
  assert.throws(() => validateContent(content), /"caseStudy" must be an object/)
})

test('rejects oversized portfolio documents', () => {
  const content = structuredClone(defaultContent)
  content.about = 'a'.repeat(250_001)
  assert.throws(() => validateContent(content), /smaller than 250 KB/)
})
