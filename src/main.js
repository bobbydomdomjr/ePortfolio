import { createApp } from 'vue'
import { inject } from '@vercel/analytics'
import App from './App.vue'
import './style.css'

if (!window.location.pathname.replace(/\/+$/, '').endsWith('/admin')) {
  inject()
}

createApp(App).mount('#app')


import { onMounted, onUnmounted } from 'vue';

let reviewAutoplayTimer;

onMounted(() => {
  reviewAutoplayTimer = window.setInterval(() => {
    if (content.testimonials.length > 1) {
      moveReview(1);
    }
  }, 5000);
});

onUnmounted(() => {
  window.clearInterval(reviewAutoplayTimer);
});
