# Enterprise SSO (SAML) — Design Spec

**Date:** 2026-03-29
**Status:** Approved
**Branch:** `feat/enterprise-sso`

---

## Goal

Add per-org SAML SSO so that users from organisations with a configured identity provider are automatically detected by email domain and redirected to their corporate login. No extra button — the login page adapts dynamically based on the email entered.

## Database Schema

### New Model

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

Add to `Organisation`:
```prisma
ssoConfig OrgSsoConfig?
```

### Key Decisions

- `emailDomain` is unique across all orgs — one domain maps to one org
- `certificate` stores the X.509 PEM certificate from the IdP metadata
- `defaultRole` is only used when `autoProvision` is true — new users get this role
- `autoProvision: false` means users must be pre-created by the org admin (consistent with current Google/Microsoft SSO model)

## Login Flow

### Step 1: Email Domain Check (Client-Side)

As the user types their email on the login page, after they type past the `@`:
- Client debounces (300ms) and calls `GET /api/auth/sso-check?domain=tesco.com`
- API looks up `OrgSsoConfig` by `emailDomain` where `configured: true`
- Returns `{ sso: true, orgName: "Tesco", orgSlug: "tesco" }` or `{ sso: false }`

### Step 2: Login Page Adapts

If SSO detected:
- Hide the password field, "Forgot password?" link, and "Sign in" button
- Hide the "Single Sign-On" tab (Google/Microsoft buttons)
- Show: "Sign in with **Tesco**" button with a lock/building icon
- Small text: "Your organisation uses Enterprise SSO"

If no SSO:
- Show normal login (password tab + SSO tab as current)

### Step 3: SAML Login Initiation

User clicks "Sign in with Tesco":
- Client calls `POST /api/auth/saml/login` with `{ email }`
- Server looks up the org's `OrgSsoConfig` by email domain
- Generates a SAML AuthnRequest XML:
  - `Issuer`: app's entity ID (e.g. `https://asd-training-app-v2.vercel.app`)
  - `AssertionConsumerServiceURL`: `https://asd-training-app-v2.vercel.app/api/auth/saml/callback`
  - `Destination`: org's `ssoUrl`
- Base64-encodes the request
- Redirects the user to: `{ssoUrl}?SAMLRequest={encodedRequest}&RelayState={email}`

### Step 4: IdP Authentication

The org's IdP (Okta, Azure AD, Google Workspace, etc.) authenticates the user and sends a SAML Response back via POST to the callback URL.

### Step 5: SAML Callback Processing

`POST /api/auth/saml/callback`:
1. Receives `SAMLResponse` (base64-encoded XML) and `RelayState` (email)
2. Decodes and parses the SAML Response XML
3. Validates the signature against the org's stored `certificate`
4. Extracts user attributes: `email` (NameID), `name` (if available)
5. Looks up user by email in the database:
   - **User exists**: sign them in via NextAuth (set JWT token with all fields)
   - **User doesn't exist + autoProvision enabled**: create user with `defaultRole`, org assignment, then sign in
   - **User doesn't exist + autoProvision disabled**: redirect to `/login?error=Account not found. Contact your organisation administrator.`
6. Redirect to `/` (home) — middleware handles routing to the correct dashboard

### NextAuth Integration

