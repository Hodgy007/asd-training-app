import { test, expect } from '@playwright/test'

test.describe('Navigation guards — unauthenticated redirects', () => {
  test('/dashboard redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL('**/login**', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('/admin redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForURL('**/login**', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('/super-admin redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/super-admin')
    await page.waitForURL('**/login**', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('/settings redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForURL('**/login**', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('/children redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/children')
    await page.waitForURL('**/login**', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })
})
