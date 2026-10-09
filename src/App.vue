<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Admin from './components/Admin.vue'
import { defaultContent } from './content.js'
import { trackPortfolioEvent } from './lib/analytics.js'
import { createContactCard } from './lib/contact-card.js'
import { validateContent } from './lib/content-validation.js'
import { nextReviewIndex } from './lib/reviews.js'
import { safeImage, safeLink, supabase, supabaseConfigured } from './lib/supabase.js'

const isAdmin = window.location.pathname.replace(/\/+$/, '').endsWith('/admin')
const content = ref(structuredClone(defaultContent))
const isDark = ref(readSavedTheme() === 'dark')
const mobileMenuOpen = ref(false)
const activeFilter = ref('All')
const searchTerm = ref('')
const selectedProject = ref(null)
const backendNotice = ref('')
const contactState = ref('idle')
const contactError = ref('')
const scrollProgress = ref(null)
const activeSection = ref('home')
const showBackToTop = ref(false)
const emailCopied = ref(false)
const contactUtilityMessage = ref('')
const activeReviewIndex = ref(0)
const reviewPointerStart = ref(null)
const headlineText = computed(() => content.value.headline.replace(/[.!?]+$/, ''))
const filters = computed(() => ['All', ...new Set(content.value.projects.map((project) => project.category).filter(Boolean))])
const navItems = computed(() => [
  { label: 'About', id: 'about' },
  { label: 'Work', id: 'work' },
  { label: 'Experience', id: 'experience' },
  { label: 'Services', id: 'services' },
  { label: 'Client reviews', id: 'reviews' },
  { label: 'Contact', id: 'contact' },
])
const reviewTrackStyle = computed(() => ({
  transform: `translateX(-${activeReviewIndex.value * 100}%)`,
}))
const vReveal = {
  mounted(element) {
    element.classList.add('scroll-reveal')
    element.style.setProperty('--reveal-delay', `${Math.min(Number(element.dataset.revealDelay) || 0, 480)}ms`)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      element.classList.add('is-visible')
      return
    }
    element._scrollRevealObserver = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      element.classList.add('is-visible')
      element._scrollRevealObserver.disconnect()
      delete element._scrollRevealObserver
    }, { threshold: 0.08, rootMargin: '0px 0px -9% 0px' })
    element._scrollRevealObserver.observe(element)
  },
  unmounted(element) {
    element._scrollRevealObserver?.disconnect()
    delete element._scrollRevealObserver
    element.style.removeProperty('--reveal-delay')
  },
}
const visibleProjects = computed(() => {
  const query = searchTerm.value.trim().toLowerCase()
  return content.value.projects.filter((project) => {
    const categoryMatches = activeFilter.value === 'All' || project.category === activeFilter.value
    const searchable = [project.title, project.description, project.category, ...(project.tags || [])].join(' ').toLowerCase()
    return categoryMatches && (!query || searchable.includes(query))
  })
})

watch(content, updatePageMetadata, { deep: true, immediate: true })
watch(() => content.value.testimonials.length, (count) => {
  activeReviewIndex.value = Math.min(activeReviewIndex.value, Math.max(0, count - 1))
})

function setTheme() {
  try {
    localStorage.setItem('portfolio-theme-v2', isDark.value ? 'dark' : 'light')
  } catch (error) {
    console.warn('Could not save the portfolio theme preference:', error)
  }
}

function readSavedTheme() {
  try {
    return localStorage.getItem('portfolio-theme-v2')
  } catch (error) {
    console.warn('Could not read the saved portfolio theme preference:', error)
    return null
  }
}

function setMeta(attribute, key, value) {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.append(element)
  }
  element.setAttribute('content', value)
}