Since we can't use NextAuth's built-in SAML (it doesn't have one), the SAML callback creates a JWT token manually:
- After validating the SAML assertion and finding/creating the user
- Use `next-auth/jwt` `encode()` to create a signed JWT
- Set it as the `next-auth.session-token` cookie
- Redirect to `/`

This bypasses NextAuth's sign-in flow but produces an identical JWT token that NextAuth reads on subsequent requests.

## SAML XML Handling

Use the `xml2js` package for parsing SAML responses and `@xmldom/xmldom` + `xml-crypto` for signature validation. These are lightweight and well-maintained.

### SAML AuthnRequest Template

```xml
<samlp:AuthnRequest
  xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="_${randomId}"
  Version="2.0"
  IssueInstant="${isoTimestamp}"
  Destination="${ssoUrl}"
  AssertionConsumerServiceURL="${callbackUrl}"
  ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
  <saml:Issuer>${entityId}</saml:Issuer>
</samlp:AuthnRequest>
```

### SAML Response Validation

1. Base64-decode the response
2. Parse XML
3. Find the `<Signature>` element
4. Validate against the stored certificate using `xml-crypto`
5. Check `<Conditions>` timestamps (NotBefore, NotOnOrAfter)
6. Extract `<NameID>` as the email
7. Extract `<Attribute>` values for name if available

## Metadata Parsing

When org admin enters a metadata URL and clicks "Auto-configure":
- `POST /api/admin/settings/sso/parse-metadata` with `{ metadataUrl }`
- Server fetches the XML from the URL
- Parses to extract: `entityId`, `ssoUrl` (SingleSignOnService with HTTP-Redirect binding), `certificate` (X509Certificate)
- Returns the parsed fields for the form to populate

## API Routes

### Public (No Auth)

**`GET /api/auth/sso-check?domain=tesco.com`**
- Looks up OrgSsoConfig by emailDomain where configured=true
- Returns `{ sso: true, orgName, orgSlug }` or `{ sso: false }`
- No auth required (called from login page before sign-in)

**`POST /api/auth/saml/login`**
- Body: `{ email }`
- Generates SAML AuthnRequest and redirects to IdP
- No auth required

**`POST /api/auth/saml/callback`**
- Receives SAML Response from IdP
- Validates, finds/creates user, sets JWT cookie, redirects to `/`
- No auth required (IdP posts here)

### Org Admin

**`GET /api/admin/settings/sso`**
- Returns OrgSsoConfig for user's org (or null)
- Auth: ORG_ADMIN

**`PUT /api/admin/settings/sso`**
- Creates or updates OrgSsoConfig
- Body: `{ emailDomain, metadataUrl?, ssoUrl, entityId, certificate, autoProvision, defaultRole? }`
- Sets `configured: true` if ssoUrl + entityId + certificate are present
- Auth: ORG_ADMIN

**`DELETE /api/admin/settings/sso`**
- Removes OrgSsoConfig for the org
- Auth: ORG_ADMIN

**`POST /api/admin/settings/sso/parse-metadata`**
- Body: `{ metadataUrl }`
- Fetches and parses SAML metadata XML
- Returns: `{ entityId, ssoUrl, certificate }`
- Auth: ORG_ADMIN

**`POST /api/admin/settings/sso/test`**
- Generates a test SAML AuthnRequest URL without redirecting
- Returns: `{ loginUrl }` — admin can open in new tab to test
- Auth: ORG_ADMIN

## UI Changes

### Login Page (`app/(auth)/login/page.tsx`)

Modify the existing login form:
- Add state: `ssoOrg: { sso: boolean, orgName: string } | null`
- Add `useEffect` on email field: debounce 300ms, extract domain after `@`, call `/api/auth/sso-check`
- When `ssoOrg.sso === true`:
  - Hide the password/SSO toggle tabs
  - Hide password field, forgot password link, sign-in button
  - Hide Google/Microsoft SSO buttons
  - Show: enterprise SSO card with "Sign in with **{orgName}**" button + "Your organisation uses Enterprise SSO" text
  - Button submits `POST /api/auth/saml/login` with the email (form action or fetch + redirect)
- When email changes and no longer matches, revert to normal login

### Org Admin Settings — Enterprise SSO Page (`/admin/settings/sso`)

New page accessible from org admin sidebar:
- Header: "Enterprise SSO (SAML)"
- **Email domain** input (e.g. `tesco.com`) — what domain triggers SSO for this org
- **Metadata URL** input + "Auto-configure" button
  - On click: calls parse-metadata API, populates the fields below
- **SSO URL** input (populated from metadata or manually)
- **Entity ID** input (populated from metadata or manually)
- **Certificate** textarea (populated from metadata or manually, PEM format)
- **Auto-provision** toggle
  - When on: show "Default role" dropdown (roles from org's allowedRoles)
  - Description: "Automatically create accounts for new users from your IdP"
- **Test** button → opens the generated SAML login URL in a new tab
- **Save** button
- **Remove SSO** button (danger zone, with confirmation)
- Status badge: "Configured" (green) or "Not configured" (grey)

### Org Admin Sidebar

Add "Enterprise SSO" nav item with a `Shield` icon, after "Meeting Settings".

## Dependencies

- `xml2js` — parse SAML metadata and response XML
- `@xmldom/xmldom` — DOM parser for XML signature validation
- `xml-crypto` — validate XML signatures against X.509 certificates
- `next-auth/jwt` — encode JWT tokens for manual session creation

## Security Considerations

- SAML Response signatures MUST be validated against the stored certificate
- Check `Conditions` timestamps to prevent replay attacks
- `emailDomain` is unique — prevents domain squatting across orgs
- Certificate is stored as-is (PEM text) — no encryption needed since it's a public key
- The SAML callback URL must be exact-match (no wildcard)
- Rate-limit the `/api/auth/sso-check` endpoint to prevent domain enumeration

## Out of Scope

- SAML Single Logout (SLO)
- IdP-initiated SSO (only SP-initiated)
- Multiple email domains per org
- SAML attribute mapping (beyond email and name)
- SCIM user provisioning
- Encrypted SAML assertions (signed only)
