const collections = ['experience', 'education', 'skills', 'projects', 'services']

function requireText(value, label) {
  if (typeof value !== 'string' || value.length > 20_000) {
    throw new Error(`${label} must be a text value no longer than 20,000 characters.`)
  }
}

function validateEntries(entries, fields, label) {
  for (const [index, entry] of entries.entries()) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`${label} item ${index + 1} must be an object.`)
    }
    for (const field of fields) requireText(entry[field], `${label} item ${index + 1} "${field}"`)
  }
}

export function validateContent(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('The portfolio must be a JSON object.')
  }
  if (JSON.stringify(value).length > 250_000) {
    throw new Error('Portfolio content must be smaller than 250 KB.')
  }
  if (!value.profile || typeof value.profile !== 'object' || Array.isArray(value.profile)) {
    throw new Error('Add a profile object before saving.')
  }
  for (const field of ['name', 'role', 'location', 'email', 'image', 'availability']) {
    requireText(value.profile[field], `Profile "${field}"`)
  }
  requireText(value.headline, 'Headline')
  requireText(value.about, 'About')

  for (const key of collections) {
    if (!Array.isArray(value[key])) throw new Error(`The "${key}" field must be a list.`)
  }

  validateEntries(value.experience, ['title', 'organization', 'period', 'description'], 'Experience')
  validateEntries(value.education, ['title', 'organization', 'period', 'description'], 'Education')
  validateEntries(value.services, ['title', 'description'], 'Service')
  validateEntries(value.projects, ['title', 'category', 'year', 'image', 'description'], 'Project')

  for (const [index, skill] of value.skills.entries()) {
    if (typeof skill === 'string') continue
    if (!skill || typeof skill !== 'object' || Array.isArray(skill)) {
      throw new Error(`Skill item ${index + 1} must be text or an object with a name.`)
    }
    requireText(skill.name, `Skill item ${index + 1} "name"`)
  }

  for (const [index, project] of value.projects.entries()) {
    if (project.tags !== undefined && (!Array.isArray(project.tags) || project.tags.some((tag) => typeof tag !== 'string'))) {
      throw new Error(`Project item ${index + 1} "tags" must be a list of text values.`)
    }
  }

  return value
}
