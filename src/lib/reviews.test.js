import assert from 'node:assert/strict'
import test from 'node:test'
import { nextReviewIndex } from './reviews.js'

test('advances through review cards and wraps at either end', () => {
  assert.equal(nextReviewIndex(0, 1, 3), 1)
  assert.equal(nextReviewIndex(2, 1, 3), 0)
  assert.equal(nextReviewIndex(0, -1, 3), 2)
})

test('keeps the active review at the first card when there is one or fewer', () => {
  assert.equal(nextReviewIndex(0, 1, 1), 0)
  assert.equal(nextReviewIndex(0, -1, 0), 0)
})
