import { createApp } from 'vue'
import { inject } from '@vercel/analytics'
import App from './App.vue'
import './style.css'
import { SpeedInsights } from '@vercel/speed-insights/react';

if (!window.location.pathname.replace(/\/+$/, '').endsWith('/admin')) {
  inject()
  SpeedInsights()
}

createApp(App).mount('#app')
