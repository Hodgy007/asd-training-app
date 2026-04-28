import { wrapEmailHtml } from './layout'

interface RenderResult {
  subject: string
  html: string
  text: string
}

const SUBJECT = "You've been invited to Ambitious about Autism Training"

export function renderPasswordInviteEmail(params: {
  name: string | null
  activationUrl: string
}): RenderResult {
  const greeting = params.name ? `Hi ${params.name},` : 'Hi there,'
  const innerHtml = `
    <p>${greeting}</p>
    <p>An admin at Ambitious about Autism has invited you to access the training portal.</p>
    <p><a class="btn" href="${params.activationUrl}">Set my password</a></p>
    <p class="footer">If you weren't expecting this invite, you can ignore this email. This link expires in 7 days.</p>
  `
  const text = [
    greeting,
    '',
    'An admin at Ambitious about Autism has invited you to access the training portal.',
    '',
    'Set your password here:',
    params.activationUrl,
    '',
    "If you weren't expecting this invite, you can ignore this email. This link expires in 7 days.",
  ].join('\n')

  return { subject: SUBJECT, html: wrapEmailHtml(innerHtml), text }
}

export function renderSsoInviteEmail(params: {
  name: string | null
  loginUrl: string
}): RenderResult {
  const greeting = params.name ? `Hi ${params.name},` : 'Hi there,'
  const innerHtml = `
    <p>${greeting}</p>
    <p>You've been invited to Ambitious about Autism Training. Sign in using your work account to get started.</p>
    <p><a class="btn" href="${params.loginUrl}">Sign in</a></p>
    <p class="footer">If you weren't expecting this invite, you can ignore this email.</p>
  `
  const text = [
    greeting,
    '',
    "You've been invited to Ambitious about Autism Training.",
    'Sign in using your work account to get started:',
    params.loginUrl,
    '',
    "If you weren't expecting this invite, you can ignore this email.",
  ].join('\n')

  return { subject: SUBJECT, html: wrapEmailHtml(innerHtml), text }
}
