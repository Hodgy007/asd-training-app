# Enterprise SSO (SAML) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-org SAML SSO with automatic email domain detection on the login page, IdP metadata parsing, and org admin configuration UI.

**Architecture:** New Prisma model (OrgSsoConfig) with SAML request generation and response validation in `lib/saml.ts`. Login page dynamically detects SSO orgs via email domain lookup. SAML callback creates a NextAuth-compatible JWT token manually. Org admin configures SSO via a settings page with metadata auto-parsing.

**Tech Stack:** Next.js 14, Prisma, xml2js, @xmldom/xmldom, xml-crypto, next-auth/jwt

---

## File Structure

### New Files
- `lib/saml.ts` — SAML request generation, response validation, metadata parsing
- `app/api/auth/sso-check/route.ts` — GET domain check (public)
- `app/api/auth/saml/login/route.ts` — POST initiate SAML login (public)
- `app/api/auth/saml/callback/route.ts` — POST receive SAML response (public)
- `app/api/admin/settings/sso/route.ts` — GET/PUT/DELETE org SSO config
- `app/api/admin/settings/sso/parse-metadata/route.ts` — POST parse IdP metadata
- `app/api/admin/settings/sso/test/route.ts` — POST generate test login URL
- `app/(org-admin)/admin/settings/sso/page.tsx` — Enterprise SSO settings page

### Modified Files
- `prisma/schema.prisma` — add OrgSsoConfig model + relation on Organisation
- `app/(auth)/login/page.tsx` — add email domain SSO detection + dynamic UI
- `components/layout/org-admin-sidebar.tsx` — add Enterprise SSO nav item
- `middleware.ts` — allow `/api/auth/saml/*` as public paths

---

### Task 1: Install Dependencies and Add Prisma Model

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install XML dependencies**

```bash
cd "C:/Users/Simon/OneDrive/Documents/asd-training-app"
npm install xml2js @xmldom/xmldom xml-crypto
npm install -D @types/xml2js
```

- [ ] **Step 2: Add OrgSsoConfig model to schema**

Add to `prisma/schema.prisma` after the OrgMeetingConfig model:

```prisma
model OrgSsoConfig {
  id             String   @id @default(cuid())
  organisationId String   @unique
  emailDomain    String   @unique
  metadataUrl    String?
  ssoUrl         String
  entityId       String
  certificate    String   @db.Text
  autoProvision  Boolean  @default(false)
  defaultRole    String?
  configured     Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organisation Organisation @relation(fields: [organisationId], references: [id])
}
```

Add to the existing `Organisation` model:
```prisma
ssoConfig OrgSsoConfig?
```

- [ ] **Step 3: Push schema**

```bash
cp .env.local .env
# Ensure DATABASE_URL and DIRECT_URL are in .env
npx prisma db push
rm .env
```

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma package.json package-lock.json
git commit -m "feat: add OrgSsoConfig model and XML dependencies for Enterprise SSO"
```

---

### Task 2: SAML Library (`lib/saml.ts`)

**Files:**
- Create: `lib/saml.ts`

- [ ] **Step 1: Create the SAML utility library**

This file handles all SAML operations: AuthnRequest generation, Response validation, and metadata parsing.

```typescript
import { DOMParser } from '@xmldom/xmldom'
import { SignedXml } from 'xml-crypto'
import { parseStringPromise } from 'xml2js'
import crypto from 'crypto'

const APP_ENTITY_ID = process.env.NEXTAUTH_URL || 'https://asd-training-app-v2.vercel.app'
const CALLBACK_URL = `${APP_ENTITY_ID}/api/auth/saml/callback`

// Generate a SAML AuthnRequest and return the redirect URL
export function generateSamlLoginUrl(ssoUrl: string, email: string): string {
  const id = '_' + crypto.randomBytes(16).toString('hex')
  const issueInstant = new Date().toISOString()

  const request = `<samlp:AuthnRequest
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="${id}"
    Version="2.0"
    IssueInstant="${issueInstant}"
    Destination="${ssoUrl}"
    AssertionConsumerServiceURL="${CALLBACK_URL}"
    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
    <saml:Issuer>${APP_ENTITY_ID}</saml:Issuer>
  </samlp:AuthnRequest>`

  const encoded = Buffer.from(request).toString('base64')
  const separator = ssoUrl.includes('?') ? '&' : '?'
  return `${ssoUrl}${separator}SAMLRequest=${encodeURIComponent(encoded)}&RelayState=${encodeURIComponent(email)}`
}

