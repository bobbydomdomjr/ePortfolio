/**
 * Contact form for static hosting (Vercel, GitHub Pages, etc.).
 * - With a Web3Forms access key: POSTs to https://api.web3forms.com/submit (free at https://web3forms.com).
 * - Without a key: opens the visitor's email client via mailto (no signup required).
 */
(function () {
  'use strict';

  const RECEIVING_EMAIL = 'bobby.domdomjr1@gmail.com';
  const PLACEHOLDER = 'uxouffksdiurvvky';

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

  function useWeb3Forms(key) {
    return key && key.length >= 32 && key !== PLACEHOLDER && !/^YOUR_/i.test(key);
  }

  function submitMailto(form) {
    const fd = new FormData(form);
    const name = (fd.get('name') || '').toString().trim();
    const email = (fd.get('email') || '').toString().trim();
    const subject = (fd.get('subject') || '').toString().trim();
    const message = (fd.get('message') || '').toString().trim();
    const body =
      'Name: ' + name + '\n' +
      'Email: ' + email + '\n\n' +
      message;
    const q =
      'subject=' + encodeURIComponent(subject || 'ePortfolio contact') +
      '&body=' + encodeURIComponent(body);
    const sent = form.querySelector('.sent-message');
    if (sent) {
      sent.textContent =
        'Your email app should open with your message. Send it from there to reach me. Thank you!';
    }
    window.location.href = 'mailto:' + RECEIVING_EMAIL + '?' + q;
    showState(form, 'sent');
    form.reset();
  }

  function submitWeb3(form, accessKey) {
    const fd = new FormData(form);
    const subject = (fd.get('subject') || '').toString().trim();
    const payload = {
      access_key: accessKey,
      subject: '[ePortfolio] ' + (subject || 'Contact form'),
      name: (fd.get('name') || '').toString().trim(),
      email: (fd.get('email') || '').toString().trim(),
      message: (fd.get('message') || '').toString().trim(),
    };

    showState(form, 'loading');

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (result.data && result.data.success) {
          const sent = form.querySelector('.sent-message');
          if (sent) {
            sent.textContent = 'Your message has been sent. Thank you!';
          }
          showState(form, 'sent');
          form.reset();
        } else {
          const msg =
            (result.data && (result.data.message || result.data.error)) ||
            'Could not send message. Try again or use email below.';
          displayError(form, msg);
        }
      })
      .catch(function () {
        displayError(
          form,
          'Network error. Check your connection or use the email address in the sidebar.'
        );
      });
  }

  document.querySelectorAll('form.php-email-form[data-contact-handler]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const key = (form.getAttribute('data-web3forms-access-key') || '').trim();
      if (useWeb3Forms(key)) {
        submitWeb3(form, key);
      } else {
        showState(form, 'loading');
        try {
          submitMailto(form);
        } catch (e) {
          displayError(form, 'Could not open email. Write to ' + RECEIVING_EMAIL);
        }
      }
    });
  });
})();
