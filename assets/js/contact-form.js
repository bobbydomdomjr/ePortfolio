/**
 * 1) POST /api/contact — Vercel serverless (env: GMAIL_USER, GMAIL_APP_PASSWORD).
 * 2) If that returns 404/405, POST /forms/contact.php — PHP + PHPMailer (forms/mail.config.php).
 */
(function () {
  'use strict';

  const API_PATH = '/api/contact';
  const PHP_FALLBACK = '/forms/contact.php';

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

  function postJson(url, payload) {
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/plain',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(payload),
    });
  }

  async function sendContact(endpoint, payload) {
    let res = await postJson(endpoint, payload);
    if (
      (res.status === 405 || res.status === 404) &&
      endpoint === API_PATH
    ) {
      res = await postJson(PHP_FALLBACK, payload);
    }
    const text = (await res.text()).trim();
    return { ok: res.ok, status: res.status, text: text };
  }

  document.querySelectorAll('form.php-email-form[data-contact-handler]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();

      const primary =
        form.getAttribute('data-contact-endpoint') || API_PATH;
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

      sendContact(primary, payload)
        .then(function (result) {
          if (result.ok && result.text === 'OK') {
            showState(form, 'sent');
            form.reset();
          } else {
            displayError(
              form,
              result.text ||
                'Send failed (' +
                  result.status +
                  '). See README: Vercel needs an empty Output Directory + env vars; PHP hosts need composer install and forms/mail.config.php.'
            );
          }
        })
        .catch(function () {
          displayError(
            form,
            'Network error. Check your connection or try again.'
          );
        });
    });
  });
})();
