# Bobby Domdom Jr — ePortfolio

A responsive Vue 3 portfolio built with Vite. The public site includes interactive project search and category filters, project details, a theme toggle, a printable résumé, a downloadable vCard, copy-email action, dynamic social metadata, structured data, and a contact form. `/admin` is a private, Supabase-backed content editor with sign-in, draft validation, publishing, and JSON backup/restore.

## Run locally

Requirements: Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

The public site runs at the local URL printed by Vite; open `/admin` for the editor. Without Supabase settings the public site shows its bundled starter content and the editor explains the one-time setup required.

Create a local `.env` from `.env.example` when connecting Supabase. Never put a Supabase `service_role` key or email password in frontend variables. `VITE_` settings are public to browser visitors.

## Project structure

- `src/App.vue` — public portfolio page, navigation, interaction, and content loading.
- `src/components/Admin.vue` — authenticated, section-based portfolio editor.
- `src/content.js` — starter portfolio content used when no published Supabase row is available.
- `src/lib/` — Supabase client, safe link/image handling, analytics, and content validation.
- `public/robots.txt` and `public/sitemap.xml` — crawler directives and the public portfolio sitemap.
- `src/style.css` — shared visual system, responsive layouts, and reduced-motion-aware animation.
- `api/contact.js` — server-side contact form handler; mail credentials stay in host environment variables.
- `supabase/migrations/` — database schema and row-level security policy.
- `assets/img/` — source images copied into `public/assets/img/` by `scripts/copy-assets.js` before development and production builds.
- `dist/` — generated Vite output; do not edit it by hand.

## Supabase content editor setup

1. Create a Supabase project. From **Project Settings → API**, copy the Project URL and publishable/anon key.
2. In **SQL Editor**, run [`supabase/migrations/20261009000000_portfolio_content.sql`](./supabase/migrations/20261009000000_portfolio_content.sql), then [`supabase/migrations/20261009010000_portfolio_image_storage.sql`](./supabase/migrations/20261009010000_portfolio_image_storage.sql). These configure protected portfolio publishing and a public image bucket where only signed-in portfolio admins can upload, change, or remove images.
3. In **Authentication → Providers / Sign-in**, turn off public email sign-ups. From **Authentication → Users**, create your own user with a strong password.
4. In **SQL Editor**, grant that user the admin claim, replacing the email with your sign-in email:

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
     || jsonb_build_object('role', 'admin')
   where email = 'you@example.com';
   ```

   Confirm the query updated exactly one row. Sign out and back in after changing a user's role so the refreshed access token contains the new claim.

5. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in local `.env` and in **Vercel → Project Settings → Environment Variables** for the deployment environments. Redeploy Vercel.
6. Visit `/admin` on the deployed site and sign in. The first publish creates the portfolio's single content row. Use **Download backup** before editing and keep the starter JSON structure intact.

The admin editor is organized into separate Profile, Social links, Experience, Education, Skills, Projects, Services, and Client reviews sections. Each section has a form for adding, editing, or removing entries; skill names and proficiency levels are edited separately. In the Profile and Client reviews sections, choose a JPG, PNG, WebP, or GIF image up to 5 MB to upload it directly to Supabase Storage. The editor shows a preview and fills in the image URL; publish changes to display the photo on the site. Only upload profile and client images you have permission to share, and confirm how each reviewer wants to be credited. Existing `/assets/img/...` paths remain supported. Reviews without a photo show the client's initials instead. The public Client reviews section is always visible, with an empty state until at least one review is published. Download/import backup still uses a JSON file. Database and image uploads are protected by Supabase policies; the browser never receives a service-role key.

## Vercel contact form

The contact form posts to [`api/contact.js`](./api/contact.js). Set `GMAIL_USER`, `GMAIL_APP_PASSWORD`, and optionally `CONTACT_TO` in Vercel environment settings. Use a freshly generated Gmail app password stored only in host secrets, and redeploy after changing settings.

**Important:** an earlier checked-in example contained a real-looking Gmail app password. It has been removed from the current source, but previous Git history may still contain it. Revoke that app password in Google Account security and issue a new one; removing it from the latest files does not erase Git history or old deployments.

## Build and deploy

```sh
npm run build
npm run preview
```

Vercel builds the Vite app into `dist/`; `vercel.json` routes `/admin` to the Vue app and retains the server-side contact function. The build copies the existing portfolio images into the generated public directory.

`vercel.json` sets basic browser security headers. The robots file and sitemap currently use `https://e-portfolio-ochre-sigma.vercel.app/`; update those URLs and the canonical link in `index.html` if you deploy to a different primary domain. The page title, social previews, and Person structured data are also updated from the published portfolio profile.

Before deploying, apply the Supabase migration, configure the required Vercel environment variables, and run `npm test` and `npm run build`. Deploy a preview first, then verify the public page, `/admin` sign-in, content publishing, and `/api/contact` with valid server mail settings. The contact form responds with an explicit setup error until `GMAIL_USER` and `GMAIL_APP_PASSWORD` are configured. A successful local build does not deploy the site; push the changes and confirm the Vercel deployment succeeds.

## Visitor analytics and professional outreach

1. In the Vercel dashboard, open this project and choose **Analytics → Enable**.
2. Redeploy the site. Web Analytics records aggregate page views, visits, referrers, and popular pages; open **Analytics** in Vercel later to review the results.
3. The portfolio also sends interaction events for opened projects, résumé requests, contact clicks, and successful contact submissions. Events contain no form contents, names, or email addresses. Custom events require Vercel Pro or Enterprise and can be reviewed in the Web Analytics dashboard. The admin editor itself is excluded from analytics.
4. To present your work to a specific hiring leader, share the public portfolio or your LinkedIn profile directly. Analytics can show overall traffic and engagement; it cannot reveal that a particular person or CEO viewed the page. Use a direct conversation or a reply to confirm interest—do not rely on visitor-identification tools.

The portfolio is positioned for hiring leaders around dependable systems, responsible data practices, and user-focused digital delivery. Replace the illustrative project entries in the admin editor with real work samples, your contribution, the business context, and verified outcomes you are permitted to share. Each project supports optional `caseStudy.challenge`, `caseStudy.approach`, and `caseStudy.outcome` fields. Do not invent metrics or publish confidential employer information. **Save résumé as PDF** opens the browser print dialog; select **Save as PDF**.

## Security

See [`SECURITY.md`](./SECURITY.md) for vulnerability reporting guidance. Never commit `.env`, service keys, mail passwords, or `forms/mail.config.php`.
