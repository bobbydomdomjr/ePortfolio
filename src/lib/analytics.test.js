import assert from 'node:assert/strict'
import test from 'node:test'
import { trackPortfolioEvent } from './analytics.js'

test('portfolio interactions are queued for Vercel Web Analytics', () => {
  const previousWindow = globalThis.window
  const events = []
  globalThis.window = {
    va(...event) {
      events.push(event)
    },
  }

  try {
    trackPortfolioEvent('Project opened', { category: 'Web' })
    assert.equal(events.length, 1)
    assert.equal(events[0][0], 'event')
    assert.equal(events[0][1].name, 'Project opened')
    assert.deepEqual(events[0][1].data, { category: 'Web' })
  } finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
})
