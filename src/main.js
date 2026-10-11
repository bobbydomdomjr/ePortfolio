import { createApp } from 'vue'
import { inject } from '@vercel/analytics'
import { injectSpeedInsights } from '@vercel/speed-insights'
import App from './App.vue'
import './style.css'

if (!window.location.pathname.replace(/\/+$/, '').endsWith('/admin')) {
  inject()
  injectSpeedInsights()
}

createApp(App).mount('#app')
