import { test, expect } from '@playwright/test'

// Seeded users (see prisma/seed.ts):
//  - demo@example.com / demo123              (EMPLOYEE — leaf role)
//  - admin@asdawareness.org.uk / admin123    (SUPER_ADMIN — Charity Admin)
//
// Prerequisites:
//  1. `npm run prisma:seed` against the dev DB so the two users above exist.
//  2. Dev server has the latest Prisma client (regenerate after schema changes).

test.describe('Feedback', () => {
  test('admin submits → sees in inbox → resolves', async ({ page }) => {
    // 1) Admin logs in (also has access to the Feedback button via Topbar)
    await page.goto('/login')
    await page.getByRole('button', { name: /email & password/i }).click()
    await page.getByRole('textbox', { name: /email/i }).fill('admin@asdawareness.org.uk')
    await page.getByRole('textbox', { name: /^password$/i }).fill('admin123')
    await page.getByRole('button', { name: /^sign in$/i }).click()
    await expect(page).toHaveURL(/\/super-admin/, { timeout: 15000 })

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

    // 4) Navigate to the inbox in the same session (admin can see their own feedback)
    await page.goto('/super-admin/feedback')

    // 5) Confirm the entry exists, click into it
    const messageRow = page.getByText('E2E test — quiz button not clickable on the demo iOS page')
    await expect(messageRow).toBeVisible({ timeout: 10000 })
    await messageRow.click()

    // 6) Mark RESOLVED and Save
    await page.getByLabel(/^status$/i).selectOption('RESOLVED')
    await page.getByRole('button', { name: /^save$/i }).click()
    await expect(page.getByText(/resolved by/i)).toBeVisible({ timeout: 10000 })
  })
})
