import { test, expect } from '@playwright/test'

// Seeded users (see prisma/seed.ts):
//  - demo@example.com / demo123              (EMPLOYEE — leaf role)
//  - admin@asdawareness.org.uk / admin123    (SUPER_ADMIN — Charity Admin)
//
// Prerequisites for this test:
//  1. `npm run prisma:seed` against the dev DB so the two users above exist.
//  2. Dev server has the latest Prisma client (regenerate after schema changes).
//  3. Either set up TOTP for the seeded admin OR run the dev server with
//     DISABLE_MFA=true — middleware redirects admins without TOTP to /mfa-setup
//     and blocks the inbox routes, which would skip the second half of this test.
//
// Run with: `npm run test:e2e -- feedback.spec.ts`. Add `--headed --debug`
// for interactive inspection.

test.describe('Feedback', () => {
  test('learner submits → admin sees in inbox + resolves', async ({ page, browser }) => {
    // 1) Demo learner logs in (avoids the SUPER_ADMIN MFA-setup gate
    //    that blocks POST /api/feedback when TOTP isn't configured)
    await page.goto('/login')
    await page.getByRole('button', { name: /email & password/i }).click()
    await page.getByRole('textbox', { name: /email/i }).fill('demo@example.com')
    await page.getByRole('textbox', { name: /^password$/i }).fill('demo123')
    await page.getByRole('button', { name: /^sign in$/i }).click()
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 })

    // 2) Open the Feedback modal from the topbar
    await page.getByRole('button', { name: /send feedback/i }).click()

    // 3) Pick "Bug" (already pre-selected, but assert it's selectable) and submit
    await page.getByRole('button', { name: 'Bug' }).click()
    await page
      .getByLabel(/what's on your mind/i)
      .fill('E2E test — quiz button not clickable on the demo iOS page')
    await page.getByRole('button', { name: /^send$/i }).click()

    // Modal closes after the 1.5s toast — wait for the textarea to disappear.
    // (The toast itself is too transient to catch reliably.)
    await expect(page.getByLabel(/what's on your mind/i)).toBeHidden({ timeout: 5000 })

    // 4) Switch to admin context (separate cookies). Admin will hit the
    //    /mfa-setup wall before reaching the inbox unless MFA is set up
    //    or DISABLE_MFA=true. Skip the rest of the flow if we get bounced.
    const adminContext = await browser.newContext()
    const adminPage = await adminContext.newPage()
    await adminPage.goto('/login')
    await adminPage.getByRole('button', { name: /email & password/i }).click()
    await adminPage.getByRole('textbox', { name: /email/i }).fill('admin@asdawareness.org.uk')
    await adminPage.getByRole('textbox', { name: /^password$/i }).fill('admin123')
    await adminPage.getByRole('button', { name: /^sign in$/i }).click()

    await adminPage.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 })
    if (adminPage.url().includes('/mfa-setup')) {
      test.skip(true, 'Admin user needs TOTP set up (or DISABLE_MFA=true) to reach inbox.')
    }

    await adminPage.goto('/super-admin/feedback')

    // 5) Confirm the entry exists, click into it
    const messageRow = adminPage.getByText('E2E test — quiz button not clickable on the demo iOS page')
    await expect(messageRow).toBeVisible({ timeout: 10000 })
    await messageRow.click()

    // 6) Mark RESOLVED and Save
    await adminPage.getByLabel(/^status$/i).selectOption('RESOLVED')
    await adminPage.getByRole('button', { name: /^save$/i }).click()
    await expect(adminPage.getByText(/resolved by/i)).toBeVisible({ timeout: 10000 })

    await adminContext.close()
  })
})
