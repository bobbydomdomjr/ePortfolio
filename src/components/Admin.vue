<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { defaultContent } from '../content.js'
import { cloneContent } from '../lib/content.js'
import { validateContent } from '../lib/content-validation.js'
import { describeImageUploadError } from '../lib/storage-errors.js'
import { safeImage, supabase, supabaseConfigured } from '../lib/supabase.js'

const email = ref('')
const password = ref('')
const session = ref(null)
const draft = ref(prepareEditableContent(defaultContent))
const status = ref('')
const error = ref('')
const busy = ref(false)
const lastSaved = ref('')
const fileInput = ref(null)
const imageUploads = ref({})
const hasActiveImageUploads = computed(() => Object.values(imageUploads.value).some((upload) => upload.busy))
const activeEditorSection = ref('profile')
const editorSections = [
  { id: 'profile', label: 'Profile' },
  { id: 'social', label: 'Social links' },
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'services', label: 'Services' },
  { id: 'testimonials', label: 'Client reviews' },
]
let authSubscription

const draftJson = computed(() => JSON.stringify(draft.value, null, 2))
const activeSectionIndex = computed(() => editorSections.findIndex((section) => section.id === activeEditorSection.value))
const parsedDraft = computed(() => {
  try {
    return { value: validateContent(cloneContent(draft.value)), error: '' }
  } catch (parseError) {
    return { value: null, error: parseError.message }
  }
})

function prepareEditableContent(content) {
  const editableContent = structuredClone(content)
  editableContent.profile.social ||= {}
  editableContent.testimonials ||= []
  editableContent.skills = editableContent.skills.map((skill) => {
    if (typeof skill === 'string') return { name: skill, level: 75 }
    return {
      ...skill,
      name: typeof skill.name === 'string' ? skill.name : '',
      level: Number.isFinite(skill.level) ? skill.level : 75,
    }
  })
  editableContent.projects = editableContent.projects.map((project) => ({
    ...project,
    caseStudy: {
      challenge: '',
      approach: '',
      outcome: '',
      ...project.caseStudy,
    },
  }))
  return editableContent
}

function changeEditorSection(index) {
  const section = editorSections[index]
  if (section) activeEditorSection.value = section.id
}

function makeExperienceItem() {
  return { title: '', organization: '', period: '', description: '' }
}

function makeEducationItem() {
  return { title: '', organization: '', period: '', description: '' }
}

function makeSkillItem() {
  return { name: '', level: 75 }
}

function makeProjectItem() {
  return {
    id: '',
    title: '',
    category: 'Web',
    year: new Date().getFullYear(),
    image: '/assets/img/portfolio/portfolio-1.jpg',
    description: '',
    tags: [],
    caseStudy: { challenge: '', approach: '', outcome: '' },
    link: '',
  }
}

function makeServiceItem() {
  return { title: '', description: '', icon: '01' }
}

function makeTestimonialItem() {
  return { name: '', photo: '', role: '', organization: '', project: '', quote: '' }
}

function addEntry(list, factory) {
  list.push(factory())
}

function removeEntry(list, index) {
  list.splice(index, 1)
}

async function uploadImage(file, category, key, review = null) {
  if (!file) return
  const extensions = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  const extension = extensions[file.type]
  if (!extension) {
    imageUploads.value[key] = { error: 'Choose a JPG, PNG, WebP, or GIF image.' }
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    imageUploads.value[key] = { error: 'Image must be 5 MB or smaller.' }
    return
  }
  if (!session.value || !supabase) {
    imageUploads.value[key] = { error: 'Sign in as an admin before uploading images.' }
    return
  }

  imageUploads.value[key] = { busy: true, error: '' }
  try {
    const objectPath = `${session.value.user.id}/${category}/${crypto.randomUUID()}.${extension}`
    const { error: uploadError } = await supabase.storage
      .from('portfolio-images')
      .upload(objectPath, file, { cacheControl: '3600', contentType: file.type, upsert: false })
    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('portfolio-images').getPublicUrl(objectPath)
    if (category === 'profile') draft.value.profile.image = data.publicUrl
    else if (review) review.photo = data.publicUrl
    imageUploads.value[key] = { busy: false, error: '' }
    status.value = 'Image uploaded. Publish changes to show it on your portfolio.'
    error.value = ''
  } catch (uploadError) {
    imageUploads.value[key] = { busy: false, error: describeImageUploadError(uploadError) }
    console.error('Portfolio image upload failed:', uploadError)
  }
}

