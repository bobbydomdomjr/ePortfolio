<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Admin from './components/Admin.vue'
import { defaultContent } from './content.js'
import { validateContent } from './lib/content-validation.js'
import { safeImage, safeLink, supabase, supabaseConfigured } from './lib/supabase.js'

const isAdmin = window.location.pathname.replace(/\/+$/, '').endsWith('/admin')
const content = ref(structuredClone(defaultContent))
const isDark = ref(localStorage.getItem('portfolio-theme') === 'dark')
const mobileMenuOpen = ref(false)
const activeFilter = ref('All')
const searchTerm = ref('')
const selectedProject = ref(null)
const backendNotice = ref('')
const contactState = ref('idle')
const contactError = ref('')
const filters = computed(() => ['All', ...new Set(content.value.projects.map((project) => project.category).filter(Boolean))])
const visibleProjects = computed(() => {
  const query = searchTerm.value.trim().toLowerCase()
  return content.value.projects.filter((project) => {
    const categoryMatches = activeFilter.value === 'All' || project.category === activeFilter.value
    const searchable = [project.title, project.description, project.category, ...(project.tags || [])].join(' ').toLowerCase()
    return categoryMatches && (!query || searchable.includes(query))
  })
})

function setTheme() {
  localStorage.setItem('portfolio-theme', isDark.value ? 'dark' : 'light')
}

function normalizeContent(candidate) {
  try {
    return validateContent(candidate)
  } catch (error) {
    console.error('Published portfolio content is not in the expected format:', error)
    return null
  }
}

async function loadContent() {
  if (!supabase) {
    backendNotice.value = 'Preview mode: connect Supabase to publish portfolio updates from the admin dashboard.'
    return
  }
  const { data, error } = await supabase.from('portfolio_content').select('content').eq('id', 'main').maybeSingle()
  if (error) {
    console.error('Could not load published portfolio content:', error)
    backendNotice.value = 'The live content service is unavailable. Showing the included portfolio preview.'
    return
  }
  if (data) {
    const savedContent = normalizeContent(data.content)
    if (savedContent) content.value = savedContent
    else {
      backendNotice.value = 'Published content needs attention. Showing the included portfolio preview.'
    }
  } else {
    backendNotice.value = 'Your starter portfolio is ready. Sign in at /admin to publish it to Supabase.'
  }
}

function selectProject(project) {
  selectedProject.value = project
  document.body.classList.add('dialog-open')
}

function printResume() {
  window.print()
}

function closeProject() {
  selectedProject.value = null
  document.body.classList.remove('dialog-open')
}

function onKeydown(event) {
  if (event.key === 'Escape') closeProject()
}

async function submitContact(event) {
  const form = event.currentTarget
  contactState.value = 'sending'
  contactError.value = ''
  const payload = Object.fromEntries(new FormData(form))

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/plain' },
      body: JSON.stringify(payload),
    })
    const message = (await response.text()).trim()
    if (!response.ok) throw new Error(message || `Message could not be sent (${response.status}).`)
    contactState.value = 'sent'
    form.reset()
  } catch (error) {
    contactState.value = 'error'
    contactError.value = error instanceof Error ? error.message : 'Could not reach the contact service. Please email me directly.'
    console.error('Contact form submission failed:', error)
  }
}

onMounted(() => {
  if (!isAdmin) loadContent()
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.classList.remove('dialog-open')
})
</script>

