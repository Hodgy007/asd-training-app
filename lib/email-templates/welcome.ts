import { wrapEmailHtml, escapeHtml } from './layout'

interface RenderResult {
  subject: string
  html: string
  text: string
}

const SUBJECT = 'Welcome to Ambitious about Autism — finish setting up your account'

/**
 * Sent on self-registration when the user signed up without choosing a
 * password. The link drops them on /welcome where they pick a password
 * and get signed in immediately.
 */
export function renderWelcomeSetPasswordEmail(params: {
  name: string | null
  welcomeUrl: string
  organisationName?: string | null
}): RenderResult {
  const plainGreeting = params.name ? `Hi ${params.name},` : 'Hi there,'
  const htmlGreeting = params.name ? `Hi ${escapeHtml(params.name)},` : 'Hi there,'
  const orgLine = params.organisationName
    ? `<p>You're joining <strong>${escapeHtml(params.organisationName)}</strong> on the Ambitious about Autism training portal.</p>`
    : `<p>Thanks for signing up to the Ambitious about Autism training portal.</p>`
  const plainOrgLine = params.organisationName
    ? `You're joining ${params.organisationName} on the Ambitious about Autism training portal.`
    : 'Thanks for signing up to the Ambitious about Autism training portal.'

  const innerHtml = `
    <h2 style="color: #f5821f; margin-top: 0;">Welcome${params.name ? ` ${escapeHtml(params.name.split(' ')[0]!)}` : ''}</h2>
    <p>${htmlGreeting}</p>
    ${orgLine}
    <p>Click below to choose a password and sign in.</p>
    <p><a class="btn" href="${params.welcomeUrl}">Set my password &amp; sign in</a></p>
    <p class="footer">This link expires in 24 hours. If you didn't sign up, you can ignore this email — no account will be created.</p>
  `

  const text = [
    plainGreeting,
    '',
    plainOrgLine,
    '',
    'Click here to choose a password and sign in:',
    params.welcomeUrl,
    '',
    "This link expires in 24 hours. If you didn't sign up, you can ignore this email.",
  ].join('\n')

  return { subject: SUBJECT, html: wrapEmailHtml(innerHtml), text }
}
