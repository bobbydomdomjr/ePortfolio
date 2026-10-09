# Bobby Domdom Jr — ePortfolio

A responsive Vue 3 portfolio built with Vite. The public site includes interactive project search and category filters, project details, a theme toggle, a printable résumé, and a contact form. `/admin` is a private, Supabase-backed content editor with sign-in, draft validation, publishing, and JSON backup/restore.

## Run locally

Requirements: Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

The public site runs at the local URL printed by Vite; open `/admin` for the editor. Without Supabase settings the public site shows its bundled starter content and the editor explains the one-time setup required.

Create a local `.env` from `.env.example` when connecting Supabase. Never put a Supabase `service_role` key or email password in frontend variables. `VITE_` settings are public to browser visitors.

## Supabase content editor setup

1. Create a Supabase project. From **Project Settings → API**, copy the Project URL and publishable/anon key.
2. In **SQL Editor**, run [`supabase/migrations/20261009000000_portfolio_content.sql`](./supabase/migrations/20261009000000_portfolio_content.sql). It enables row-level security, allows public reads of the portfolio, and restricts writes to signed-in users with a server-managed `app_metadata.role = admin` claim.
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

The admin edits profile information, social links, project cards, skills, services, experience, and education as one validated JSON document. Add image files to `assets/img/` in the repository and redeploy to make them available; use their `/assets/img/...` paths in the editor. Database access is limited by Supabase row-level security; the browser never receives a service-role key.

## Vercel contact form

The contact form posts to [`api/contact.js`](./api/contact.js). Set `GMAIL_USER`, `GMAIL_APP_PASSWORD`, and optionally `CONTACT_TO` in Vercel environment settings. Use a freshly generated Gmail app password stored only in host secrets, and redeploy after changing settings.

**Important:** an earlier checked-in example contained a real-looking Gmail app password. It has been removed from the current source, but previous Git history may still contain it. Revoke that app password in Google Account security and issue a new one; removing it from the latest files does not erase Git history or old deployments.

## Build and deploy

```sh
npm run build
npm run preview
```

Vercel builds the Vite app into `dist/`; `vercel.json` routes `/admin` to the Vue app and retains the server-side contact function. The build copies the existing portfolio images into the generated public directory.

## Visitor analytics and professional outreach

1. In the Vercel dashboard, open this project and choose **Analytics → Enable**.
2. Redeploy the site. Web Analytics records aggregate page views, visits, referrers, and popular pages; open **Analytics** in Vercel later to review the results.
3. The portfolio also sends interaction events for opened projects, résumé requests, contact clicks, and successful contact submissions. Events contain no form contents, names, or email addresses. Custom events require Vercel Pro or Enterprise and can be reviewed in the Web Analytics dashboard. The admin editor itself is excluded from analytics.
4. To present your work to a specific hiring leader, share the public portfolio or your LinkedIn profile directly. Analytics can show overall traffic and engagement; it cannot reveal that a particular person or CEO viewed the page. Use a direct conversation or a reply to confirm interest—do not rely on visitor-identification tools.

The portfolio is positioned for hiring leaders around dependable systems, responsible data practices, and user-focused digital delivery. Replace the illustrative project entries in the admin editor with real work samples, your contribution, the business context, and verified outcomes you are permitted to share. Each project supports optional `caseStudy.challenge`, `caseStudy.approach`, and `caseStudy.outcome` fields. Do not invent metrics or publish confidential employer information. **Save résumé as PDF** opens the browser print dialog; select **Save as PDF**.

## Security

See [`SECURITY.md`](./SECURITY.md) for vulnerability reporting guidance. Never commit `.env`, service keys, mail passwords, or `forms/mail.config.php`.