<template>
  <Admin v-if="isAdmin" />
  <div v-else class="site" :data-theme="isDark ? 'dark' : 'light'">
    <a class="skip-link" href="#main">Skip to content</a>

    <header class="topbar">
      <a class="wordmark" href="#home" :aria-label="`${content.profile.name}, home`">
        <span class="wordmark-mark">B.</span>
        <span>{{ content.profile.name }}<small>PORTFOLIO / 2026</small></span>
      </a>
      <button class="menu-button" type="button" :aria-expanded="mobileMenuOpen" aria-label="Toggle navigation" @click="mobileMenuOpen = !mobileMenuOpen">
        {{ mobileMenuOpen ? 'Close' : 'Menu' }}
      </button>
      <nav class="main-nav" :class="{ 'is-open': mobileMenuOpen }" aria-label="Main navigation">
        <a v-for="item in ['About', 'Work', 'Experience', 'Services', 'Contact']" :key="item" :href="`#${item.toLowerCase()}`" @click="mobileMenuOpen = false">{{ item }}</a>
        <button class="theme-toggle" type="button" :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'" @click="isDark = !isDark; setTheme()">
          {{ isDark ? '☼' : '◐' }}
        </button>
        <a class="nav-cta" href="#contact" @click="mobileMenuOpen = false">Let's talk <span aria-hidden="true">↗</span></a>
      </nav>
    </header>

    <div v-if="backendNotice" class="backend-notice" role="status">
      <span>{{ backendNotice }}</span>
      <a href="/admin">Open portfolio editor ↗</a>
    </div>

    <main id="main">
      <section id="home" class="hero section-shell">
        <div class="hero-copy">
          <p class="eyebrow"><span class="status-dot"></span>{{ content.profile.availability }}</p>
          <h1>{{ content.headline }}<span class="accent-dot">.</span></h1>
          <p class="hero-intro">{{ content.about }}</p>
          <div class="hero-actions">
            <a class="button button-primary" href="#work">Explore my work <span aria-hidden="true">↘</span></a>
            <a class="button button-quiet" href="#contact">Get in touch <span aria-hidden="true">↗</span></a>
          </div>
          <div class="hero-meta">
            <span>{{ content.profile.location }}</span>
            <span class="meta-divider"></span>
            <span>{{ content.profile.role }}</span>
          </div>
        </div>
        <div class="hero-visual">
          <div class="hero-orbit orbit-one"></div>
          <div class="hero-orbit orbit-two"></div>
          <div class="portrait-frame">
            <img :src="safeImage(content.profile.image) || '/assets/img/profile.jpeg'" :alt="`Portrait of ${content.profile.name}`" fetchpriority="high" />
          </div>
          <div class="floating-card floating-location"><span class="mini-icon">⌖</span><span>Based in<small>{{ content.profile.location }}</small></span></div>
          <div class="floating-card floating-role"><span class="mini-icon">✳</span><span>Currently<small>Building &amp; learning</small></span></div>
          <span class="hero-stamp" aria-hidden="true">IT · DATABASES · DIGITAL</span>
        </div>
        <a class="scroll-cue" href="#about"><span>Scroll to explore</span><span aria-hidden="true">↓</span></a>
      </section>

      <section id="about" class="about-section section-shell section-space">
        <div class="section-label"><span>01</span><span>ABOUT ME</span></div>
        <div class="about-content">
          <h2 class="section-heading">Curious by nature.<br /><span>Practical by design.</span></h2>
          <div class="about-grid">
            <p class="about-lead">{{ content.about }}</p>
            <div class="about-side">
              <p>My experience spans database administration, IT operations, and the craft of creating clear, welcoming web experiences. I bring a hands-on mindset to every problem—listen first, then build something useful.</p>
              <a v-if="safeLink(content.profile.website)" class="text-link" :href="safeLink(content.profile.website)" target="_blank" rel="noopener noreferrer">View my website <span aria-hidden="true">↗</span></a>
            </div>
          </div>
          <div class="fact-row">
            <div><strong>BSIS</strong><span>Bicol University graduate</span></div>
            <div><strong>IT + Web</strong><span>Technology with a human touch</span></div>
            <div><strong>Philippines</strong><span>{{ content.profile.location }}</span></div>
          </div>
        </div>
      </section>

      <section class="skills-section section-shell section-space">
        <div class="section-label"><span>02</span><span>WHAT I BRING</span></div>
        <div class="skills-content">
          <h2 class="section-heading">A toolkit built<br />to <span>solve problems.</span></h2>
          <div class="skill-list">
            <span v-for="skill in content.skills" :key="typeof skill === 'string' ? skill : skill.name" class="skill-chip">
              {{ typeof skill === 'string' ? skill : skill.name }}
            </span>
          </div>
        </div>
      </section>

      <section id="work" class="work-section section-space">
        <div class="section-shell">
          <div class="section-label"><span>03</span><span>SELECTED WORK</span></div>
          <div class="work-content">
            <div class="section-header">
              <div>
                <p class="eyebrow">A FEW THINGS I'VE WORKED ON</p>
                <h2 class="section-heading">Ideas made <span>visible.</span></h2>
              </div>
              <p class="section-support">A selection of design and digital work. Choose a project to see more, or filter the collection by type.</p>
            </div>
            <div class="project-tools">
              <div class="filter-row" aria-label="Filter projects">
                <button v-for="filter in filters" :key="filter" type="button" :class="{ active: activeFilter === filter }" @click="activeFilter = filter">{{ filter }}</button>
              </div>
              <label class="search-box">
                <span aria-hidden="true">⌕</span>
                <span class="sr-only">Search projects</span>
                <input v-model="searchTerm" type="search" placeholder="Find a project" />
              </label>
            </div>
            <div class="project-grid">
              <article v-for="(project, index) in visibleProjects" :key="project.id || project.title" class="project-card" :style="{ '--card-index': index }">
                <button class="project-open" type="button" :aria-label="`View ${project.title}`" @click="selectProject(project)">
                  <span class="project-image" :class="`project-tone-${index % 4}`">
                    <img :src="safeImage(project.image) || '/assets/img/portfolio/portfolio-1.jpg'" :alt="project.title" loading="lazy" />
                    <span class="project-view">View project <span aria-hidden="true">↗</span></span>
                  </span>
                  <span class="project-caption">
                    <span><strong>{{ project.title }}</strong><small>{{ project.category }} <span aria-hidden="true">·</span> {{ project.year }}</small></span>
                    <span class="project-arrow" aria-hidden="true">↗</span>
                  </span>
                </button>
              </article>
              <p v-if="visibleProjects.length === 0" class="empty-state">No projects match that search. Try another keyword.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="experience" class="experience-section section-shell section-space">
        <div class="section-label"><span>04</span><span>THE JOURNEY</span></div>
        <div class="experience-content">
          <div class="section-header">
            <div>
              <p class="eyebrow">EXPERIENCE &amp; EDUCATION</p>
              <h2 class="section-heading">Always learning.<br /><span>Always building.</span></h2>
            </div>
            <button class="button button-outline print-button" type="button" @click="printResume">Print this résumé <span aria-hidden="true">↗</span></button>
          </div>
          <div class="journey-grid">
            <div>
              <h3 class="list-heading">Experience <span>({{ content.experience.length }})</span></h3>
              <article v-for="(item, index) in content.experience" :key="`${item.title}-${item.period}`" class="timeline-item">
                <span class="timeline-dot">{{ String(index + 1).padStart(2, '0') }}</span>
                <div><p class="timeline-period">{{ item.period }}</p><h4>{{ item.title }}</h4><p class="timeline-org">{{ item.organization }}</p><p class="timeline-description">{{ item.description }}</p></div>
              </article>
            </div>
            <div>
              <h3 class="list-heading">Education <span>({{ content.education.length }})</span></h3>
              <article v-for="(item, index) in content.education" :key="`${item.title}-${item.period}`" class="timeline-item">
                <span class="timeline-dot">{{ String(index + 1).padStart(2, '0') }}</span>
                <div><p class="timeline-period">{{ item.period }}</p><h4>{{ item.title }}</h4><p class="timeline-org">{{ item.organization }}</p><p class="timeline-description">{{ item.description }}</p></div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section id="services" class="services-section section-space">
        <div class="section-shell">
          <div class="section-label"><span>05</span><span>HOW I CAN HELP</span></div>
          <div class="services-content">
            <p class="eyebrow">THOUGHTFUL WORK, USEFUL RESULTS</p>
            <h2 class="section-heading">Good work starts<br />with <span>understanding.</span></h2>
            <div class="service-grid">
              <article v-for="service in content.services" :key="service.title" class="service-card">
                <span class="service-icon">{{ service.icon || '✳' }}</span>
                <h3>{{ service.title }}</h3>
                <p>{{ service.description }}</p>
                <a href="#contact" :aria-label="`Ask about ${service.title}`">↗</a>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" class="contact-section section-space">
        <div class="section-shell">
          <div class="section-label"><span>06</span><span>LET'S CONNECT</span></div>
          <div class="contact-content">
            <p class="eyebrow"><span class="status-dot"></span> HAVE A PROJECT IN MIND?</p>
            <h2 class="contact-heading">Let's make<br /><span>something matter.</span></h2>
            <div class="contact-grid">
              <div class="contact-info">
                <p>Have an idea, a tricky tech problem, or just want to say hello? I'd love to hear from you.</p>
                <a class="contact-email" :href="safeLink(`mailto:${content.profile.email}`)">{{ content.profile.email }} <span aria-hidden="true">↗</span></a>
                <a v-if="safeLink(`tel:${content.profile.phone}`)" class="contact-phone" :href="safeLink(`tel:${content.profile.phone}`)">{{ content.profile.phone }}</a>
                <p class="contact-location">{{ content.profile.location }}</p>
              </div>
              <form class="contact-form" @submit.prevent="submitContact">
                <div class="form-row">
                  <label>Your name<input name="name" type="text" autocomplete="name" maxlength="200" required placeholder="How should I address you?" /></label>
                  <label>Your email<input name="email" type="email" autocomplete="email" maxlength="320" required placeholder="you@example.com" /></label>
                </div>
                <label>Subject<input name="subject" type="text" maxlength="200" required placeholder="What would you like to discuss?" /></label>
                <label>Your message<textarea name="message" rows="4" maxlength="10000" required placeholder="Tell me a little about it..."></textarea></label>
                <div v-if="contactState === 'sent'" class="form-feedback success" role="status">Thanks for your message. I'll be in touch soon.</div>
                <div v-if="contactState === 'error'" class="form-feedback error" role="alert">{{ contactError }}</div>
                <button class="button button-primary send-button" type="submit" :disabled="contactState === 'sending'">
                  {{ contactState === 'sending' ? 'Sending...' : 'Send a message' }} <span aria-hidden="true">↗</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="footer">
      <div class="section-shell footer-inner">
        <a class="wordmark footer-mark" href="#home"><span class="wordmark-mark">B.</span><span>{{ content.profile.name }}<small>MADE WITH INTENTION</small></span></a>
        <p>© {{ new Date().getFullYear() }} {{ content.profile.name }}. Built with care.</p>
        <div class="footer-links">
          <a v-for="(url, network) in content.profile.social" v-show="safeLink(url)" :key="network" :href="safeLink(url)" target="_blank" rel="noopener noreferrer">{{ network }}</a>
          <a href="/admin" aria-label="Open the portfolio editor">Editor ↗</a>
        </div>
      </div>
    </footer>

    <Transition name="dialog">
      <div v-if="selectedProject" class="project-dialog-backdrop" role="presentation" @click.self="closeProject">
        <section class="project-dialog" role="dialog" aria-modal="true" :aria-label="selectedProject.title">
          <button class="dialog-close" type="button" aria-label="Close project details" @click="closeProject">×</button>
          <img class="dialog-image" :src="safeImage(selectedProject.image) || '/assets/img/portfolio/portfolio-1.jpg'" :alt="selectedProject.title" />
          <div class="dialog-content">
            <p class="eyebrow">{{ selectedProject.category }} <span aria-hidden="true">·</span> {{ selectedProject.year }}</p>
            <h2>{{ selectedProject.title }}</h2>
            <p>{{ selectedProject.description }}</p>
            <div class="dialog-tags"><span v-for="tag in selectedProject.tags || []" :key="tag">{{ tag }}</span></div>
            <a v-if="safeLink(selectedProject.link)" class="text-link" :href="safeLink(selectedProject.link)" target="_blank" rel="noopener noreferrer">Visit project <span aria-hidden="true">↗</span></a>
          </div>
        </section>
      </div>
    </Transition>
  </div>
</template>