// Validate a SAML Response and extract user info
export async function validateSamlResponse(
  samlResponseBase64: string,
  certificate: string
): Promise<{ valid: boolean; email?: string; name?: string; error?: string }> {
  try {
    const xml = Buffer.from(samlResponseBase64, 'base64').toString('utf-8')
    const doc = new DOMParser().parseFromString(xml, 'text/xml')

    // Validate signature
    const signatureNodes = doc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature')
    if (signatureNodes.length === 0) {
      return { valid: false, error: 'No signature found in SAML response' }
    }

    const sig = new SignedXml()
    const certPem = certificate.includes('BEGIN CERTIFICATE')
      ? certificate
      : `-----BEGIN CERTIFICATE-----\n${certificate}\n-----END CERTIFICATE-----`
    const certClean = certPem.replace(/-----BEGIN CERTIFICATE-----/, '').replace(/-----END CERTIFICATE-----/, '').replace(/\s/g, '')

    sig.publicCert = certPem
    sig.keyInfoProvider = {
      getKeyInfo: () => '<X509Data></X509Data>',
      getKey: () => Buffer.from(`-----BEGIN CERTIFICATE-----\n${certClean}\n-----END CERTIFICATE-----\n`),
    }

    sig.loadSignature(signatureNodes[0])
    const isValid = sig.checkSignature(xml)
    if (!isValid) {
      return { valid: false, error: `Signature validation failed: ${sig.validationErrors.join(', ')}` }
    }

    // Check conditions timestamps
    const conditions = doc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Conditions')
    if (conditions.length > 0) {
      const notBefore = conditions[0].getAttribute('NotBefore')
      const notOnOrAfter = conditions[0].getAttribute('NotOnOrAfter')
      const now = new Date()
      if (notBefore && new Date(notBefore) > now) {
        return { valid: false, error: 'SAML response not yet valid (NotBefore)' }
      }
      if (notOnOrAfter && new Date(notOnOrAfter) < now) {
        return { valid: false, error: 'SAML response has expired (NotOnOrAfter)' }
      }
    }

    // Extract email from NameID
    const nameIdNodes = doc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'NameID')
    const email = nameIdNodes.length > 0 ? nameIdNodes[0].textContent?.trim() : undefined

    if (!email) {
      return { valid: false, error: 'No NameID (email) found in SAML response' }
    }

    // Try to extract name from attributes
    let name: string | undefined
    const attrStatements = doc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'AttributeStatement')
    if (attrStatements.length > 0) {
      const attrs = attrStatements[0].getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Attribute')
      for (let i = 0; i < attrs.length; i++) {
        const attrName = attrs[i].getAttribute('Name') || ''
        if (attrName.includes('displayName') || attrName.includes('givenName') || attrName === 'name') {
          const values = attrs[i].getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'AttributeValue')
          if (values.length > 0) {
            name = values[0].textContent?.trim()
            break
          }
        }
      }
    }

    return { valid: true, email, name }
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Failed to validate SAML response' }
  }
}

