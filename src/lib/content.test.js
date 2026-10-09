import assert from 'node:assert/strict'
import test from 'node:test'
import { reactive } from 'vue'
import { defaultContent } from '../content.js'
import { cloneContent } from './content.js'
import { validateContent } from './content-validation.js'

test('clones and validates a Vue-reactive portfolio draft', () => {
  const draft = reactive(structuredClone(defaultContent))
  draft.testimonials.push({
    name: 'Jordan Lee',
    role: 'Project lead',
    organization: 'Example organization',
    project: 'Internal dashboard',
    quote: 'Clear communication and thoughtful delivery.',
  })

  const clonedContent = cloneContent(draft)
  assert.notEqual(clonedContent, draft)
  assert.deepEqual(clonedContent.testimonials[0], draft.testimonials[0])
  assert.equal(validateContent(clonedContent).testimonials.length, 1)
})
