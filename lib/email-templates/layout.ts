/**
 * Shared HTML wrapper for all transactional emails.
 *
 * The header pulls the Ambitious about Autism logo from /logo-aaa.svg via an
 * absolute URL — required because email clients can't resolve relative paths.
 * Apple Mail, Gmail (web/iOS/Android), Outlook 365 web all render SVG; older
 * Outlook desktop falls back to the alt text. If we ever ship a PNG fallback,
 * point LOGO_URL at it without changing call sites.
 */

const BASE_URL = process.env.NEXTAUTH_URL ?? 'https://asd-training-app-v2.vercel.app'
const LOGO_URL = `${BASE_URL}/logo-aaa.svg`

export interface WrapEmailOptions {
  /** Plain-text alternative to put after the body content if you have one. */
  hideFooter?: boolean
}

export function wrapEmailHtml(innerHtml: string, options: WrapEmailOptions = {}): string {
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
        <img src="${LOGO_URL}" alt="Ambitious about Autism" width="220" />
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
