import { test, expect } from '@playwright/test'

test.describe('Authentication flows', () => {
  test('login page loads with email/password form and SSO toggle', async ({ page }) => {
    await page.goto('/login')

    // Page heading
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible()

    // Email input is always visible
    await expect(page.getByLabel('Email address')).toBeVisible()

    // Password field visible in default "Email & Password" tab
    await expect(page.getByLabel('Password')).toBeVisible()

    // Sign in button
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()

    // SSO toggle tab exists
    await expect(page.getByRole('button', { name: 'Single Sign-On' })).toBeVisible()

    // Link to register
    await expect(page.getByRole('link', { name: 'Create one here' })).toBeVisible()
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel('Email address').fill('fake@nonexistent.com')
    await page.getByLabel('Password').fill('wrongpassword123')
    await page.getByRole('button', { name: 'Sign in' }).click()

    // Wait for error message to appear
    const errorBanner = page.locator('.bg-red-50')
    await expect(errorBanner).toBeVisible({ timeout: 10_000 })
  })

  test('registration page loads with role selection and privacy/terms consent', async ({ page }) => {
    await page.goto('/register')

    // Page heading
    await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible()

    // Role selector options
    await expect(page.getByText('Parent / Practitioner')).toBeVisible()
    await expect(page.getByText('Careers Professional')).toBeVisible()

    // Form fields
    await expect(page.getByLabel('Full name')).toBeVisible()
    await expect(page.getByLabel('Email address')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByLabel('Confirm password')).toBeVisible()

    // Privacy/terms consent checkbox text
    await expect(page.getByText('I have read and agree to the')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Privacy Policy' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Terms of Service' })).toBeVisible()

    // Submit button
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible()
  })

  test('registration with mismatched passwords shows error', async ({ page }) => {
    await page.goto('/register')

    await page.getByLabel('Full name').fill('Test User')
    await page.getByLabel('Email address').fill('test@example.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByLabel('Confirm password').fill('differentpassword')

    // Check the privacy consent checkbox
    await page.getByText('I have read and agree to the').click()

    await page.getByRole('button', { name: 'Create account' }).click()

    // Error message about mismatched passwords
    await expect(page.getByText('Passwords do not match')).toBeVisible({ timeout: 5_000 })
  })

  test('registration without privacy consent shows error', async ({ page }) => {
    await page.goto('/register')

    await page.getByLabel('Full name').fill('Test User')
    await page.getByLabel('Email address').fill('test@example.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByLabel('Confirm password').fill('password123')

    // Do NOT check the privacy consent checkbox
    await page.getByRole('button', { name: 'Create account' }).click()

    // Error message about privacy consent
    await expect(page.getByText('You must agree to the privacy policy')).toBeVisible({ timeout: 5_000 })
  })

  test('forgot-password page loads', async ({ page }) => {
    await page.goto('/forgot-password')

    await expect(page.getByRole('heading', { name: 'Forgot your password?' })).toBeVisible()
    await expect(page.getByLabel('Email address')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send reset link' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to sign in' })).toBeVisible()
  })

  test('/terms page loads and has content', async ({ page }) => {
    await page.goto('/terms')

    await expect(page.getByRole('heading', { name: 'Terms of Service', level: 1 })).toBeVisible()
    await expect(page.getByText('Last updated')).toBeVisible()
    await expect(page.getByRole('heading', { name: '1. Eligibility' })).toBeVisible()
  })

  test('/privacy page loads and has content', async ({ page }) => {
    await page.goto('/privacy')

    await expect(page.getByRole('heading', { name: 'Privacy Policy', level: 1 })).toBeVisible()
    await expect(page.getByText('Last updated')).toBeVisible()
    await expect(page.getByText('What data we collect')).toBeVisible()
  })

  test('unauthenticated user is redirected to /login when visiting /dashboard', async ({ page }) => {
    await page.goto('/dashboard')

    // Should be redirected to login
    await page.waitForURL('**/login**', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })
})