function handleImageUpload(event, field, key, review = null) {
  const file = event.target.files?.[0]
  event.target.value = ''
  void uploadImage(file, field === 'review' ? 'reviews' : 'profile', key, review)
}

async function signIn() {
  if (!supabase) return
  busy.value = true
  error.value = ''
  status.value = ''
  const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.value, password: password.value })
  busy.value = false
  if (authError) {
    error.value = 'Sign-in failed. Check your email and password, then try again.'
    console.error('Portfolio admin sign-in failed:', authError)
    return
  }
  await acceptSession(data.session)
}

async function acceptSession(nextSession) {
  session.value = nextSession
  if (nextSession?.user?.app_metadata?.role !== 'admin') {
    error.value = 'This account does not have portfolio admin access. Ask an existing project owner to grant the admin role in Supabase.'
    if (nextSession) await supabase.auth.signOut()
    session.value = null
    return
  }
  await loadSavedContent()
}

async function loadSavedContent() {
  busy.value = true
  error.value = ''
  const { data, error: readError } = await supabase.from('portfolio_content').select('content, updated_at').eq('id', 'main').maybeSingle()
  busy.value = false
  if (readError) {
    error.value = 'Could not load the published content. Check that the Supabase migration has been applied.'
    console.error('Could not load portfolio content in admin:', readError)
    return
  }
  if (data) {
    draft.value = prepareEditableContent(data.content)
    lastSaved.value = data.updated_at
    status.value = 'Loaded the latest published content.'
  } else {
    draft.value = prepareEditableContent(defaultContent)
    status.value = 'Starter content loaded. Publish to create the first live version.'
  }
}

async function saveContent() {
  if (!supabase || !session.value) return
  if (parsedDraft.value.error) {
    error.value = `Fix the form before saving: ${parsedDraft.value.error}`
    return
  }
  busy.value = true
  error.value = ''
  status.value = ''
  try {
    const content = validateContent(cloneContent(draft.value))
    const updatedAt = new Date().toISOString()
    const { error: saveError } = await supabase.from('portfolio_content').upsert(
      { id: 'main', content, updated_at: updatedAt },
      { onConflict: 'id' },
    )
    if (saveError) throw saveError
    lastSaved.value = updatedAt
    status.value = 'Published. Your public portfolio now shows these changes.'
  } catch (saveError) {
    error.value = saveError.message || 'Could not publish changes.'
    console.error('Portfolio content could not be published:', saveError)
  } finally {
    busy.value = false
  }
}

function exportBackup() {
  const blob = new Blob([draftJson.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'portfolio-content-backup.json'
  link.click()
  URL.revokeObjectURL(url)
}

async function importBackup(event) {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    if (file.size > 1_000_000) throw new Error('Backup file must be smaller than 1 MB.')
    const parsed = validateContent(JSON.parse(await file.text()))
    draft.value = prepareEditableContent(parsed)
    status.value = 'Backup loaded. Review the draft and publish it when ready.'
    error.value = ''
  } catch (importError) {
    error.value = importError instanceof SyntaxError ? `That file is not valid JSON: ${importError.message}` : importError.message
  }
  event.target.value = ''
}

function updateTagList(list, rawText) {
  const nextTags = rawText
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
  list.splice(0, list.length, ...nextTags)
}

async function signOut() {
  if (!supabase) return
  const { error: signOutError } = await supabase.auth.signOut()
  if (signOutError) {
    error.value = 'Could not sign out. Please try again.'
    console.error('Portfolio admin sign-out failed:', signOutError)
    return
  }
  session.value = null
  password.value = ''
  status.value = ''
}

onMounted(async () => {
  if (!supabase) return
  const { data } = await supabase.auth.getSession()
  if (data.session) await acceptSession(data.session)
  const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
    if (!nextSession) session.value = null
  })
  authSubscription = listener.subscription
})

