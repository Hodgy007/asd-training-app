interface RenderResult {
  subject: string
  html: string
  text: string
}

const SUBJECT = "You've been invited to Ambitious about Autism Training"

function wrap(innerHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; background: #f3f2ef; color: #1d2226; }
  .wrap { max-width: 560px; margin: 0 auto; padding: 24px; }
  .card { background: #fff; border-radius: 12px; padding: 0; overflow: hidden; }
  .header { background: #f5821f; padding: 20px 24px; color: #fff; font-weight: bold; font-size: 18px; }
  .body { padding: 24px; line-height: 1.5; }
  .btn { display: inline-block; background: #f5821f; color: #fff; padding: 12px 24px; border-radius: 24px; text-decoration: none; font-weight: bold; margin-top: 12px; }
  .footer { color: #64748b; font-size: 12px; margin-top: 24px; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="header">Ambitious about Autism</div>
      <div class="body">
        ${innerHtml}
      </div>
    </div>
  </div>
</body>
</html>`
}

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

  return { subject: SUBJECT, html: wrap(innerHtml), text }
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

  return { subject: SUBJECT, html: wrap(innerHtml), text }
}
