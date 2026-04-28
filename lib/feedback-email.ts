import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'
import { wrapEmailHtml } from '@/lib/email-templates/layout'

export interface FeedbackEmailInput {
  id: string
  type: 'BUG' | 'SUGGESTION' | 'QUESTION' | 'OTHER'
  message: string
  url: string
  userAgent: string
  viewport: string
  clientLogs: Array<{ level: string; message: string; ts: number; source?: string }> | null
  createdAt: Date
  user: { name: string | null; email: string; role: string }
  organisation: { name: string } | null
}

const TYPE_LABEL: Record<FeedbackEmailInput['type'], string> = {
  BUG: 'Bug',
  SUGGESTION: 'Suggestion',
  QUESTION: 'Question',
  OTHER: 'Other',
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatLogLine(entry: { level: string; message: string; ts: number; source?: string }): string {
  const time = new Date(entry.ts).toISOString().slice(11, 19)
  const src = entry.source ? `  (${entry.source})` : ''
  return `[${time}] ${entry.level.padEnd(5)} ${entry.message}${src}`
}

export function buildFeedbackEmail(submission: FeedbackEmailInput, baseUrl: string) {
  const typeLabel = TYPE_LABEL[submission.type]
  const preview = submission.message.length > 60
    ? submission.message.slice(0, 60) + '…'
    : submission.message
  const subject = `[Feedback - ${typeLabel}] ${preview}`

  const logs = submission.clientLogs ?? []
  const logsText = logs.map(formatLogLine).join('\n')
  const logsHtml = logs.map((l) => escapeHtml(formatLogLine(l))).join('\n')

  const adminLink = `${baseUrl}/super-admin/feedback/${submission.id}`
  const orgName = submission.organisation?.name ?? '(no org)'
  const submitterName = submission.user.name ?? '(unnamed)'

  const innerHtml = `
    <h2 style="color: #f5821f; margin-bottom: 4px; margin-top: 0;">${escapeHtml(typeLabel)} feedback</h2>
    <p style="color: #6b7280; margin-top: 0;">Submitted ${escapeHtml(submission.createdAt.toISOString())}</p>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
      <tr><td style="padding: 4px 8px; color:#6b7280;">From</td><td style="padding: 4px 8px;">${escapeHtml(submitterName)} &lt;${escapeHtml(submission.user.email)}&gt;</td></tr>
      <tr><td style="padding: 4px 8px; color:#6b7280;">Role</td><td style="padding: 4px 8px;">${escapeHtml(submission.user.role)}</td></tr>
      <tr><td style="padding: 4px 8px; color:#6b7280;">Organisation</td><td style="padding: 4px 8px;">${escapeHtml(orgName)}</td></tr>
      <tr><td style="padding: 4px 8px; color:#6b7280;">Page</td><td style="padding: 4px 8px;"><a href="${escapeHtml(submission.url)}">${escapeHtml(submission.url)}</a></td></tr>
      <tr><td style="padding: 4px 8px; color:#6b7280;">Viewport</td><td style="padding: 4px 8px;">${escapeHtml(submission.viewport)}</td></tr>
      <tr><td style="padding: 4px 8px; color:#6b7280;">User agent</td><td style="padding: 4px 8px; font-size: 12px; color: #6b7280;">${escapeHtml(submission.userAgent)}</td></tr>
    </table>

    <h3 style="margin-bottom: 4px;">Message</h3>
    <pre style="white-space: pre-wrap; background: #f9fafb; border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; font-family: inherit; margin-top: 0;">${escapeHtml(submission.message)}</pre>

    ${logs.length > 0 ? `
    <details style="margin-top: 16px;">
      <summary style="cursor: pointer; color: #6b7280;">Recent client logs (${logs.length})</summary>
      <pre style="white-space: pre-wrap; background: #f3f4f6; border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; font-size: 12px; font-family: monospace;">${logsHtml}</pre>
    </details>` : ''}

    <p style="margin-top: 24px;">
      <a class="btn" href="${escapeHtml(adminLink)}">View in admin</a>
    </p>
  `
  const html = wrapEmailHtml(innerHtml)

  const text = [
    `${typeLabel} feedback`,
    `Submitted ${submission.createdAt.toISOString()}`,
    '',
    `From: ${submitterName} <${submission.user.email}>`,
    `Role: ${submission.user.role}`,
    `Organisation: ${orgName}`,
    `Page: ${submission.url}`,
    `Viewport: ${submission.viewport}`,
    `User agent: ${submission.userAgent}`,
    '',
    'Message:',
    submission.message,
    '',
    logs.length > 0 ? '=== Recent client logs ===' : '',
    logsText,
    '',
    `View in admin: ${adminLink}`,
  ].join('\n')

  return { subject, html, text }
}

export async function sendFeedbackEmail(submission: FeedbackEmailInput): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set — feedback email not sent', { submissionId: submission.id })
    return
  }

  const recipients = await prisma.user.findMany({
    where: { role: 'SUPER_ADMIN', active: true },
    select: { email: true },
  })

  if (recipients.length === 0) {
    console.warn('No active SUPER_ADMIN users — feedback email not sent', { submissionId: submission.id })
    return
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'https://asd-training-app-v2.vercel.app'
  const { subject, html, text } = buildFeedbackEmail(submission, baseUrl)

  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: 'Ambitious About Autism <onboarding@resend.dev>',
    to: recipients.map((r) => r.email),
    subject,
    html,
    text,
  })
}