function updatePageMetadata(portfolio) {
  if (isAdmin) {
    document.title = `Portfolio editor | ${portfolio.profile.name}`
    setMeta('name', 'robots', 'noindex, nofollow')
    document.querySelector('#portfolio-person-schema')?.remove()
    return
  }

  document.querySelector('meta[name="robots"]')?.remove()
  const websiteUrl = safeLink(portfolio.profile.website)
  const canonicalUrl = websiteUrl.startsWith('https://') ? websiteUrl : `${window.location.origin}/`
  const description = portfolio.about.replace(/\s+/g, ' ').trim().slice(0, 300)
  const imagePath = safeImage(portfolio.profile.image)
  const imageUrl = imagePath ? new URL(imagePath, canonicalUrl).href : ''
  const title = `${portfolio.profile.name} | ${portfolio.profile.role}`
  document.title = title

  setMeta('name', 'description', description)
  setMeta('property', 'og:title', title)
  setMeta('property', 'og:description', description)
  setMeta('property', 'og:url', canonicalUrl)
  setMeta('property', 'og:image', imageUrl)
  setMeta('name', 'twitter:title', title)
  setMeta('name', 'twitter:description', description)
  setMeta('name', 'twitter:image', imageUrl)

  let canonical = document.head.querySelector('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.append(canonical)
  }
  canonical.href = canonicalUrl

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: portfolio.profile.name,
    jobTitle: portfolio.profile.role,
    url: canonicalUrl,
    email: portfolio.profile.email,
    image: imageUrl,
    address: { '@type': 'PostalAddress', addressLocality: portfolio.profile.location },
    sameAs: Object.values(portfolio.profile.social || {}).filter((url) => /^https:\/\//i.test(url)),
  }
  let schemaElement = document.head.querySelector('#portfolio-person-schema')
  if (!schemaElement) {
    schemaElement = document.createElement('script')
    schemaElement.id = 'portfolio-person-schema'
    schemaElement.type = 'application/ld+json'
    document.head.append(schemaElement)
  }
  schemaElement.textContent = JSON.stringify(schema)
}

function downloadContactCard() {
  const profile = content.value.profile
  const file = new Blob([createContactCard(profile)], { type: 'text/vcard;charset=utf-8' })
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = 'bobby-domdom-jr.vcf'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  trackPortfolioEvent('Contact card downloaded')
}

async function copyEmail() {
  try {
    await navigator.clipboard.writeText(content.value.profile.email)
    emailCopied.value = true
    contactUtilityMessage.value = 'Email address copied.'
    window.setTimeout(() => { emailCopied.value = false }, 2200)
  } catch (error) {
    contactUtilityMessage.value = 'Copy is unavailable in this browser. Select the email address above to copy it.'
    console.warn('Could not copy the portfolio email address:', error)
  }
}

function normalizeContent(candidate) {
  try {
    const validatedContent = validateContent(candidate)
    return { ...validatedContent, testimonials: validatedContent.testimonials || [] }
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
  trackPortfolioEvent('Project opened', { category: String(project.category || 'Other') })
  selectedProject.value = project
  document.body.classList.add('dialog-open')
}

function caseStudyEntries(project) {
  const labels = { challenge: 'Challenge', approach: 'Approach', outcome: 'Outcome' }
  return Object.entries(labels)
    .map(([key, label]) => ({ label, text: project.caseStudy?.[key] }))
    .filter((entry) => typeof entry.text === 'string' && entry.text.trim())
}

function reviewerInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
}

function moveReview(direction) {
  const count = content.value.testimonials.length
  if (count < 2) return
  activeReviewIndex.value = nextReviewIndex(activeReviewIndex.value, direction, count)
}

function startReviewSwipe(event) {
  if (event.pointerType === 'mouse') return
  reviewPointerStart.value = { x: event.clientX, y: event.clientY }
}

function finishReviewSwipe(event) {
  if (!reviewPointerStart.value) return
  const deltaX = event.clientX - reviewPointerStart.value.x
  const deltaY = event.clientY - reviewPointerStart.value.y
  reviewPointerStart.value = null
  if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY)) return
  moveReview(deltaX < 0 ? 1 : -1)
}

function printResume() {
  trackPortfolioEvent('Résumé PDF requested')
  window.print()
}

function contactCta(source) {
  trackPortfolioEvent('Contact CTA clicked', { source })
}

let scrollFrame = 0

