import { createApp } from 'vue'
import { inject } from '@vercel/analytics'
import App from './App.vue'
import './style.css'

if (!window.location.pathname.replace(/\/+$/, '').endsWith('/admin')) {
  inject()
}

createApp(App).mount('#app')
