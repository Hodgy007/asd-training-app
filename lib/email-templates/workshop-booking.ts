import { wrapEmailHtml, escapeHtml } from './layout'

interface RenderResult {
  subject: string
  html: string
  text: string
}

/**
 * Sent when someone books a workshop on Eventbrite using an email that isn't
 * yet on the platform (and the AUTO_INVITE policy is on). Confirms the
 * booking, explains why we created an account, and links to /welcome to set a
 * password.
 *
 * The Eventbrite booking confirmation is a separate email sent by Eventbrite
 * itself — this is *additional*, not a replacement.
 */
export function renderWorkshopBookingWelcomeEmail(params: {
  name: string | null
  workshopName: string
  workshopDate: Date | null
  welcomeUrl: string
  ticketUrl: string
}): RenderResult {
  const subject = `Your booking for "${params.workshopName}" — set up your account`
  const greeting = params.name ? `Hi ${params.name.split(' ')[0]!},` : 'Hi there,'
  const greetingHtml = params.name ? `Hi ${escapeHtml(params.name.split(' ')[0]!)},` : 'Hi there,'

  const dateLine = params.workshopDate
    ? params.workshopDate.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  const innerHtml = `
    <h2 style="color: #f5821f; margin-top: 0;">Booking confirmed${params.name ? `, ${escapeHtml(params.name.split(' ')[0]!)}` : ''}</h2>
    <p>${greetingHtml}</p>
    <p>Thanks for booking <strong>${escapeHtml(params.workshopName)}</strong>${dateLine ? ` on <strong>${escapeHtml(dateLine)}</strong>` : ''} via Eventbrite.</p>
    <p>We&rsquo;ve set up an account for you on the Ambitious about Autism training platform so you can:</p>
    <ul style="line-height: 1.7;">
      <li>See your upcoming workshops and any past sessions in one place</li>
      <li>Access related training, resources and the public toolkit at any time</li>
      <li>Update your details and preferences</li>
    </ul>
    <p>Click below to choose a password and sign in.</p>
    <p><a class="btn" href="${params.welcomeUrl}">Set my password &amp; sign in</a></p>
    <p class="footer">This link expires in 24 hours. Your Eventbrite ticket is unaffected — you&rsquo;ll still receive the usual reminders from Eventbrite, and you don&rsquo;t need to set up an account to attend.</p>
  `

  const text = [
    greeting,
    '',
    `Thanks for booking "${params.workshopName}"${dateLine ? ` on ${dateLine}` : ''} via Eventbrite.`,
    '',
    "We've set up an account for you on the Ambitious about Autism training platform so you can see your upcoming workshops, access related training and resources, and manage your details.",
    '',
    'Click here to choose a password and sign in:',
    params.welcomeUrl,
    '',
    'This link expires in 24 hours.',
    '',
    `Your Eventbrite ticket: ${params.ticketUrl}`,
    '',
    "You don't need to set up an account to attend the workshop — you'll still receive the usual reminders from Eventbrite.",
  ].join('\n')

  return { subject, html: wrapEmailHtml(innerHtml), text }
}
