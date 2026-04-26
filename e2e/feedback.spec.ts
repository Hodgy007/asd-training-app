import { test, expect } from '@playwright/test'

// Seeded users (see prisma/seed.ts):
//  - demo@example.com / demo123              (EMPLOYEE — leaf role)
//  - admin@asdawareness.org.uk / admin123    (SUPER_ADMIN — Charity Admin)
//
// Prerequisites:
//  1. `npm run prisma:seed` against the dev DB so the two users above exist.
//  2. Dev server has the latest Prisma client (regenerate after schema changes).
//  3. Run dev server with DISABLE_MFA=true — middleware redirects admins without
//     TOTP to /mfa-setup and blocks the inbox + API routes. With DISABLE_MFA
//     the admin can reach /super-admin/feedback in this test.
//
// Run with: `DISABLE_MFA=true npm run test:e2e -- feedback.spec.ts`

test.describe('Feedback', () => {
  test('learner submits → admin sees in inbox + resolves', async ({ page, browser }) => {
    // 1) Demo learner logs in. Use exact-string label locators (the existing
    // auth.spec.ts establishes that pattern works in this repo).
    await page.goto('/login')
    await page.getByLabel('Email address').fill('demo@example.com')
    await page.getByRole('textbox', { name: 'Password' }).fill('demo123')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.waitForURL((url) => url.pathname === '/dashboard', { timeout: 30_000 })

    // 2) Open the Feedback modal from the topbar
    await page.getByRole('button', { name: 'Send feedback' }).click()

    // 3) Bug is already pre-selected; fill message and submit
    await page.getByRole('button', { name: 'Bug' }).click()
    await page
      .getByLabel("What's on your mind?")
      .fill('E2E test — quiz button not clickable on the demo iOS page')
    await page.getByRole('button', { name: 'Send' }).click()

    // Modal closes after the 1.5s toast — wait for the textarea to disappear.
    // (The toast text itself is too transient to catch reliably.)
    await expect(page.getByLabel("What's on your mind?")).toBeHidden({ timeout: 10_000 })

    // 4) Switch to admin context (separate cookies). Admin needs DISABLE_MFA=true
    //    on the dev server, otherwise middleware bounces to /mfa-setup.
    const adminContext = await browser.newContext()
    const adminPage = await adminContext.newPage()
    await adminPage.goto('/login')
    await adminPage.getByLabel('Email address').fill('admin@asdawareness.org.uk')
    await adminPage.getByRole('textbox', { name: 'Password' }).fill('admin123')
    await adminPage.getByRole('button', { name: 'Sign in', exact: true }).click()

    await adminPage.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 })
    if (adminPage.url().includes('/mfa-setup')) {
      test.skip(true, 'Admin user needs TOTP set up (or DISABLE_MFA=true) to reach inbox.')
    }

    await adminPage.goto('/super-admin/feedback')

    // 5) Confirm the entry exists, click into it
    const messageRow = adminPage.getByText(
      'E2E test — quiz button not clickable on the demo iOS page',
    )
    await expect(messageRow).toBeVisible({ timeout: 10_000 })
    await messageRow.click()

    // 6) Mark RESOLVED and Save
    await adminPage.getByLabel('Status').selectOption('RESOLVED')
    await adminPage.getByRole('button', { name: 'Save' }).click()
    await expect(adminPage.getByText(/resolved by/i)).toBeVisible({ timeout: 10_000 })

    await adminContext.close()
  })
})