onBeforeUnmount(() => authSubscription?.unsubscribe())
</script>

<template>
  <main class="admin-page">
    <a class="skip-link" href="#admin-main">Skip to content</a>
    <header class="admin-topbar">
      <a class="wordmark" href="/"><span class="wordmark-mark">B.</span><span>Bobby Domdom Jr<small>PORTFOLIO EDITOR</small></span></a>
      <div class="admin-top-actions">
        <a class="button button-quiet" href="/">View portfolio <span aria-hidden="true">↗</span></a>
        <button v-if="session" class="button button-outline" type="button" @click="signOut">Sign out</button>
      </div>
    </header>

    <section id="admin-main" class="admin-content">
      <template v-if="!supabaseConfigured">
        <div class="admin-card setup-card">
          <p class="eyebrow">ONE-TIME SETUP</p>
          <h1>Connect your portfolio editor.</h1>
          <p>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your local <code>.env</code> and Vercel environment settings, then redeploy.</p>
          <p>The browser key is public by design; database row-level security protects edits. Never add a Supabase service-role key to the frontend.</p>
          <a class="text-link" href="/">Return to portfolio <span aria-hidden="true">↗</span></a>
        </div>
      </template>
      <template v-else-if="!session">
        <div class="admin-card login-card">
          <p class="eyebrow">PRIVATE AREA · SUPABASE AUTH</p>
          <h1>Your portfolio,<br /><span>in your hands.</span></h1>
          <p>Sign in with the admin account created for this Supabase project. Public registration is disabled.</p>
          <form class="admin-form" @submit.prevent="signIn">
            <label>Email address<input v-model="email" type="email" autocomplete="username" required placeholder="you@example.com" /></label>
            <label>Password<input v-model="password" type="password" autocomplete="current-password" required /></label>
            <p v-if="error" class="form-feedback error" role="alert">{{ error }}</p>
            <button class="button button-primary" type="submit" :disabled="busy">{{ busy ? 'Signing in...' : 'Sign in securely' }} <span aria-hidden="true">↗</span></button>
          </form>
          <p class="admin-hint">Need access? Follow the admin-account setup steps in the project README.</p>
        </div>
      </template>
      <template v-else>
        <div class="admin-heading">
          <div>
            <p class="eyebrow"><span class="status-dot"></span> SIGNED IN AS {{ session.user.email }}</p>
            <h1>Make it <span>yours.</span></h1>
            <p>Update your portfolio content with a form, then publish the new version. The public site updates when it reloads.</p>
          </div>
          <a class="button button-quiet" href="/" target="_blank" rel="noopener noreferrer">Preview portfolio ↗</a>
        </div>

        <div class="editor-layout">
          <section class="admin-card editor-card">
            <div class="editor-toolbar">
              <div><p class="eyebrow">PORTFOLIO CONTENT</p><h2>Edit details</h2></div>
              <div class="editor-actions">
                <button class="button button-outline" type="button" @click="exportBackup">Download backup</button>
                <button class="button button-outline" type="button" @click="fileInput?.click()">Import backup</button>
                <input ref="fileInput" class="sr-only" type="file" accept="application/json,.json" @change="importBackup" />
              </div>
            </div>

            <form class="form-editor" @submit.prevent="saveContent">
              <nav class="editor-section-nav" aria-label="Portfolio editor sections">
                <button
                  v-for="(section, index) in editorSections"
                  :key="section.id"
                  class="editor-section-tab"
                  :class="{ 'is-active': activeEditorSection === section.id }"
                  type="button"
                  :id="`editor-tab-${section.id}`"
                  :aria-current="activeEditorSection === section.id ? 'step' : undefined"
                  @click="changeEditorSection(index)"
                >
                  <span>{{ String(index + 1).padStart(2, '0') }}</span>{{ section.label }}
                </button>
              </nav>
              <p class="editor-section-count">Section {{ activeSectionIndex + 1 }} of {{ editorSections.length }}</p>

              <div v-if="activeEditorSection === 'profile'" class="form-section">
                <h3>Profile</h3>
                <div class="form-grid two-up">
                  <label>Name<input v-model="draft.profile.name" type="text" /></label>
                  <label>Role<input v-model="draft.profile.role" type="text" /></label>
                  <label>Location<input v-model="draft.profile.location" type="text" /></label>
                  <label>Email<input v-model="draft.profile.email" type="email" /></label>
                  <label>Phone<input v-model="draft.profile.phone" type="tel" /></label>
                  <label>Image path<input v-model="draft.profile.image" type="text" /></label>
                  <div class="image-upload-field">
                    <span>Profile photo</span>
                    <img v-if="safeImage(draft.profile.image)" class="image-upload-preview profile-upload-preview" :src="safeImage(draft.profile.image)" alt="Profile photo preview" />
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" aria-label="Upload profile photo" @change="handleImageUpload($event, 'profile', 'profile')" />
                    <small>JPG, PNG, WebP, or GIF. Maximum 5 MB.</small>
                    <small v-if="imageUploads.profile?.busy" role="status">Uploading profile photo...</small>
                    <small v-else-if="imageUploads.profile?.error" class="image-upload-error" role="alert">{{ imageUploads.profile.error }}</small>
                  </div>
                  <label>Website URL<input v-model="draft.profile.website" type="url" /></label>
                  <label>Availability<input v-model="draft.profile.availability" type="text" /></label>
                </div>
                <label>Headline<input v-model="draft.headline" type="text" /></label>
                <label>About<textarea v-model="draft.about" rows="4" /></label>
              </div>

              <div v-if="activeEditorSection === 'social'" class="form-section">
                <h3>Social links</h3>
                <div class="form-grid two-up">
                  <label>LinkedIn<input v-model="draft.profile.social.linkedin" type="url" /></label>
                  <label>GitHub<input v-model="draft.profile.social.github" type="url" /></label>
                  <label>Instagram<input v-model="draft.profile.social.instagram" type="url" /></label>
                  <label>Facebook<input v-model="draft.profile.social.facebook" type="url" /></label>
                </div>
              </div>

              <div v-if="activeEditorSection === 'experience'" class="form-section">
                <h3>Experience</h3>
                <div v-for="(item, index) in draft.experience" :key="`experience-${index}`" class="repeat-group">
                  <div class="repeat-heading">
                    <span>Entry {{ index + 1 }}</span>
                    <button type="button" class="mini-button" @click="removeEntry(draft.experience, index)">Remove</button>
                  </div>
                  <div class="form-grid two-up">
                    <label>Title<input v-model="item.title" type="text" /></label>
                    <label>Period<input v-model="item.period" type="text" /></label>
                    <label class="full-width">Organization<input v-model="item.organization" type="text" /></label>
                    <label class="full-width">Description<textarea v-model="item.description" rows="3" /></label>
                  </div>
                </div>
                <button type="button" class="button button-outline small-button" @click="addEntry(draft.experience, makeExperienceItem)">Add experience</button>
              </div>

              <div v-if="activeEditorSection === 'education'" class="form-section">
                <h3>Education</h3>
                <div v-for="(item, index) in draft.education" :key="`education-${index}`" class="repeat-group">
                  <div class="repeat-heading">
                    <span>Entry {{ index + 1 }}</span>
                    <button type="button" class="mini-button" @click="removeEntry(draft.education, index)">Remove</button>
                  </div>
                  <div class="form-grid two-up">
                    <label>Title<input v-model="item.title" type="text" /></label>
                    <label>Period<input v-model="item.period" type="text" /></label>
                    <label class="full-width">Organization<input v-model="item.organization" type="text" /></label>
                    <label class="full-width">Description<textarea v-model="item.description" rows="3" /></label>
                  </div>
                </div>
                <button type="button" class="button button-outline small-button" @click="addEntry(draft.education, makeEducationItem)">Add education</button>
              </div>

              <div v-if="activeEditorSection === 'skills'" class="form-section">
                <h3>Skills</h3>
                <div v-for="(skill, index) in draft.skills" :key="`skill-${index}`" class="repeat-inline-group skill-editor-row">
                  <label>Skill name<input v-model="skill.name" type="text" placeholder="Skill name" /></label>
                  <label>Proficiency (0–100)<input v-model.number="skill.level" type="number" min="0" max="100" /></label>
                  <button type="button" class="mini-button" @click="removeEntry(draft.skills, index)">Remove</button>
                </div>
                <button type="button" class="button button-outline small-button" @click="addEntry(draft.skills, makeSkillItem)">Add skill</button>
              </div>

              <div v-if="activeEditorSection === 'projects'" class="form-section">
                <h3>Projects</h3>
                <div v-for="(item, index) in draft.projects" :key="`project-${index}`" class="repeat-group project-group">
                  <div class="repeat-heading">
                    <span>Project {{ index + 1 }}</span>
                    <button type="button" class="mini-button" @click="removeEntry(draft.projects, index)">Remove</button>
                  </div>
                  <div class="form-grid two-up">
                    <label>Title<input v-model="item.title" type="text" /></label>
                    <label>Category<input v-model="item.category" type="text" /></label>
                    <label>Year<input v-model="item.year" type="text" /></label>
                    <label>Image path<input v-model="item.image" type="text" /></label>
                    <label class="full-width">Description<textarea v-model="item.description" rows="3" /></label>
                    <label class="full-width">Tags<input :value="(item.tags || []).join(', ')" @input="updateTagList(item.tags || [], $event.target.value)" type="text" /></label>
                    <label class="full-width">Project link<input v-model="item.link" type="url" /></label>
                  </div>
                  <div class="case-study-block">
                    <h4>Case study</h4>
                    <div class="form-grid three-up">
                      <label>Challenge<textarea v-model="item.caseStudy.challenge" rows="2" /></label>
                      <label>Approach<textarea v-model="item.caseStudy.approach" rows="2" /></label>
                      <label>Outcome<textarea v-model="item.caseStudy.outcome" rows="2" /></label>
                    </div>
                  </div>
                </div>
                <button type="button" class="button button-outline small-button" @click="addEntry(draft.projects, makeProjectItem)">Add project</button>
              </div>

              <div v-if="activeEditorSection === 'services'" class="form-section">
                <h3>Services</h3>
                <div v-for="(item, index) in draft.services" :key="`service-${index}`" class="repeat-group">
                  <div class="repeat-heading">
                    <span>Service {{ index + 1 }}</span>
                    <button type="button" class="mini-button" @click="removeEntry(draft.services, index)">Remove</button>
                  </div>
                  <div class="form-grid two-up">
                    <label>Title<input v-model="item.title" type="text" /></label>
                    <label>Icon<input v-model="item.icon" type="text" /></label>
                    <label class="full-width">Description<textarea v-model="item.description" rows="3" /></label>
                  </div>
                </div>
                <button type="button" class="button button-outline small-button" @click="addEntry(draft.services, makeServiceItem)">Add service</button>
              </div>

              <div v-if="activeEditorSection === 'testimonials'" class="form-section">
                <h3>Client reviews</h3>
                <p class="section-help">Only publish feedback and client photos you have permission to share. Upload review photos here; publish your changes after uploading.</p>
                <p v-if="draft.testimonials.length === 0" class="section-empty-state">No client reviews added yet. You can add reviews here whenever you receive permission to share them.</p>
                <div v-for="(item, index) in draft.testimonials" :key="`testimonial-${index}`" class="repeat-group">
                  <div class="repeat-heading">
                    <span>Review {{ index + 1 }}</span>
                    <button type="button" class="mini-button" @click="removeEntry(draft.testimonials, index)">Remove</button>
                  </div>
                  <div class="form-grid two-up">
                    <label>Client name<input v-model="item.name" type="text" autocomplete="name" /></label>
                    <label>Client photo path<input v-model="item.photo" type="text" placeholder="/assets/img/reviews/client-name.jpg" /></label>
                    <div class="image-upload-field">
                      <span>Upload client photo</span>
                      <img v-if="safeImage(item.photo)" class="image-upload-preview" :src="safeImage(item.photo)" :alt="`Photo preview for ${item.name || `review ${index + 1}`}`" />
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" :aria-label="`Upload photo for review ${index + 1}`" @change="handleImageUpload($event, 'review', `review-${index}`, item)" />
                      <small>JPG, PNG, WebP, or GIF. Maximum 5 MB.</small>
                      <small v-if="imageUploads[`review-${index}`]?.busy" role="status">Uploading client photo...</small>
                      <small v-else-if="imageUploads[`review-${index}`]?.error" class="image-upload-error" role="alert">{{ imageUploads[`review-${index}`].error }}</small>
                    </div>
                    <label>Role<input v-model="item.role" type="text" /></label>
                    <label>Organization<input v-model="item.organization" type="text" /></label>
                    <label>Project or context<input v-model="item.project" type="text" /></label>
                    <label class="full-width">Client review<textarea v-model="item.quote" rows="4" /></label>
                  </div>
                </div>
                <button type="button" class="button button-outline small-button" @click="addEntry(draft.testimonials, makeTestimonialItem)">Add client review</button>
              </div>

              <div class="editor-section-controls">
                <button
                  v-if="activeSectionIndex > 0"
                  class="button button-outline"
                  type="button"
                  @click="changeEditorSection(activeSectionIndex - 1)"
                >← Previous</button>
                <span v-else></span>
                <button
                  v-if="activeSectionIndex < editorSections.length - 1"
                  class="button button-outline"
                  type="button"
                  @click="changeEditorSection(activeSectionIndex + 1)"
                >Next section →</button>
                <button v-else class="button button-primary" type="submit" :disabled="busy || hasActiveImageUploads || Boolean(parsedDraft.error)">
                  {{ busy ? 'Saving...' : 'Publish changes' }} <span aria-hidden="true">↗</span>
                </button>
              </div>
              <div class="editor-footer form-footer">
                <span v-if="parsedDraft.error" class="editor-validation invalid" role="status">Review your edits: {{ parsedDraft.error }}</span>
                <span v-else class="editor-validation valid">Ready to publish.</span>
                <span v-if="lastSaved" class="save-timestamp">Saved {{ new Date(lastSaved).toLocaleString() }}</span>
              </div>
              <div v-if="status" class="form-feedback success" role="status">{{ status }}</div>
              <div v-if="error" class="form-feedback error" role="alert">{{ error }}</div>
            </form>
          </section>

          <aside class="editor-sidebar">
            <section class="admin-card">
              <p class="eyebrow">PORTFOLIO REACH</p>
              <h2>Know what resonates.</h2>
              <p>Enable Web Analytics in your Vercel project, then deploy. The Analytics dashboard shows aggregate visits, referrers, and top pages—not the identity of individual visitors.</p>
              <a class="text-link" href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer">Open Vercel dashboard <span aria-hidden="true">↗</span></a>
              <p>Engagement events such as project opens and contact clicks require Vercel Pro or Enterprise. Views and visits are available separately in Web Analytics.</p>
            </section>
            <section class="admin-card">
              <p class="eyebrow">A SAFE WORKFLOW</p>
              <h2>Draft, review, publish.</h2>
              <ol class="workflow-list">
                <li><span>01</span>Update the form fields with your latest portfolio details.</li>
                <li><span>02</span>Check your entries before saving. Missing values or invalid links can be flagged.</li>
                <li><span>03</span>Download a backup or import a previously saved copy.</li>
                <li><span>04</span>Publish. Changes are saved to Supabase and appear on the public site.</li>
              </ol>
            </section>
            <section class="admin-card">
              <p class="eyebrow">IMAGE PATHS</p>
              <p>Use an existing image path, for example <code>/assets/img/profile.jpeg</code> or <code>/assets/img/portfolio/nexus-1.png</code>. External project links must start with <code>https://</code>.</p>
              <p>For a stronger project story, fill in a project's case study fields. Share only accurate outcomes you are allowed to disclose.</p>
            </section>
          </aside>
        </div>
      </template>
    </section>
  </main>
</template>