function updateScrollProgress() {
  if (scrollFrame) return
  scrollFrame = window.requestAnimationFrame(() => {
    const activationPoint = window.scrollY + window.innerHeight * 0.35
    const sections = document.querySelectorAll('main > section[id]')
    for (const section of sections) {
      if (section.offsetTop <= activationPoint) activeSection.value = section.id
    }
    showBackToTop.value = window.scrollY > 500
    const scrollableDistance = document.documentElement.scrollHeight - window.innerHeight
    if (scrollProgress.value) {
      const progress = scrollableDistance > 0 ? window.scrollY / scrollableDistance : 0
      scrollProgress.value.style.transform = `scaleX(${progress})`
    }
    scrollFrame = 0
  })
}

function closeProject() {
  selectedProject.value = null
  document.body.classList.remove('dialog-open')
}

function onKeydown(event) {
  if (event.key !== 'Escape') return
  mobileMenuOpen.value = false
  if (selectedProject.value) closeProject()
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  })
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
    trackPortfolioEvent('Contact form submitted')
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
  window.addEventListener('scroll', updateScrollProgress, { passive: true })
  updateScrollProgress()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('scroll', updateScrollProgress)
  if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
  document.body.classList.remove('dialog-open')
})
</script>

<template>
  <Admin v-if="isAdmin" />
  <div v-else class="site" :data-theme="isDark ? 'dark' : 'light'">
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="scroll-progress" aria-hidden="true">
      <span ref="scrollProgress"></span>
    </div>

    <header class="topbar">
      <a class="wordmark" href="#home" :aria-label="`${content.profile.name}, home`">
        <span class="wordmark-mark">B.</span>
        <span>{{ content.profile.name }}<small>PORTFOLIO / 2026</small></span>
      </a>
      <button class="menu-button" type="button" aria-controls="primary-navigation" :aria-expanded="mobileMenuOpen" :aria-label="mobileMenuOpen ? 'Close navigation' : 'Open navigation'" @click="mobileMenuOpen = !mobileMenuOpen">
        <span class="menu-icon" :class="{ 'is-open': mobileMenuOpen }" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>
      <nav id="primary-navigation" class="main-nav" :class="{ 'is-open': mobileMenuOpen }" aria-label="Main navigation">
        <a
          v-for="item in navItems"
          :key="item.id"
          :href="`#${item.id}`"
          :aria-current="activeSection === item.id ? 'location' : undefined"
          @click="mobileMenuOpen = false"
        >{{ item.label }}</a>
        <button class="theme-toggle" type="button" :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'" @click="isDark = !isDark; setTheme()">
          {{ isDark ? '☼' : '◐' }}
        </button>
        <a class="nav-cta" href="#contact" @click="mobileMenuOpen = false; contactCta('header')">Let's talk <span aria-hidden="true">↗</span></a>
      </nav>
    </header>

    <div v-if="backendNotice" class="backend-notice" role="status">
      <span>{{ backendNotice }}</span>
      <a href="/admin">Open portfolio editor ↗</a>
    </div>

    <main id="main">
      <section id="home" class="hero section-shell">
        <div v-reveal class="hero-copy" data-reveal="left">
          <p class="eyebrow"><span class="status-dot"></span>{{ content.profile.availability }}</p>
          <h1>{{ headlineText }}<span class="accent-dot">.</span></h1>
          <p class="hero-intro">{{ content.about }}</p>
          <div class="hero-actions">
            <a class="button button-primary" href="#work">Explore selected work <span aria-hidden="true">↘</span></a>
            <a v-if="safeLink(content.profile.social.linkedin)" class="button button-quiet" :href="safeLink(content.profile.social.linkedin)" target="_blank" rel="noopener noreferrer" @click="trackPortfolioEvent('LinkedIn profile clicked')">Connect on LinkedIn <span aria-hidden="true">↗</span></a>
          </div>
          <div class="hero-meta">
            <span>{{ content.profile.location }}</span>
            <span class="meta-divider"></span>
            <span>{{ content.profile.role }}</span>
          </div>
        </div>
        <div v-reveal class="hero-visual" data-reveal="right">
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

      <header id="resume-print-header" class="resume-print-header" aria-hidden="true">
        <h1>{{ content.profile.name }}</h1>
        <p>{{ content.profile.role }}</p>
        <p>{{ content.profile.location }} · {{ content.profile.email }}<span v-if="content.profile.phone"> · {{ content.profile.phone }}</span></p>
        <a v-if="safeLink(content.profile.social.linkedin)" :href="safeLink(content.profile.social.linkedin)">{{ content.profile.social.linkedin }}</a>
      </header>

      <section id="about" class="about-section section-shell section-space">
        <div class="section-label"><span>01</span><span>ABOUT ME</span></div>
        <div v-reveal class="about-content" data-reveal="up">
          <h2 class="section-heading">Curious by nature.<br /><span>Practical by design.</span></h2>
          <div class="about-grid">
            <p class="about-lead">{{ content.about }}</p>
            <div class="about-side">
              <p>For organizations, dependable technology means fewer surprises and more time focused on the work that matters. I value secure foundations, careful troubleshooting, and communicating technical decisions in a way people can act on.</p>
              <a v-if="safeLink(content.profile.website)" class="text-link" :href="safeLink(content.profile.website)" target="_blank" rel="noopener noreferrer" @click="trackPortfolioEvent('Website link clicked')">View my website <span aria-hidden="true">↗</span></a>
            </div>
          </div>
          <div class="fact-row">
            <div><strong>Reliable</strong><span>Systems people can depend on</span></div>
            <div><strong>Secure</strong><span>Responsible data practices</span></div>
            <div><strong>People-first</strong><span>Technology that serves its users</span></div>
          </div>
          <div class="value-proposition">
            <p class="eyebrow">HOW I APPROACH THE WORK</p>
            <div class="value-grid">
              <article v-for="(value, index) in [
                { number: '01 / OPERATIONS', title: 'Keep services dependable.', description: 'Careful administration, maintenance, troubleshooting, and clear handoffs.' },
                { number: '02 / DATA', title: 'Protect what matters.', description: 'Respect access, integrity, and backup needs when working with systems and data.' },
                { number: '03 / DELIVERY', title: 'Make technology usable.', description: 'Translate real needs into maintainable digital tools and practical support.' },
              ]" :key="value.number" v-reveal data-reveal="up" :data-reveal-delay="index * 100">
                <span>{{ value.number }}</span>
                <h3>{{ value.title }}</h3>
                <p>{{ value.description }}</p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section class="skills-section section-shell section-space">
        <div class="section-label"><span>02</span><span>WHAT I BRING</span></div>
        <div v-reveal class="skills-content" data-reveal="up">
          <div>
            <p class="eyebrow">CAPABILITIES</p>
            <h2 class="section-heading">Strong foundations<br />for <span>better outcomes.</span></h2>
            <p class="capabilities-note">A practical blend of operations, data, and digital delivery—grounded in reliability, security, and the people who depend on these systems.</p>
          </div>
          <div class="skill-list">
            <span v-for="(skill, index) in content.skills" :key="typeof skill === 'string' ? skill : skill.name" v-reveal data-reveal="zoom" :data-reveal-delay="index * 55" class="skill-chip">
              {{ typeof skill === 'string' ? skill : skill.name }}
            </span>
          </div>
        </div>
      </section>

      <section id="work" class="work-section section-space">
        <div class="section-shell">
          <div class="section-label"><span>03</span><span>SELECTED WORK</span></div>
          <div v-reveal class="work-content" data-reveal="up">
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
              <article v-for="(project, index) in visibleProjects" :key="project.id || project.title" v-reveal class="project-card" data-reveal="clip" :data-reveal-delay="index * 80" :style="{ '--card-index': index }">
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
        <div v-reveal class="experience-content" data-reveal="up">
          <div class="section-header">
            <div>
              <p class="eyebrow">EXPERIENCE &amp; EDUCATION</p>
              <h2 class="section-heading">Always learning.<br /><span>Always building.</span></h2>
            </div>
            <button class="button button-outline print-button" type="button" @click="printResume">Save résumé as PDF <span aria-hidden="true">↗</span></button>
          </div>
          <div class="journey-grid">
            <div>
              <h3 class="list-heading">Experience <span>({{ content.experience.length }})</span></h3>
              <article v-for="(item, index) in content.experience" :key="`${item.title}-${item.period}`" v-reveal data-reveal="left" :data-reveal-delay="index * 100" class="timeline-item">
                <span class="timeline-dot">{{ String(index + 1).padStart(2, '0') }}</span>
                <div><p class="timeline-period">{{ item.period }}</p><h4>{{ item.title }}</h4><p class="timeline-org">{{ item.organization }}</p><p class="timeline-description">{{ item.description }}</p></div>
              </article>
            </div>
            <div>
              <h3 class="list-heading">Education <span>({{ content.education.length }})</span></h3>
              <article v-for="(item, index) in content.education" :key="`${item.title}-${item.period}`" v-reveal data-reveal="left" :data-reveal-delay="index * 100" class="timeline-item">
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
          <div v-reveal class="services-content" data-reveal="up">
            <p class="eyebrow">THOUGHTFUL WORK, USEFUL RESULTS</p>
            <h2 class="section-heading">Good work starts<br />with <span>understanding.</span></h2>
            <div class="service-grid">
              <article v-for="(service, index) in content.services" :key="service.title" v-reveal data-reveal="zoom" :data-reveal-delay="index * 75" class="service-card">
                <span class="service-icon">{{ service.icon || '✳' }}</span>
                <h3>{{ service.title }}</h3>
                <p>{{ service.description }}</p>
                <a href="#contact" :aria-label="`Ask about ${service.title}`">↗</a>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section id="reviews" class="reviews-section section-space">
        <div class="section-shell">
          <div class="section-label"><span>06</span><span>CLIENT REVIEWS</span></div>
          <div v-reveal class="reviews-content" data-reveal="up">
            <p class="eyebrow">TRUST BUILT THROUGH THE WORK</p>
            <div class="section-header reviews-header">
              <h2 class="section-heading">The experience<br /><span>matters as much as the result.</span></h2>
              <p v-if="content.testimonials.length">Feedback shared with permission from people and teams I’ve worked with.</p>
              <p v-else>Client feedback will appear here once it has been shared and approved for publication.</p>
            </div>
            <div
              v-if="content.testimonials.length"
              class="review-carousel"
              role="region"
              aria-label="Client reviews"
              aria-roledescription="carousel"
              @keydown.left.prevent="moveReview(-1)"
              @keydown.right.prevent="moveReview(1)"
            >
              <div
                class="review-viewport"
                @pointerdown="startReviewSwipe"
                @pointerup="finishReviewSwipe"
                @pointercancel="reviewPointerStart = null"
              >
                <div class="review-track" :style="reviewTrackStyle" aria-live="polite">
                  <figure
                    v-for="(review, index) in content.testimonials"
                    :key="`${review.name}-${review.organization}-${index}`"
                    class="review-card"
                    role="group"
                    aria-roledescription="slide"
                    :aria-label="`Review ${index + 1} of ${content.testimonials.length}`"
                    :aria-hidden="activeReviewIndex !== index"
                  >
                    <span class="review-quote-mark" aria-hidden="true">“</span>
                    <div class="review-author">
                      <div class="reviewer-photo">
                        <img v-if="safeImage(review.photo)" :src="safeImage(review.photo)" :alt="`Photo of ${review.name}`" loading="lazy" />
                        <span v-else aria-hidden="true">{{ reviewerInitials(review.name) }}</span>
                      </div>
                      <figcaption>
                        <strong>{{ review.name }}</strong>
                        <span v-if="review.role || review.organization">{{ [review.role, review.organization].filter(Boolean).join(' · ') }}</span>
                        <small v-if="review.project">{{ review.project }}</small>
                      </figcaption>
                    </div>
                    <blockquote>{{ review.quote }}</blockquote>
                  </figure>
                </div>
              </div>
              <div v-if="content.testimonials.length > 1" class="review-controls">
                <div class="review-pagination" aria-label="Choose a client review">
                  <button
                    v-for="(_, index) in content.testimonials"
                    :key="`review-dot-${index}`"
                    type="button"
                    class="review-pagination-dot"
                    :class="{ 'is-active': activeReviewIndex === index }"
                    :aria-label="`Show review ${index + 1}`"
                    :aria-current="activeReviewIndex === index ? 'true' : undefined"
                    @click="activeReviewIndex = index"
                  ></button>
                </div>
                <span class="review-count" aria-live="polite">{{ String(activeReviewIndex + 1).padStart(2, '0') }} / {{ String(content.testimonials.length).padStart(2, '0') }}</span>
                <div class="review-arrows">
                  <button class="review-arrow" type="button" aria-label="Previous client review" @click="moveReview(-1)">←</button>
                  <button class="review-arrow" type="button" aria-label="Next client review" @click="moveReview(1)">→</button>
                </div>
              </div>
            </div>
            <div v-else class="review-empty-state">
              <span class="review-empty-mark" aria-hidden="true">“</span>
              <p>No client reviews have been published yet.</p>
              <a class="text-link" href="/admin">Manage reviews in the portfolio editor <span aria-hidden="true">↗</span></a>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" class="contact-section section-space">
        <div class="section-shell">
          <div class="section-label"><span>07</span><span>LET'S CONNECT</span></div>
          <div v-reveal class="contact-content" data-reveal="up">
            <p class="eyebrow"><span class="status-dot"></span> HAVE A PROJECT IN MIND?</p>
            <h2 class="contact-heading">Let's make<br /><span>something matter.</span></h2>
            <div class="contact-grid">
              <div class="contact-info">
                <p>Looking for someone who can bridge databases, IT operations, and digital delivery? I welcome conversations about meaningful technology roles and projects.</p>
                <a class="contact-email" :href="safeLink(`mailto:${content.profile.email}`)" @click="trackPortfolioEvent('Email contact clicked')">{{ content.profile.email }} <span aria-hidden="true">↗</span></a>
                <a v-if="safeLink(`tel:${content.profile.phone}`)" class="contact-phone" :href="safeLink(`tel:${content.profile.phone}`)">{{ content.profile.phone }}</a>
                <p class="contact-location">{{ content.profile.location }}</p>
                <div class="contact-utilities">
                  <button class="button button-outline" type="button" @click="copyEmail">{{ emailCopied ? 'Email copied' : 'Copy email' }}</button>
                  <button class="button button-quiet" type="button" @click="downloadContactCard">Save contact card <span aria-hidden="true">↓</span></button>
                </div>
                <p v-if="contactUtilityMessage" class="contact-utility-message" role="status">{{ contactUtilityMessage }}</p>
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
          <a v-for="(url, network) in content.profile.social" v-show="safeLink(url)" :key="network" :href="safeLink(url)" target="_blank" rel="noopener noreferrer" @click="network === 'linkedin' && trackPortfolioEvent('LinkedIn profile clicked')">{{ network }}</a>
          <a href="/admin" aria-label="Open the portfolio editor">Editor ↗</a>
        </div>
      </div>
      <p class="analytics-note">Site analytics measure aggregate visits and interactions; they do not tell me who an individual visitor is.</p>
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
            <dl v-if="caseStudyEntries(selectedProject).length" class="case-study-list">
              <div v-for="entry in caseStudyEntries(selectedProject)" :key="entry.label">
                <dt>{{ entry.label }}</dt>
                <dd>{{ entry.text }}</dd>
              </div>
            </dl>
            <div class="dialog-tags"><span v-for="tag in selectedProject.tags || []" :key="tag">{{ tag }}</span></div>
            <a v-if="safeLink(selectedProject.link)" class="text-link" :href="safeLink(selectedProject.link)" target="_blank" rel="noopener noreferrer">Visit project <span aria-hidden="true">↗</span></a>
          </div>
        </section>
      </div>
    </Transition>
    <Transition name="back-to-top">
      <button v-if="showBackToTop" class="back-to-top" type="button" aria-label="Back to top" @click="scrollToTop">
        <span aria-hidden="true">↑</span>
      </button>
    </Transition>
  </div>
</template>
