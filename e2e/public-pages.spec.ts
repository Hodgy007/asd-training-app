import { test, expect } from '@playwright/test'

test.describe('Public page accessibility', () => {
  test('login page renders at desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible()
    await expect(page.getByText('Ambitious about')).toBeVisible()
    await expect(page.getByText('Training & Observation Platform')).toBeVisible()
  })

  test('login page renders at mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible()
    await expect(page.getByText('Ambitious about')).toBeVisible()
  })

  test('SSO toggle switches between email/password and SSO views', async ({ page }) => {
    await page.goto('/login')

    // Default state: Email & Password tab is active, password field visible
    await expect(page.getByLabel('Password')).toBeVisible()

    // Click "Single Sign-On" tab
    await page.getByRole('button', { name: 'Single Sign-On' }).click()

    // Password field should be hidden, SSO content should be visible
    await expect(page.getByLabel('Password')).not.toBeVisible()
    await expect(page.getByText(/Sign in using your/)).toBeVisible()

    // Switch back to "Email & Password"
    await page.getByRole('button', { name: 'Email & Password' }).click()

    // Password field should be visible again
    await expect(page.getByLabel('Password')).toBeVisible()
  })

  test('cookie consent banner appears on first visit', async ({ page }) => {
    // Clear localStorage to simulate first visit
    await page.goto('/login')
    await page.evaluate(() => localStorage.removeItem('cookie-consent-accepted'))
    await page.reload()

    // Cookie consent banner should be visible
    const banner = page.getByRole('banner', { name: 'Cookie consent' })
    await expect(banner).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('This site uses essential cookies')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Accept' })).toBeVisible()
  })

  test('cookie consent banner disappears after accepting', async ({ page }) => {
    // Clear localStorage to simulate first visit
    await page.goto('/login')
    await page.evaluate(() => localStorage.removeItem('cookie-consent-accepted'))
    await page.reload()

    // Wait for banner to appear
    const banner = page.getByRole('banner', { name: 'Cookie consent' })
    await expect(banner).toBeVisible({ timeout: 5_000 })

    // Click accept
    await page.getByRole('button', { name: 'Accept' }).click()

    // Banner should disappear
    await expect(banner).not.toBeVisible()

    // Verify localStorage was set
    const consent = await page.evaluate(() => localStorage.getItem('cookie-consent-accepted'))
    expect(consent).toBe('true')
  })

  test('privacy page renders content', async ({ page }) => {
    await page.goto('/privacy')

    await expect(page.getByRole('heading', { name: 'Privacy Policy', level: 1 })).toBeVisible()
    await expect(page.getByText('UK General Data Protection Regulation')).toBeVisible()
    await expect(page.getByText('What data we collect')).toBeVisible()
  })

  test('terms page renders content', async ({ page }) => {
    await page.goto('/terms')

    await expect(page.getByRole('heading', { name: 'Terms of Service', level: 1 })).toBeVisible()
    await expect(page.getByText('Ambitious About Autism')).toBeVisible()
    await expect(page.getByText('1. Eligibility')).toBeVisible()
  })
})
