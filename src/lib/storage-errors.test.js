import assert from 'node:assert/strict'
import test from 'node:test'
import { describeImageUploadError } from './storage-errors.js'

test('explains when the portfolio image bucket is missing', () => {
  assert.match(
    describeImageUploadError({ message: 'Bucket not found', statusCode: '404' }),
    /run the portfolio image Storage migration/i,
  )
})

test('explains storage permission and role failures', () => {
  assert.match(
    describeImageUploadError({ message: 'new row violates row-level security policy', statusCode: '403' }),
    /sign out and back in/i,
  )
})

test('reports upload format and file size failures', () => {
  assert.match(describeImageUploadError({ message: 'Invalid content type' }), /JPG, PNG, WebP, or GIF/)
  assert.match(describeImageUploadError({ message: 'Payload too large' }), /no larger than 5 MB/)
})

test('preserves unexpected Supabase upload errors for diagnosis', () => {
  assert.equal(
    describeImageUploadError({ message: 'Storage unavailable', statusCode: '503' }),
    'Image upload failed (503): Storage unavailable',
  )
})
