/**
 * Shared HTML wrapper for all transactional emails.
 *
 * The header pulls the Ambitious about Autism logo from /logo-aaa.png via an
 * absolute URL — required because email clients can't resolve relative paths.
 * PNG is used (not SVG) because new Outlook on Windows and older Outlook
 * desktop both strip <img src="…svg">. The PNG is regenerated from
 * public/logo-aaa.svg by scripts/render-logo-png.mjs whenever the source SVG
 * changes.
 */

const PUBLIC_LOGO_URL = 'https://asd-training-app-v2.vercel.app/logo-aaa.png'

/**
 * Resolve the logo URL at send-time (not at module load), so:
 * - Local dev / one-off scripts still embed a reachable image.
 * - Tests that override NEXTAUTH_URL after import still see the new value.
 * - Localhost values are rejected — inboxes can't reach them — and we fall
 *   back to the canonical prod URL for the logo asset specifically.
 */
function resolveLogoUrl(): string {
  const base = process.env.NEXTAUTH_URL
  if (!base || base.includes('localhost') || base.includes('127.0.0.1')) {
    return PUBLIC_LOGO_URL
  }
  return `${base.replace(/\/$/, '')}/logo-aaa.png`
}

export interface WrapEmailOptions {
  /** Plain-text alternative to put after the body content if you have one. */
  hideFooter?: boolean
}

export function wrapEmailHtml(innerHtml: string, options: WrapEmailOptions = {}): string {
  const logoUrl = resolveLogoUrl()
  const footer = options.hideFooter
    ? ''
    : `<p class="smallprint">Ambitious about Autism &mdash; Not a diagnostic tool</p>`
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Ambitious about Autism</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; background: #f3f2ef; color: #1d2226; }
  .wrap { max-width: 560px; margin: 0 auto; padding: 24px; }
  .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .header { background: #ffffff; padding: 20px 24px 16px; border-bottom: 1px solid #e5e7eb; text-align: center; }
  .header img { max-width: 220px; width: 100%; height: auto; display: inline-block; }
  .body { padding: 24px; line-height: 1.5; color: #1d2226; }
  .btn { display: inline-block; background: #f5821f; color: #ffffff; padding: 12px 24px; border-radius: 24px; text-decoration: none; font-weight: bold; margin-top: 12px; }
  .footer { color: #64748b; font-size: 12px; margin-top: 24px; }
  .smallprint { color: #9ca3af; font-size: 12px; text-align: center; padding: 12px 24px 0; }
  table { border-collapse: collapse; }
  pre { white-space: pre-wrap; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="header">
        <img src="${logoUrl}" alt="Ambitious about Autism" width="220" />
      </div>
      <div class="body">
${innerHtml}
      </div>
    </div>
    ${footer}
  </div>
</body>
</html>`
}
