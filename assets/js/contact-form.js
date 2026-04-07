/**
 * Posts to /api/contact (Vercel serverless). Gmail SMTP uses GMAIL_USER + GMAIL_APP_PASSWORD
 * only on the server—never put your app password in this file or in HTML.
 */
(function () {
  'use strict';

  const API_PATH = '/api/contact';

  function showState(form, state) {
    const loading = form.querySelector('.loading');
    const err = form.querySelector('.error-message');
    const sent = form.querySelector('.sent-message');
    if (loading) loading.classList.toggle('d-block', state === 'loading');
    if (err) err.classList.toggle('d-block', state === 'error');
    if (sent) sent.classList.toggle('d-block', state === 'sent');
    if (state !== 'error' && err) err.textContent = '';
  }

  function displayError(form, msg) {
    const err = form.querySelector('.error-message');
    if (err) err.textContent = msg;
    showState(form, 'error');
  }

  document.querySelectorAll('form.php-email-form[data-contact-handler]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();

      const endpoint = form.getAttribute('data-contact-endpoint') || API_PATH;
      const fd = new FormData(form);
      const payload = {
        name: (fd.get('name') || '').toString().trim(),
        email: (fd.get('email') || '').toString().trim(),
        subject: (fd.get('subject') || '').toString().trim(),
        message: (fd.get('message') || '').toString().trim(),
      };

      const sent = form.querySelector('.sent-message');
      if (sent) {
        sent.textContent = 'Your message has been sent. Thank you!';
      }

      showState(form, 'loading');

      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/plain',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          return res.text().then(function (text) {
            return { ok: res.ok, status: res.status, text: text.trim() };
          });
        })
        .then(function (result) {
          if (result.ok && result.text === 'OK') {
            showState(form, 'sent');
            form.reset();
          } else {
            displayError(
              form,
              result.text || 'Something went wrong (' + result.status + ').'
            );
          }
        })
        .catch(function () {
          displayError(
            form,
            'Could not reach the server. Deploy with Vercel (or run `vercel dev`) so /api/contact exists.'
          );
        });
    });
  });
})();
