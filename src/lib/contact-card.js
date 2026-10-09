function escapeVCard(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

export function createContactCard(profile) {
  const fields = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escapeVCard(profile.name)}`,
    `TITLE:${escapeVCard(profile.role)}`,
    `EMAIL;TYPE=INTERNET:${escapeVCard(profile.email)}`,
  ]
  if (profile.phone) fields.push(`TEL;TYPE=CELL:${escapeVCard(profile.phone)}`)
  if (profile.location) fields.push(`ADR;TYPE=WORK:;;${escapeVCard(profile.location)};;;;`)
  if (isHttpsUrl(profile.website)) fields.push(`URL:${escapeVCard(profile.website)}`)
  fields.push('END:VCARD')
  return `${fields.join('\r\n')}\r\n`
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}
