import { test, expect } from '@playwright/test'

// Seeded users (see prisma/seed.ts):
//  - demo@example.com / demo123              (EMPLOYEE — leaf role)
//  - admin@asdawareness.org.uk / admin123    (SUPER_ADMIN — Charity Admin)
//
// Prerequisites:
//  1. `npm run prisma:seed` against the dev DB so the two users above exist.
//  2. Dev server has the latest Prisma client (regenerate after schema changes).

test.describe('Feedback', () => {
  test('learner submits → super admin sees + resolves', async ({ page, browser }) => {
    // 1) Learner logs in
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
    await expect(page.getByText(/thanks — we got it/i)).toBeVisible()

    // 4) Sign out the learner so the admin context is clean
    await page.context().clearCookies()

    // 5) Super admin signs in (separate context — independent cookies)
    const adminContext = await browser.newContext()
    const adminPage = await adminContext.newPage()
    await adminPage.goto('/login')
    await adminPage.getByRole('button', { name: /email & password/i }).click()
    await adminPage.getByRole('textbox', { name: /email/i }).fill('admin@asdawareness.org.uk')
    await adminPage.getByRole('textbox', { name: /^password$/i }).fill('admin123')
    await adminPage.getByRole('button', { name: /^sign in$/i }).click()

    // 6) Navigate to inbox and confirm the entry exists
    await adminPage.goto('/super-admin/feedback')
    const messageRow = adminPage.getByText('E2E test — quiz button not clickable on the demo iOS page')
    await expect(messageRow).toBeVisible()
    await messageRow.click()

    // 7) Mark RESOLVED and Save
    await adminPage.getByLabel(/^status$/i).selectOption('RESOLVED')
    await adminPage.getByRole('button', { name: /^save$/i }).click()
    await expect(adminPage.getByText(/resolved by/i)).toBeVisible()

    await adminContext.close()
  })
})
