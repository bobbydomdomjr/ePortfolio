import assert from 'node:assert/strict'
import test from 'node:test'
import { createContactCard } from './contact-card.js'

test('creates a vCard with available profile contact fields', () => {
  const card = createContactCard({
    name: 'Bobby Domdom Jr',
    role: 'IT Specialist',
    email: 'bobby@example.com',
    phone: '+639511033187',
    location: 'Manila, Philippines',
    website: 'https://example.com',
  })

  assert.match(card, /^BEGIN:VCARD\r\nVERSION:3\.0\r\n/)
  assert.match(card, /FN:Bobby Domdom Jr/)
  assert.match(card, /EMAIL;TYPE=INTERNET:bobby@example\.com/)
  assert.match(card, /TEL;TYPE=CELL:\+639511033187/)
  assert.match(card, /ADR;TYPE=WORK:;;Manila\\, Philippines;;;;/)
  assert.match(card, /URL:https:\/\/example\.com/)
  assert.match(card, /END:VCARD\r\n$/)
})

test('escapes vCard delimiters and line breaks in profile values', () => {
  const card = createContactCard({
    name: 'Bobby; Jr',
    role: 'Engineer, administrator\nSecond line',
    email: 'bobby@example.com',
  })

  assert.match(card, /FN:Bobby\\; Jr/)
  assert.match(card, /TITLE:Engineer\\, administrator\\nSecond line/)
  assert.doesNotMatch(card, /administrator\r?\nSecond line/)
  assert.doesNotMatch(card, /TEL;|ADR;|URL:/)
})

test('omits a contact-card URL unless it uses HTTPS', () => {
  const card = createContactCard({
    name: 'Bobby Domdom Jr',
    role: 'IT Specialist',
    email: 'bobby@example.com',
    website: 'javascript:alert(1)',
  })

  assert.doesNotMatch(card, /^URL:/m)
})
