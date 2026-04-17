import { describe, it, expect } from 'vitest'
import { renderPasswordInviteEmail, renderSsoInviteEmail } from '../email-templates/invite'

describe('renderPasswordInviteEmail', () => {
  it('embeds the activation URL and user name in HTML + text', () => {
    const { subject, html, text } = renderPasswordInviteEmail({
      name: 'Alex',
      activationUrl: 'https://example.com/reset-password?token=abc123',
    })
    expect(subject).toBe("You've been invited to Ambitious about Autism Training")
    expect(html).toContain('Alex')
    expect(html).toContain('https://example.com/reset-password?token=abc123')
    expect(html).toContain('Set my password')
    expect(text).toContain('Alex')
    expect(text).toContain('https://example.com/reset-password?token=abc123')
  })

  it('falls back to "there" when name is null', () => {
    const { html } = renderPasswordInviteEmail({ name: null, activationUrl: 'https://x.test/t' })
    expect(html).toContain('Hi there')
  })
})

describe('renderSsoInviteEmail', () => {
  it('has no activation link and points to the login page', () => {
    const { subject, html, text } = renderSsoInviteEmail({
      name: 'Alex',
      loginUrl: 'https://example.com/login',
    })
    expect(subject).toBe("You've been invited to Ambitious about Autism Training")
    expect(html).toContain('https://example.com/login')
    expect(html).toContain('work account')
    expect(html).not.toContain('Set my password')
    expect(text).toContain('https://example.com/login')
  })
})
