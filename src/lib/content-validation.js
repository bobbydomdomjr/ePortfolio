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
  if (value.testimonials !== undefined) {
    if (!Array.isArray(value.testimonials)) throw new Error('The "testimonials" field must be a list.')
    validateEntries(value.testimonials, ['name', 'role', 'organization', 'project', 'quote'], 'Client review')
    for (const [index, review] of value.testimonials.entries()) {
      if (review.photo !== undefined) {
        requireText(review.photo, `Client review item ${index + 1} "photo"`)
      }
      for (const field of ['name', 'quote']) {
        if (!review[field].trim()) throw new Error(`Client review item ${index + 1} "${field}" must not be empty.`)
      }
    }
  }

  for (const [index, skill] of value.skills.entries()) {
    if (typeof skill === 'string') continue
    if (!skill || typeof skill !== 'object' || Array.isArray(skill)) {
      throw new Error(`Skill item ${index + 1} must be text or an object with a name.`)
    }
    requireText(skill.name, `Skill item ${index + 1} "name"`)
    if (skill.level !== undefined && (!Number.isFinite(skill.level) || skill.level < 0 || skill.level > 100)) {
      throw new Error(`Skill item ${index + 1} "level" must be a number from 0 to 100.`)
    }
  }

  for (const [index, project] of value.projects.entries()) {
    if (project.tags !== undefined && (!Array.isArray(project.tags) || project.tags.some((tag) => typeof tag !== 'string'))) {
      throw new Error(`Project item ${index + 1} "tags" must be a list of text values.`)
    }
    if (project.caseStudy !== undefined) {
      if (!project.caseStudy || typeof project.caseStudy !== 'object' || Array.isArray(project.caseStudy)) {
        throw new Error(`Project item ${index + 1} "caseStudy" must be an object.`)
      }
      for (const field of ['challenge', 'approach', 'outcome']) {
        if (project.caseStudy[field] !== undefined) {
          requireText(project.caseStudy[field], `Project item ${index + 1} case study "${field}"`)
        }
      }
    }
  }

  return value
}
