<?php
/**
 * This project uses a static-friendly contact flow (see assets/js/contact-form.js).
 * PHP is not required on hosts like Vercel. Do not put SMTP passwords in this file.
 *
 * If you deploy on PHP hosting and want a server-side form again, use environment
 * variables for credentials and a maintained mail library—never commit secrets.
 */
header('Content-Type: text/plain; charset=utf-8', true, 410);
echo 'Disabled: use the contact form on the site (handled in the browser).';
