<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { defaultContent } from '../content.js'
import { validateContent } from '../lib/content-validation.js'
import { supabase, supabaseConfigured } from '../lib/supabase.js'

const email = ref('')
const password = ref('')
const session = ref(null)
const draft = ref(JSON.stringify(defaultContent, null, 2))
const status = ref('')
const error = ref('')
const busy = ref(false)
const lastSaved = ref('')
const fileInput = ref(null)
let authSubscription

const parsedDraft = computed(() => {
  try {
    return { value: JSON.parse(draft.value), error: '' }
  } catch (parseError) {
    return { value: null, error: parseError.message }
  }
})

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
    draft.value = JSON.stringify(data.content, null, 2)
    lastSaved.value = data.updated_at
    status.value = 'Loaded the latest published content.'
  } else {
    draft.value = JSON.stringify(defaultContent, null, 2)
    status.value = 'Starter content loaded. Publish to create the first live version.'
  }
}

async function saveContent() {
  if (!supabase || !session.value) return
  busy.value = true
  error.value = ''
  status.value = ''
  try {
    const content = validateContent(JSON.parse(draft.value))
    const updatedAt = new Date().toISOString()
    const { error: saveError } = await supabase.from('portfolio_content').upsert(
      { id: 'main', content, updated_at: updatedAt },
      { onConflict: 'id' },
    )
    if (saveError) throw saveError
    lastSaved.value = updatedAt
    status.value = 'Published. Your public portfolio now shows these changes.'
  } catch (saveError) {
    error.value = saveError instanceof SyntaxError ? `Fix the JSON before saving: ${saveError.message}` : saveError.message || 'Could not publish changes.'
    console.error('Portfolio content could not be published:', saveError)
  } finally {
    busy.value = false
  }
}

function exportBackup() {
  const blob = new Blob([draft.value], { type: 'application/json' })
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
    draft.value = JSON.stringify(parsed, null, 2)
    status.value = 'Backup loaded. Review the draft and publish it when ready.'
    error.value = ''
  } catch (importError) {
    error.value = importError instanceof SyntaxError ? `That file is not valid JSON: ${importError.message}` : importError.message
  }
  event.target.value = ''
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
            <p>Update your portfolio content, then publish the new version. The public site updates as soon as it reloads.</p>
          </div>
          <a class="button button-quiet" href="/" target="_blank" rel="noopener noreferrer">Preview portfolio ↗</a>
        </div>
        <div class="editor-layout">
          <section class="admin-card editor-card">
            <div class="editor-toolbar">
              <div><p class="eyebrow">CONTENT DOCUMENT</p><h2>Portfolio data</h2></div>
              <div class="editor-actions">
                <button class="button button-outline" type="button" @click="exportBackup">Download backup</button>
                <button class="button button-outline" type="button" @click="fileInput?.click()">Import backup</button>
                <input ref="fileInput" class="sr-only" type="file" accept="application/json,.json" @change="importBackup" />
              </div>
            </div>
            <p class="editor-help">Edit the JSON to update your profile, work, experience, skills, and services. Keep field names and list formats intact. Download a backup before a major edit.</p>
            <label class="sr-only" for="content-editor">Portfolio JSON content</label>
            <textarea id="content-editor" v-model="draft" class="code-editor" spellcheck="false" autocapitalize="off" autocomplete="off"></textarea>
            <div class="editor-footer">
              <span v-if="parsedDraft.error" class="editor-validation invalid" role="status">JSON needs attention: {{ parsedDraft.error }}</span>
              <span v-else class="editor-validation valid">JSON syntax looks good. Review content before publishing.</span>
              <span v-if="lastSaved" class="save-timestamp">Saved {{ new Date(lastSaved).toLocaleString() }}</span>
            </div>
            <div v-if="status" class="form-feedback success" role="status">{{ status }}</div>
            <div v-if="error" class="form-feedback error" role="alert">{{ error }}</div>
            <button class="button button-primary publish-button" type="button" :disabled="busy || Boolean(parsedDraft.error)" @click="saveContent">
              {{ busy ? 'Saving...' : 'Publish changes' }} <span aria-hidden="true">↗</span>
            </button>
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
                <li><span>01</span>Edit the JSON data. Lists such as <code>projects</code> accept multiple items.</li>
                <li><span>02</span>Fix any syntax errors. JSON strings must use double quotes.</li>
                <li><span>03</span>Download a backup or import a previously saved copy.</li>
                <li><span>04</span>Publish. Changes are saved to Supabase and appear on the public site.</li>
              </ol>
            </section>
            <section class="admin-card">
              <p class="eyebrow">IMAGE PATHS</p>
              <p>Use an existing image path, for example <code>/assets/img/profile.jpeg</code> or <code>/assets/img/portfolio/nexus-1.png</code>. External project links must start with <code>https://</code>.</p>
              <p>For a stronger project story, fill in a project's <code>caseStudy.challenge</code>, <code>caseStudy.approach</code>, and <code>caseStudy.outcome</code>. Share only accurate outcomes you are allowed to disclose.</p>
            </section>
          </aside>
        </div>
      </template>
    </section>
  </main>
</template>
