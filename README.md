# ePortfolio

## Contact form (405 / “Not Allowed”)

That response usually means **POST never reached** the Node mail function—typical on **pure static** hosting or when **Vercel “Output Directory”** points at a folder that **does not include** the repo root (so `api/contact.js` is never deployed).

**Vercel**

- Project → Settings → **General** → leave **Output Directory empty** (or the whole project root), so `api/` is part of the deployment.
- Settings → **Environment Variables**: `GMAIL_USER`, `GMAIL_APP_PASSWORD` (and optional `CONTACT_TO`).
- Redeploy.

**PHP hosting (Apache/cPanel, etc.)**

- From the project root run: `composer install`
- Copy `forms/mail.config.example.php` → `forms/mail.config.php` and add your Gmail + app password (do not commit `mail.config.php`).
- The browser tries `/api/contact` first, then **automatically retries** `forms/contact.php` if the API returns 404/405.