// Parse IdP metadata XML to extract SSO URL, entity ID, and certificate
export async function parseMetadataUrl(metadataUrl: string): Promise<{
  success: boolean
  entityId?: string
  ssoUrl?: string
  certificate?: string
  error?: string
}> {
  try {
    const res = await fetch(metadataUrl)
    if (!res.ok) return { success: false, error: `Failed to fetch metadata: ${res.status}` }
    const xml = await res.text()
    const parsed = await parseStringPromise(xml, { explicitNamespaces: false, tagNameProcessors: [(name: string) => name.replace(/^.*:/, '')] })

    // Find root element (EntityDescriptor)
    const root = parsed.EntityDescriptor || parsed['md:EntityDescriptor'] || Object.values(parsed)[0]
    if (!root) return { success: false, error: 'Could not find EntityDescriptor in metadata' }

    const entityId = root.$?.entityID || root.$?.EntityID || ''

    // Find SSO URL (SingleSignOnService with HTTP-Redirect binding)
    let ssoUrl = ''
    const ssoServices = root.IDPSSODescriptor?.[0]?.SingleSignOnService || root['md:IDPSSODescriptor']?.[0]?.['md:SingleSignOnService'] || []
    for (const svc of ssoServices) {
      const binding = svc.$?.Binding || ''
      if (binding.includes('HTTP-Redirect')) {
        ssoUrl = svc.$?.Location || ''
        break
      }
    }
    if (!ssoUrl && ssoServices.length > 0) {
      ssoUrl = ssoServices[0].$?.Location || ''
    }

    // Find certificate
    let certificate = ''
    const keyDescriptors = root.IDPSSODescriptor?.[0]?.KeyDescriptor || root['md:IDPSSODescriptor']?.[0]?.['md:KeyDescriptor'] || []
    for (const kd of keyDescriptors) {
      const use = kd.$?.use || 'signing'
      if (use === 'signing' || !kd.$?.use) {
        const cert = kd.KeyInfo?.[0]?.X509Data?.[0]?.X509Certificate?.[0]
          || kd['ds:KeyInfo']?.[0]?.['ds:X509Data']?.[0]?.['ds:X509Certificate']?.[0]
        if (cert) {
          certificate = typeof cert === 'string' ? cert.trim() : (cert._ || cert).trim()
          break
        }
      }
    }

    if (!entityId || !ssoUrl || !certificate) {
      return { success: false, error: `Incomplete metadata: entityId=${!!entityId}, ssoUrl=${!!ssoUrl}, certificate=${!!certificate}` }
    }

    return { success: true, entityId, ssoUrl, certificate }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to parse metadata' }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/saml.ts
git commit -m "feat: add SAML library for SSO request/response/metadata handling"
```

---

### Task 3: Public SSO API Routes

**Files:**
- Create: `app/api/auth/sso-check/route.ts`
- Create: `app/api/auth/saml/login/route.ts`
- Create: `app/api/auth/saml/callback/route.ts`
- Modify: `middleware.ts`

- [ ] **Step 1: Create SSO domain check route**

`app/api/auth/sso-check/route.ts`:
- GET with `?domain=` query param
- Looks up OrgSsoConfig by emailDomain where configured=true
- Includes organisation name and slug
- Returns `{ sso: true, orgName, orgSlug }` or `{ sso: false }`
- No auth required

- [ ] **Step 2: Create SAML login initiation route**

`app/api/auth/saml/login/route.ts`:
- POST with body `{ email }`
- Extracts domain from email, looks up OrgSsoConfig
- Calls `generateSamlLoginUrl(config.ssoUrl, email)`
- Returns `{ redirectUrl }` (client does the redirect)

- [ ] **Step 3: Create SAML callback route**

`app/api/auth/saml/callback/route.ts`:
- POST receives `SAMLResponse` and `RelayState` from IdP (form-encoded)
- Extracts email domain from the validated email, looks up OrgSsoConfig
- Calls `validateSamlResponse(samlResponse, config.certificate)`
- If valid:
  - Looks up user by email
  - If not found + autoProvision: create user with defaultRole and orgId
  - If not found + no autoProvision: redirect to `/login?error=...`
  - Creates JWT using `encode()` from `next-auth/jwt` with all standard fields (id, role, organisationId, mustChangePassword, totpEnabled, mfaPending, effectiveModules)
  - Sets `next-auth.session-token` cookie (or `__Secure-next-auth.session-token` in production)
  - Redirects to `/`
- If invalid: redirect to `/login?error=...`
- Import `getEffectiveModules` from `@/lib/modules` for the JWT

- [ ] **Step 4: Update middleware to allow SAML routes**

In `middleware.ts`, add `/api/auth/saml` and `/api/auth/sso-check` to the PUBLIC_PATHS array:

```typescript
const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/privacy', '/api/auth']
```

The `/api/auth` prefix already covers `/api/auth/saml/*` and `/api/auth/sso-check`, so no change needed. Verify this is the case by reading the middleware.

- [ ] **Step 5: Commit**

```bash
git add app/api/auth/sso-check/ app/api/auth/saml/ middleware.ts
git commit -m "feat: add SAML SSO login, callback, and domain check routes"
```

---

### Task 4: Org Admin SSO Config API Routes

**Files:**
- Create: `app/api/admin/settings/sso/route.ts`
- Create: `app/api/admin/settings/sso/parse-metadata/route.ts`
- Create: `app/api/admin/settings/sso/test/route.ts`

- [ ] **Step 1: Create SSO config CRUD route**

`app/api/admin/settings/sso/route.ts`:
- GET: returns OrgSsoConfig for user's org (or null). Auth: ORG_ADMIN.
- PUT: upserts config. Body: `{ emailDomain, metadataUrl?, ssoUrl, entityId, certificate, autoProvision, defaultRole? }`. Sets `configured: true` if ssoUrl + entityId + certificate are all present. Auth: ORG_ADMIN.
- DELETE: removes config for the org. Auth: ORG_ADMIN.

- [ ] **Step 2: Create metadata parser route**

`app/api/admin/settings/sso/parse-metadata/route.ts`:
- POST with `{ metadataUrl }`. Calls `parseMetadataUrl()` from `lib/saml.ts`. Returns `{ entityId, ssoUrl, certificate }` on success. Auth: ORG_ADMIN.

- [ ] **Step 3: Create test route**

`app/api/admin/settings/sso/test/route.ts`:
- POST generates a SAML login URL for testing. Reads the org's config, calls `generateSamlLoginUrl()` with a test email. Returns `{ loginUrl }`. Auth: ORG_ADMIN.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/settings/sso/
git commit -m "feat: add org admin SSO config API routes"
```

---

### Task 5: Update Login Page with Email Domain Detection

**Files:**
- Modify: `app/(auth)/login/page.tsx`

- [ ] **Step 1: Add SSO detection to login form**

Read the current login page first. Then add:

1. New state: `ssoOrg: { sso: boolean; orgName: string } | null` (default null)
2. A `useEffect` that watches the `email` state:
   - Extract domain after `@` (only when email contains `@` and has text after it)
   - Debounce 300ms (use a timeout ref)
   - Call `GET /api/auth/sso-check?domain=${domain}`
   - Set `ssoOrg` from response
   - Clear `ssoOrg` when email changes to a non-matching domain
3. When `ssoOrg?.sso === true`:
   - Hide the login method toggle (password/SSO tabs)
   - Instead of the password form or SSO buttons, show:
     - A card with Building2 icon, "Sign in with **{orgName}**" as a button
     - Text: "Your organisation uses Enterprise SSO"
     - The button calls `fetch('/api/auth/saml/login', { method: 'POST', body: JSON.stringify({ email }) })` then reads the `redirectUrl` from the response and does `window.location.href = redirectUrl`
4. When `ssoOrg` is null or `sso: false`: show normal login (current behavior)
5. Add `Building2` to the lucide-react import

- [ ] **Step 2: Commit**

```bash
git add "app/(auth)/login/page.tsx"
git commit -m "feat: add email domain SSO detection to login page"
```

---

### Task 6: Org Admin SSO Settings Page + Sidebar

**Files:**
- Create: `app/(org-admin)/admin/settings/sso/page.tsx`
- Modify: `components/layout/org-admin-sidebar.tsx`

- [ ] **Step 1: Create SSO settings page**

Client component that fetches from `GET /api/admin/settings/sso`. Shows:

- Header: "Enterprise SSO (SAML)" with status badge (Configured green / Not configured grey)
- **Email Domain** input — what domain triggers SSO (e.g. `tesco.com`)
- **Metadata URL** input + "Auto-configure" button
  - On click: POST to `/api/admin/settings/sso/parse-metadata`
  - On success: populate SSO URL, Entity ID, Certificate fields + show success toast
  - On error: show error toast
- **SSO URL** input (editable, populated from metadata or manual)
- **Entity ID** input (editable, populated from metadata or manual)
- **Certificate** textarea (editable, populated from metadata or manual, monospace font)
- **Auto-provision** section:
  - Toggle switch
  - When on: "Default role" dropdown (fetch org's allowedRoles from `/api/sessions/org-info`)
  - Description text: "Automatically create accounts for new users from your identity provider"
- **Test** button → POST to `/api/admin/settings/sso/test` → opens returned URL in new tab
- **Save** button → PUT to `/api/admin/settings/sso`
- **Remove SSO** section (danger zone):
  - "Remove Enterprise SSO" button with confirmation
  - DELETE to `/api/admin/settings/sso`

Match existing admin page styling (emerald accents, dark mode, cards).

- [ ] **Step 2: Add Enterprise SSO to sidebar**

Read `components/layout/org-admin-sidebar.tsx`. Add `Shield` to lucide imports. Add nav item after Meeting Settings:

```typescript
{ href: '/admin/settings/sso', label: 'Enterprise SSO', icon: Shield },
```

- [ ] **Step 3: Commit**

```bash
git add "app/(org-admin)/admin/settings/sso/page.tsx" components/layout/org-admin-sidebar.tsx
git commit -m "feat: add Enterprise SSO settings page and sidebar nav"
```

---

### Task 7: Build, Type-Check, and Deploy

- [ ] **Step 1: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Push and deploy**

```bash
git push origin main
npx vercel deploy --prod
```

- [ ] **Step 4: Post-deploy verification**

- Go to login page, type an email with a random domain → normal login shows
- As org admin, go to `/admin/settings/sso` → configure with a test IdP metadata URL
- Type an email with the configured domain on login → should show "Sign in with {OrgName}"
- Click the button → should redirect to the IdP
