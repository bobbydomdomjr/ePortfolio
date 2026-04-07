/**
 * Contact mail (JSON POST):
 * 1) /api/contact — Vercel (GMAIL_USER, GMAIL_APP_PASSWORD)
 * 2) /forms/contact.php — PHP + PHPMailer + mail.config.php
 *
 * Paths are resolved relative to the site root (works with /project subpaths).
 */
(function () {
  'use strict';

  function siteBasePath() {
    var path = window.location.pathname || '/';
    var i = path.lastIndexOf('/');
    if (i <= 0) return '';
    return path.slice(0, i);
  }

  function withBase(path) {
    var base = siteBasePath();
    var p = path.charAt(0) === '/' ? path : '/' + path;
    return window.location.origin + base + p;
  }

  function endpoints() {
    return {
      api: withBase('/api/contact'),
      php: withBase('/forms/contact.php'),
    };
  }

  function isHttpPage() {
    return (
      window.location.protocol === 'http:' ||
      window.location.protocol === 'https:'
    );
  }

  function readableError(text, status) {
    if (!text || /<html[\s>]|<!DOCTYPE/i.test(text)) {
      return (
        'Mail endpoint returned an error page (' +
        (status || '?') +
        '). Check hosting: deploy api/ on Vercel or configure forms/mail.config.php + PHP.'
      );
    }
    return text.length > 600 ? text.slice(0, 600) + '…' : text;
  }

  function showState(form, state) {
    var loading = form.querySelector('.loading');
    var err = form.querySelector('.error-message');
    var sent = form.querySelector('.sent-message');
    if (loading) loading.classList.toggle('d-block', state === 'loading');
    if (err) err.classList.toggle('d-block', state === 'error');
    if (sent) sent.classList.toggle('d-block', state === 'sent');
    if (state !== 'error' && err) err.textContent = '';
  }

  function displayError(form, msg) {
    var err = form.querySelector('.error-message');
    if (err) err.textContent = msg;
    showState(form, 'error');
  }

  function postJson(url, payload) {
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/plain, application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(payload),
    });
  }

  async function tryPhp(urls, payload) {
    var res = await postJson(urls.php, payload);
    var text = (await res.text()).trim();
    return { ok: res.ok, status: res.status, text: text };
  }

  async function sendContact(primary, urls, payload) {
    var useApiFirst = !primary || primary === urls.api || primary === '/api/contact';

    if (useApiFirst) {
      try {
        var res = await postJson(urls.api, payload);
        if (res.status === 405 || res.status === 404) {
          return tryPhp(urls, payload);
        }
        var text = (await res.text()).trim();
        return { ok: res.ok, status: res.status, text: text };
      } catch (e) {
        try {
          return await tryPhp(urls, payload);
        } catch (e2) {
          throw e;
        }
      }
    }

    try {
      var res2 = await postJson(primary, payload);
      var text2 = (await res2.text()).trim();
      if (
        !res2.ok &&
        (res2.status === 405 || res2.status === 404)
      ) {
        return tryPhp(urls, payload);
      }
      return { ok: res2.ok, status: res2.status, text: text2 };
    } catch (err) {
      return tryPhp(urls, payload);
    }
  }

  document
    .querySelectorAll('form.php-email-form[data-contact-handler]')
    .forEach(function (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();

        if (!isHttpPage()) {
          displayError(
            form,
            'Open this site over http(s) (e.g. npx serve, php -S localhost:8080, or your live URL). The form cannot send from a file:// page.'
          );
          return;
        }

        var urls = endpoints();
        var override = form.getAttribute('data-contact-endpoint');
        var primary = override
          ? override.indexOf('http') === 0
            ? override
            : withBase(
                override.charAt(0) === '/' ? override : '/' + override
              )
          : null;

        var fd = new FormData(form);
        var payload = {
          name: (fd.get('name') || '').toString().trim(),
          email: (fd.get('email') || '').toString().trim(),
          subject: (fd.get('subject') || '').toString().trim(),
          message: (fd.get('message') || '').toString().trim(),
        };

        var sent = form.querySelector('.sent-message');
        if (sent) {
          sent.textContent = 'Your message has been sent. Thank you!';
        }

        showState(form, 'loading');

        sendContact(primary, urls, payload)
          .then(function (result) {
            if (result.ok && result.text === 'OK') {
              showState(form, 'sent');
              form.reset();
            } else {
              displayError(
                form,
                readableError(result.text, result.status) ||
                  'Send failed (' + result.status + ').'
              );
            }
          })
          .catch(function () {
            displayError(
              form,
              'Could not reach the server. Check your connection, or confirm /api/contact and /forms/contact.php are deployed.'
            );
          });
      });
    });
})();
