import assert from 'node:assert/strict'
import test from 'node:test'
import contact from './contact.js'

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: '',
    ended: false,
    setHeader(name, value) {
      this.headers[name] = value
    },
    status(code) {
      this.statusCode = code
      return this
    },
    send(body) {
      this.body = body
      return this
    },
    end() {
      this.ended = true
      return this
    },
  }
}

test('contact endpoint rejects methods other than POST', async () => {
  const response = createResponse()
  await contact({ method: 'GET' }, response)
  assert.equal(response.statusCode, 405)
  assert.equal(response.headers.Allow, 'POST, OPTIONS')
})

test('contact endpoint answers preflight requests', async () => {
  const response = createResponse()
  await contact({ method: 'OPTIONS' }, response)
  assert.equal(response.statusCode, 204)
  assert.equal(response.ended, true)
})

test('contact endpoint reports missing mail configuration', async () => {
  const gmailUser = process.env.GMAIL_USER
  const gmailPassword = process.env.GMAIL_APP_PASSWORD
  delete process.env.GMAIL_USER
  delete process.env.GMAIL_APP_PASSWORD
  try {
    const response = createResponse()
    await contact({ method: 'POST', body: {} }, response)
    assert.equal(response.statusCode, 500)
    assert.match(response.body, /Mail is not configured/)
  } finally {
    if (gmailUser === undefined) delete process.env.GMAIL_USER
    else process.env.GMAIL_USER = gmailUser
    if (gmailPassword === undefined) delete process.env.GMAIL_APP_PASSWORD
    else process.env.GMAIL_APP_PASSWORD = gmailPassword
  }
})
