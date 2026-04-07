const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass) {
    return res.status(500).send('Mail is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in the host environment (e.g. Vercel → Settings → Environment Variables).');
  }

  let body = req.body;
  if (body == null) {
    return res.status(400).send('Empty body');
  }
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).send('Invalid JSON');
    }
  }

  const name = String(body.name || '').trim().slice(0, 200);
  const email = String(body.email || '').trim().slice(0, 320);
  const subject = String(body.subject || '').trim().slice(0, 200);
  const message = String(body.message || '').trim().slice(0, 10000);

  if (!name || !email || !subject || !message) {
    return res.status(400).send('All fields are required.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).send('Invalid email address.');
  }

  const pass = String(gmailPass).replace(/\s/g, '');
  const to = process.env.CONTACT_TO || gmailUser;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass },
  });

  try {
    await transporter.sendMail({
      from: `"ePortfolio contact" <${gmailUser}>`,
      to,
      replyTo: email,
      subject: `[ePortfolio] ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    });
    return res.status(200).send('OK');
  } catch (err) {
    console.error('contact mail error', err);
    return res.status(502).send('Could not send email. Check server logs and Gmail app password.');
  }
};
