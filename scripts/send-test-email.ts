/**
 * One-off: send a representative branded email to verify the AAA logo header
 * renders end-to-end. Run with:
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/send-test-email.ts
 * or:
 *   npx tsx scripts/send-test-email.ts your.email@example.com
 *
 * Overrides NEXTAUTH_URL to the deployed app URL so the absolute logo link
 * resolves from any email client (localhost would 404 from Gmail/Outlook).
 */

// Force the public URL so the logo image is reachable from any inbox.
process.env.NEXTAUTH_URL = 'https://asd-training-app-v2.vercel.app'

import { Resend } from 'resend'
import { wrapEmailHtml } from '../lib/email-templates/layout'

const recipient = process.argv[2] ?? 'sirhodgson@gmail.com'

if (!process.env.RESEND_API_KEY) {
  console.error('RESEND_API_KEY missing — set it in .env.local first.')
  process.exit(1)
}

const tempPassword = 'demoPass-Aa9'
const loginUrl = `${process.env.NEXTAUTH_URL}/login?email=${encodeURIComponent(recipient)}`

const innerHtml = `
  <h2 style="color: #f5821f; margin-top: 0;">Test email &mdash; logo verification</h2>
  <p>Hi Simon,</p>
  <p>This is a representative branded email exercising every shared component
     so you can confirm the layout in your inbox:</p>
  <ul>
    <li><strong>Header:</strong> Ambitious about Autism logo above this text</li>
    <li><strong>Email:</strong> ${recipient}</li>
    <li><strong>Temporary password:</strong> <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">${tempPassword}</code></li>
  </ul>
  <p><a class="btn" href="${loginUrl}">Sign in</a></p>
  <p class="footer">If the logo doesn't render, your client likely strips SVGs (older Outlook desktop). Everything else should look identical to a real welcome email.</p>
`

const resend = new Resend(process.env.RESEND_API_KEY)

resend.emails
  .send({
    from: 'Ambitious About Autism <onboarding@resend.dev>',
    to: recipient,
    subject: '[TEST] AAA email branding verification',
    html: wrapEmailHtml(innerHtml),
  })
  .then((res) => {
    if (res.error) {
      console.error('Resend rejected the send:', res.error)
      process.exit(1)
    }
    console.log(`Sent. Resend id: ${res.data?.id}`)
    console.log(`Recipient: ${recipient}`)
  })
  .catch((err) => {
    console.error('Send failed:', err)
    process.exit(1)
  })
