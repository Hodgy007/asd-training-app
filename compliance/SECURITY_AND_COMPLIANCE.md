# Security & Compliance Review
## Ambitious About Autism — ASD Training & Observation Platform

**Document version:** 2.0
**Date:** 1 April 2026
**Classification:** Internal — For review by CISO, DPO, or Information Governance lead
**Prepared by:** Development team
**Previous version:** 1.0 (28 March 2026)

---

## 1. Executive Summary

This document provides a comprehensive security and compliance review of the Ambitious About Autism web application — a platform designed for caregivers, early years practitioners, careers professionals, and organisation staff to access ASD awareness training, log structured behavioural observations for children, and participate in professional development.

The application handles **special category personal data** (health-adjacent observations relating to children's developmental behaviour) and is therefore subject to heightened data protection obligations under the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.

Since version 1.0 of this document (28 March 2026), significant security hardening has been completed including rate limiting, MFA enforcement, password complexity requirements, XSS sanitisation, security headers, file upload validation, and a cookie consent mechanism. These controls are detailed throughout this document.

**Overall risk rating: LOW-MEDIUM**
The application has comprehensive security controls in place across all major categories. Remaining gaps are primarily administrative (signed DPAs, ICO registration, DPIA completion) rather than technical.

---

## 2. Data Classification

| Data Type | Sensitivity | Stored Where | Encryption at Rest | Retention |
|-----------|-------------|--------------|-------------------|-----------|
| User name and email | Personal Data (Article 4 UK GDPR) | Neon PostgreSQL | AES-256 (Azure managed) | Until account deletion |
| Hashed password (bcrypt, cost 12) | Personal Data | Neon PostgreSQL | AES-256 + bcrypt hash | Until account deletion |
| Child first name and date of birth | Personal Data (child — heightened) | Neon PostgreSQL | AES-256 (Azure managed) | Until account deletion |
| Behavioural observations (domain, frequency, context, notes) | **Special Category Data** (Article 9 — health-adjacent) | Neon PostgreSQL | AES-256 (Azure managed) | Until account deletion |
| AI-generated insight reports | Special Category Data (derived) | Neon PostgreSQL | AES-256 (Azure managed) | Until account deletion |
| Training progress records | Personal Data | Neon PostgreSQL | AES-256 (Azure managed) | Until account deletion |
| Document library files | Organisational data | Vercel Blob storage | AES-256 (Vercel managed) | Until admin deletion |
| Survey responses | Personal Data | Neon PostgreSQL | AES-256 (Azure managed) | Until survey deletion |
| TOTP MFA secrets | Personal Data (sensitive) | Neon PostgreSQL | AES-256 (Azure managed) | Until MFA disabled/account deletion |
| JWT session tokens | Personal Data | Client-side cookie (httpOnly) | HTTPS transport, signed (HS256) | 8 hours (maxAge) |
| Password reset tokens | Personal Data | Neon PostgreSQL | AES-256 (Azure managed) | 1 hour (auto-expired) |
| Integration API key hashes | Organisational data | Neon PostgreSQL | AES-256 + SHA-256 hash | Until key revocation |
| SAML SSO certificates | Organisational data (sensitive) | Neon PostgreSQL | AES-256 (Azure managed) | Until SSO config removal |

**Note on special category classification:** The behavioural observations recorded on this platform relate to potential neurodevelopmental differences in children. Although the platform explicitly does not diagnose, the data is sufficiently health-adjacent to be treated as special category data requiring explicit consent under Article 9(2)(a) UK GDPR.

---

## 3. Data Flow Architecture

```
User (browser, HTTPS only)
        │
        ▼
Vercel Edge Network (TLS 1.3, global CDN, ~300 PoPs worldwide)
  ├── DDoS protection (automatic, all plans)
  ├── HTTP security headers applied (CSP, HSTS, etc.)
  └── Rate limiting enforced (middleware layer)
        │
        ▼
Next.js Application (Vercel Serverless Functions, Node.js, iad1 — Washington DC)
  ├── Authentication layer (NextAuth v4, JWT sessions, RBAC middleware)
  ├── XSS sanitisation layer (DOMPurify on all HTML output)
  └── Input validation (Zod schemas, server-side)
        │
        ├──► Neon PostgreSQL (Azure East US 2, ep-blue-thunder.eastus2.azure.neon.tech)
        │        Pooled connection (PgBouncer, port 6543) for runtime
        │        Direct connection (port 5432) for migrations only
        │        TLS enforced on all connections
        │        AES-256 encryption at rest (Azure managed)
        │
        ├──► Google Gemini API (gemini-2.5-flash)
        │        Observation text sent on AI report request only
        │        Child surnames and DOB are NOT sent
        │        Google API terms: data not used for model training
        │
        ├──► Vercel Blob Storage (document library files)
        │        Authenticated uploads via server-side token
        │        File type/MIME validation before upload
        │
        └──► Resend (transactional email)
                 Email address + name sent for password reset only
                 Resend infrastructure: US-based
```

**International transfers:** Both Neon (Azure East US 2), Vercel (US), and Resend are US-based processors. Transfers from the UK to the US are covered under the UK Extension to the EU-US Data Privacy Framework and/or Standard Contractual Clauses (SCCs) in the respective processor agreements. Organisations deploying this application should verify current transfer mechanisms with each processor.

---

## 4. Hosting Infrastructure & Platform Compliance

### 4.1 Vercel (Application Hosting)

| Aspect | Detail |
|--------|--------|
| **Provider** | Vercel Inc. (San Francisco, CA, USA) |
| **Compliance certifications** | SOC 2 Type II, ISO 27001, HIPAA eligible (Enterprise plan), PCI DSS compliant |
| **Data processing region** | iad1 (Washington DC, US East) for serverless functions |
| **CDN** | Global edge network (~300 points of presence) |
| **DDoS protection** | Automatic on all plans, mitigates volumetric and application-layer attacks |
| **TLS** | TLS 1.3 enforced on all traffic; automatic SSL certificate provisioning and renewal |
| **Isolation** | Serverless functions run in isolated containers; no shared memory between invocations |
| **Build security** | Builds run in ephemeral containers; no persistent state between deploys |
| **Secrets management** | Environment variables encrypted at rest; accessible only to deployment functions |
| **Availability** | 99.99% SLA (Pro/Enterprise plans); multi-AZ redundancy |
| **DPA available** | Yes — Vercel provides a GDPR-compliant Data Processing Agreement |
| **Data residency** | US-based processing; UK/EU data transfers covered by SCCs / DPF |
| **Audit logs** | Deployment history, team access logs available in dashboard |
| **Network security** | Vercel Firewall available; bot detection; IP allowlisting (Enterprise) |

### 4.2 Neon (Database Hosting)

| Aspect | Detail |
|--------|--------|
| **Provider** | Neon Inc. (infrastructure on Microsoft Azure) |
| **Underlying cloud** | Microsoft Azure (East US 2 region) |
| **Compliance certifications** | SOC 2 Type II (Neon); Azure is ISO 27001, SOC 2, HIPAA, PCI DSS, FedRAMP |
| **Encryption at rest** | AES-256 (Azure managed encryption keys) |
| **Encryption in transit** | TLS enforced on all PostgreSQL connections |
| **Connection security** | PgBouncer connection pooling (port 6543); direct connections (port 5432) for migrations only |
| **Backups** | Continuous WAL archiving; point-in-time recovery; daily snapshots |
| **Branching** | Database branching for dev/staging environments (separate from production) |
| **Isolation** | Tenant-level compute isolation; no shared database instances |
| **DPA available** | Yes — Neon provides a GDPR-compliant Data Processing Agreement |

### 4.3 Vercel Blob (Document Storage)

| Aspect | Detail |
|--------|--------|
| **Provider** | Vercel Inc. (Cloudflare R2 backend) |
| **Encryption at rest** | AES-256 |
| **Access control** | Server-side token authentication; no public write access |
| **File validation** | Extension whitelist, MIME type cross-checking, 50 MB size limit, blocked dangerous file types |
| **DPA** | Covered under Vercel's DPA |

### 4.4 Google Gemini API (AI Processing)

| Aspect | Detail |
|--------|--------|
| **Provider** | Google LLC |
| **Model** | gemini-2.5-flash |
| **Data retention** | Google API terms state inputs are not used for model training and are not retained beyond processing |
| **Data minimisation** | Only observation text is sent; child surnames, DOB, and user account data are NOT transmitted |
| **DPA available** | Yes — Google Cloud Data Processing Amendment |

### 4.5 Resend (Transactional Email)

| Aspect | Detail |
|--------|--------|
| **Provider** | Resend Inc. (US-based) |
| **Purpose** | Password reset emails only |
| **Data shared** | Email address and first name |
| **DPA available** | Yes — Resend provides a DPA |

---

## 5. Authentication & Access Controls

### 5.1 Authentication mechanisms

| Control | Implementation | Assessment |
|---------|---------------|------------|
| Password hashing | bcrypt, cost factor 12 | ✅ Strong |
| Password complexity | Minimum 10 characters, requires uppercase, lowercase, number, and special character. Enforced server-side on all 7 password-setting routes (register, change-password, reset-password, admin user creation) | ✅ Strong |
| Session strategy | JWT (NextAuth v4, HS256, signed with NEXTAUTH_SECRET) | ✅ Good |
| Session lifetime | 8 hours (industry standard for training platforms with sensitive data) | ✅ Good |
| Session cookie flags | `httpOnly: true`, `secure: true` (production), `sameSite: lax` | ✅ Strong |
| SSO providers | Google OAuth 2.0, Microsoft Azure AD (configurable; hidden if not configured) | ✅ Good |
| SAML SSO | Per-organisation SAML 2.0 with certificate validation, optional auto-provisioning | ✅ Good |
| Charity SAML SSO | Charity-level SAML SSO with enforce-for-all option | ✅ Good |
| Multi-factor authentication | TOTP-based MFA via authenticator app (QR code enrolment). **Mandatory** for SUPER_ADMIN, CHARITY_EMPLOYEE, and ORG_ADMIN roles. Enforced by middleware — admin users cannot access any route until MFA is configured | ✅ Strong |
| Rate limiting | Sliding-window rate limiter on auth endpoints: login (10/15min), register (5/15min), forgot-password (3/15min), reset-password (5/15min), MFA verify (10/15min). Returns 429 with Retry-After header | ✅ Good |
| Account deactivation | Admin can deactivate user accounts (`active: false`); blocked at sign-in | ✅ Present |
| Organisation deactivation | Admin can deactivate entire organisations; all members blocked at sign-in | ✅ Present |
| Forced password change | Admin-set flag redirects user to change-password page; middleware blocks all other access until completed | ✅ Good |
| Email enumeration resistance | Forgot-password endpoint always returns 200 regardless of whether email exists | ✅ Good |
| SSO user pre-creation | SSO/OAuth users must be pre-created by an admin; sign-in callback rejects unknown emails | ✅ Good |
| SSO provider visibility | Unconfigured SSO providers (Google/Microsoft) are hidden from the login page | ✅ Good |

### 5.2 Role-based access control (RBAC)

Eight roles are defined with hierarchical access:

| Role | Display Name | Access Level |
|------|-------------|-------------|
| `SUPER_ADMIN` | Charity Admin | Full platform access — manages all organisations, users, training content, surveys, library, sessions, reports, integrations, settings. All charity permissions implicitly granted. MFA mandatory. |
| `CHARITY_EMPLOYEE` | Charity Employee | Delegated charity access — limited to specific permissions from their `charityPermissions` array (manage_organisations, manage_training, manage_surveys, manage_announcements, view_reports, manage_sessions, manage_library). MFA mandatory. |
| `ORG_ADMIN` | Org Admin | Organisation-level admin — manages users, announcements, sessions, library, reports, meeting config, and SSO settings for their own organisation only. MFA mandatory. |
| `CAREGIVER` | Practitioner | Full training + observation access — ASD training, child profiles, observations, AI insights, reports, sessions, library |
| `CAREER_DEV_OFFICER` | Careers Professional | Careers training only — no child data access, no observation features |
| `STUDENT` | Student | Training only — assigned training programs |
| `INTERN` | Intern | Training only — assigned training programs |
| `EMPLOYEE` | Employee | Training only — assigned training programs |

**Access enforcement:**
- All API routes verify session and role on every request
- Middleware enforces route-level access: admin roles cannot access leaf-role routes (and vice versa)
- Child data endpoints filter by `userId` — cross-user data access is not possible
- Organisation-scoped queries filter by `organisationId` — cross-org data access is not possible
- Admin actions (user creation, training editing, etc.) verify appropriate role before execution
- CHARITY_EMPLOYEE users have granular permission checks via `hasPermission()` helper
- Super admin sidebar dynamically shows/hides navigation items based on permissions

### 5.3 API security

| Control | Detail |
|--------|--------|
| Authentication check | Every API route calls `getServerSession(authOptions)` and returns 401 if unauthenticated |
| Role authorisation | Routes check role via RBAC helpers (`isSuperAdmin`, `isOrgAdmin`, `hasPermission`, etc.) |
| Ownership validation | Data queries always filter by the authenticated user's ID or organisation ID |
| Input validation | Zod schemas used for request body validation on all mutation endpoints |
| Integration API keys | External API access via SHA-256 hashed Bearer tokens with prefix display, expiry tracking, and revocation |
| CORS | Default same-origin policy (no custom CORS headers) |

---

## 6. Application Security Controls

### 6.1 HTTP security headers

All routes return the following security headers via `next.config.js`:

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Enforces HTTPS for 2 years; eligible for HSTS preload list |
| `X-Frame-Options` | `DENY` | Prevents clickjacking — page cannot be embedded in any iframe |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer information sent to third parties |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Blocks camera, microphone, and geolocation access |
| `Content-Security-Policy` | See below | Restricts resource loading to trusted origins |

**Content Security Policy (CSP) directives:**
- `default-src 'self'` — only load resources from same origin by default
- `script-src 'self' 'unsafe-inline' 'unsafe-eval'` — required for Next.js hydration and react-quill WYSIWYG editor
- `style-src 'self' 'unsafe-inline'` — required for Tailwind CSS and component styling
- `img-src 'self' data: blob: https://via.placeholder.com https://placehold.co https://*.public.blob.vercel-storage.com` — allows images from Vercel Blob storage
- `font-src 'self'` — only self-hosted fonts
- `connect-src 'self' https://generativelanguage.googleapis.com` — allows Gemini API calls
- `frame-ancestors 'none'` — additional clickjacking prevention

**CSP notes:** `unsafe-inline` and `unsafe-eval` are required for Next.js page hydration and the react-quill rich text editor. A nonce-based CSP would be preferred but requires Next.js configuration changes. This is documented as a future improvement.

### 6.2 XSS prevention

| Control | Implementation |
|---------|---------------|
| React auto-escaping | React escapes all interpolated values by default |
| DOMPurify sanitisation | All `dangerouslySetInnerHTML` usage (training lesson content, survey results) passes through `isomorphic-dompurify` with an explicit whitelist of allowed HTML tags and attributes |
| Tag whitelist | Only formatting tags allowed: headings, paragraphs, lists, links, images, tables, code blocks, text formatting |
| Attribute whitelist | Only safe attributes: `href`, `target`, `rel`, `src`, `alt`, `class`, `style`, `width`, `height`, `colspan`, `rowspan` |
| `ALLOW_DATA_ATTR: false` | Data attributes blocked to prevent injection via custom attributes |

### 6.3 File upload security

| Control | Detail |
|--------|--------|
| Maximum file size | 50 MB enforced server-side |
| Extension whitelist | Only allowed: pdf, doc, docx, xls, xlsx, ppt, pptx, txt, csv, png, jpg, jpeg, gif, svg, mp4, webm |
| Blocked extensions | Explicitly blocked: exe, bat, cmd, sh, ps1, vbs, js, html, htm, php, scr, msi, dll |
| MIME type validation | MIME type must match the file extension; cross-checking prevents renaming (e.g. .exe → .pdf) |
| Blocked MIME types | Executable MIME types explicitly blocked regardless of extension |
| `application/octet-stream` | Allowed only if the file extension is in the whitelist (browsers sometimes send this for valid files) |
| Server-side validation | Validation runs server-side before upload to Vercel Blob; cannot be bypassed by client modification |

### 6.4 Rate limiting

| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| Login (credentials) | 10 requests | 15 minutes | IP + path |
| Registration | 5 requests | 15 minutes | IP + path |
| Forgot password | 3 requests | 15 minutes | IP + path |
| Reset password | 5 requests | 15 minutes | IP + path |
| MFA verification | 10 requests | 15 minutes | IP + path |

Rate limiting uses an in-memory sliding-window algorithm with periodic cleanup of expired entries. When a limit is exceeded, the server returns HTTP 429 with a `Retry-After: 900` header.

**Note:** In-memory rate limiting resets on serverless function cold starts. For high-traffic production deployments, consider migrating to a distributed rate limiter (e.g. Upstash Redis) for persistence across instances.

### 6.5 Cookie consent

A GDPR-compliant cookie consent banner is displayed to all first-time visitors. The banner:
- Clearly states only essential cookies are used (authentication and security)
- States no tracking cookies are used
- Links to the Privacy Policy
- Requires explicit acceptance via an "Accept" button
- Persists consent in `localStorage` (does not set additional cookies)
- Respects `prefers-reduced-motion` for animation

### 6.6 Accessibility

| Control | Detail |
|--------|--------|
| Reduced motion | CSS `prefers-reduced-motion` media query disables all transitions and animations |
| Semantic HTML | ARIA labels on interactive elements; proper heading hierarchy |
| Keyboard navigation | All interactive elements accessible via keyboard |
| Error feedback | Visible error messages with icons; screen-reader-compatible alerts |

---

## 7. Data Encryption

| Layer | Mechanism | Assessment |
|-------|-----------|------------|
| Data in transit (browser ↔ Vercel) | TLS 1.3, enforced by Vercel; HSTS preload (2 years) | ✅ Strong |
| Data in transit (Vercel ↔ Neon) | TLS (Neon default, enforced) | ✅ Strong |
| Data in transit (Vercel ↔ Gemini API) | TLS (Google default) | ✅ Strong |
| Data in transit (Vercel ↔ Resend) | TLS | ✅ Strong |
| Data at rest (Neon/Azure) | AES-256 (Azure managed encryption keys) | ✅ Strong |
| Data at rest (Vercel Blob) | AES-256 (Vercel/Cloudflare managed) | ✅ Strong |
| Data at rest (Vercel env vars) | Encrypted at rest by Vercel | ✅ Strong |
| Passwords | bcrypt hash (cost factor 12, irreversible) | ✅ Strong |
| TOTP secrets | Stored in database (encrypted at rest by Azure) | ✅ Adequate |
| API keys | SHA-256 hash stored; raw key shown only once at creation | ✅ Strong |
| JWT session tokens | HS256 signed with NEXTAUTH_SECRET; httpOnly, secure, sameSite cookies | ✅ Strong |
| Application-level field encryption | Not implemented for observation `notes` field | ⚠️ See §12 |

---

## 8. UK GDPR Compliance

### 8.1 Lawful basis for processing

| Data Type | Lawful Basis |
|-----------|-------------|
| Account registration data | Consent (Article 6(1)(a)) — collected at registration via consent checkbox |
| Child profiles and behavioural observations | Explicit Consent (Article 9(2)(a)) — collected at registration |
| AI-generated reports | Explicit Consent — covered by registration consent |
| Training progress | Legitimate Interests / Consent — minimal, non-sensitive |
| Survey responses | Consent — users choose to respond |
| Document library analytics | Legitimate Interests — anonymised view/download counts |

### 8.2 Consent record

Explicit consent is collected via a mandatory checkbox at registration. The checkbox text:
- References and links to the **Privacy Policy** (opens in new tab)
- References and links to the **Terms of Service** (opens in new tab)
- Explicitly mentions AI processing
- Explicitly mentions this is not a diagnostic tool
- States the user consents to personal data processing for ASD observation tracking and training

**SSO consent gap:** Users signing in via Google/Azure AD SSO do not pass through the registration form and therefore do not see the consent checkbox. However, SSO users must be pre-created by an admin, which implies organisational consent. **Recommendation:** Consider adding a first-login consent screen for SSO users.

### 8.3 Data subject rights

| Right | Implementation Status |
|-------|----------------------|
| Right of access (Article 15) | Manual process — contact DPO by email | ⚠️ Manual |
| Right to rectification (Article 16) | User can update profile fields in Settings | ✅ Partial |
| Right to erasure (Article 17) | Self-service account deletion in Settings; cascading deletion of all child data, observations, AI insights, training progress | ✅ Implemented |
| Right to data portability (Article 20) | Not implemented | ⚠️ Gap — see §12 |
| Right to restrict processing (Article 18) | Manual process — contact DPO | ⚠️ Manual |
| Right to withdraw consent | Achieved via account deletion in Settings | ✅ Functional |

### 8.4 Data retention

No automated retention policy is currently implemented. Data is retained for the lifetime of the user account.

**Recommendation:** Implement an automated process to flag accounts inactive for 24+ months for review, and notify users before purging. See §12.

### 8.5 Children's data

The platform stores data **about** children, not **accounts for** children. Accounts are held by adult caregivers (Practitioners). The children whose data is recorded are not users of the platform.

Processing of children's personal data requires the consent of a person holding parental responsibility. The registration consent checkbox implicitly assumes this, and the system requires child data to be entered only by the authenticated caregiver who owns that child profile.

**Data isolation:** Each child profile is scoped to its parent user via `userId`. API endpoints enforce ownership — a user can only access their own children's data. Cascading deletion ensures all child data is removed when a user account is deleted.

### 8.6 ICO registration

All organisations that process personal data in the UK are required to register with the Information Commissioner's Office (ICO) unless exempt. Charities processing only for their charitable purpose may qualify for the £40 tier or an exemption.

**Action required:** ICO registration status should be confirmed before live deployment to the public.

### 8.7 Data Protection Impact Assessment (DPIA)

Given the nature of the data (health-adjacent observations relating to children), a **DPIA is likely required** under Article 35 UK GDPR before large-scale deployment. A DPIA should be completed if the application will be used by more than a small number of internal users.

### 8.8 Cookie usage

The application uses only **essential cookies**:

| Cookie | Purpose | Duration | Type |
|--------|---------|----------|------|
| `next-auth.session-token` (dev) / `__Secure-next-auth.session-token` (prod) | JWT session authentication | 8 hours | Essential — httpOnly, secure, sameSite:lax |

No analytics cookies, tracking cookies, or third-party cookies are used. The cookie consent banner informs users of this.

---

## 9. Third-Party Processors

| Processor | Purpose | Data Shared | Location | Compliance | DPA |
|-----------|---------|-------------|----------|------------|-----|
| **Vercel Inc.** | Application hosting, CDN, serverless compute, blob storage | All application data passes through Vercel infrastructure; documents stored in Vercel Blob | US (global CDN, iad1 compute) | SOC 2 Type II, ISO 27001, HIPAA eligible | Available — review required |
| **Neon Inc.** (on Azure) | PostgreSQL database hosting | All stored personal data including special category data | Azure East US 2 | SOC 2 Type II (Neon); Azure: ISO 27001, SOC 2, HIPAA, PCI DSS | Available — review required |
| **Google LLC** | AI report generation (Gemini API) | Observation text only — no names, DOB, or account data | US | Google Cloud DPA; API terms: data not used for model training | Available — review required |
| **Resend Inc.** | Transactional email (password reset) | Email address and first name | US | Resend DPA | Available — review required |

**Action required:** Signed Data Processing Agreements (DPAs) should be in place with each processor before live deployment. Verify current SCCs / UK IDTA / DPF coverage for US transfers.

---

## 10. AI and Google Gemini Considerations

The platform generates AI insight reports by sending child observation data (behaviour descriptions, frequencies, domains) to Google Gemini (gemini-2.5-flash) via the Gemini API.

**Key considerations:**

1. **No diagnosis:** All prompts explicitly instruct the model to never diagnose or suggest autism. Every AI output includes a mandatory disclaimer: "This is not a diagnosis. This tool supports observation and pattern recognition only. Always consult a qualified healthcare professional." This disclaimer is also stored in the database with each insight.

2. **Data minimisation:** The prompts send observation records (behaviour type, domain, frequency, context, notes) but do not include child surnames, dates of birth, or user account information. This limits re-identification risk.

3. **Google data retention:** Under Google Cloud / Gemini API terms, API inputs are not used for model training and are not retained beyond the processing of the request. This should be confirmed in the DPA.

4. **Output accuracy:** AI-generated reports are supplementary to — not a replacement for — professional assessment. The platform includes explicit disclaimers on every page. Staff using the platform should be trained to communicate this to caregivers.

5. **AI-generated quiz questions:** Gemini is also used to generate quiz questions for the training content management system. These are reviewed by admin users before being published.

6. **AI-generated thumbnails:** Gemini can generate thumbnails for document library collections. These contain no personal data.

7. **Future model changes:** If the Gemini model version is updated, a review of output quality and disclaimer adequacy should be conducted.

---

## 11. Incident Response

In the event of a suspected personal data breach:

1. **Contain** — Immediately revoke affected credentials. Rotate `NEXTAUTH_SECRET` via Vercel environment variables (forces all sessions to expire). Rotate database credentials via Neon console. Deactivate compromised user accounts.

2. **Assess** — Determine what data was exposed, how many individuals are affected, and whether special category data (observations) was involved. Check application logs via Vercel dashboard.

3. **Report** — If the breach is likely to result in a risk to individuals' rights and freedoms, report to the ICO **within 72 hours** of becoming aware (Article 33 UK GDPR). If high risk, notify affected individuals directly (Article 34).

4. **Notify** — Contact affected users via the email addresses on record. Advise them to change passwords. If MFA secrets may be compromised, require MFA re-enrolment.

5. **Review** — Conduct a post-incident review and update controls accordingly.

**Credential rotation procedure:**
- `NEXTAUTH_SECRET` — change in Vercel dashboard → Environment Variables → redeploy. All existing sessions are immediately invalidated.
- Database URL — rotate in Neon console; update `DATABASE_URL` and `DIRECT_URL` in Vercel; redeploy.
- `GEMINI_API_KEY` — rotate in Google Cloud Console; update in Vercel; redeploy.
- `RESEND_API_KEY` — rotate in Resend dashboard; update in Vercel; redeploy.
- `BLOB_READ_WRITE_TOKEN` — rotate in Vercel Blob dashboard; update in Vercel; redeploy.

**Key contacts to prepare:**
- ICO breach reporting: ico.org.uk/for-organisations/report-a-breach
- Neon support: console.neon.tech
- Vercel support: vercel.com/support
- Google Cloud support: cloud.google.com/support

---

## 12. Known Gaps and Recommended Mitigations

### 12.1 Resolved since version 1.0

The following gaps identified in version 1.0 (28 March 2026) have been resolved:

| Gap (v1.0) | Resolution | Date |
|------------|-----------|------|
| No rate limiting on auth endpoints | ✅ Sliding-window rate limiter implemented on 5 auth endpoints | 29 March 2026 |
| No MFA option | ✅ TOTP MFA implemented; mandatory for all admin roles; middleware-enforced | Previously implemented |
| No brute force protection | ✅ Addressed via rate limiting (above) | 29 March 2026 |
| Admin password is `admin123` (seeded) | ✅ Forced password change (`mustChangePassword`) flag; password complexity enforced | 29 March 2026 |
| No audit log | ✅ Document library view/download events tracked; integration API key usage tracked | Previously implemented |
| Only 3 roles defined | ✅ 8 roles with granular RBAC and charity permission system | Previously implemented |
| Password minimum only 8 chars | ✅ Increased to 10 chars with uppercase, lowercase, number, and special character requirements | 31 March 2026 |
| No security headers | ✅ CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy | 29 March 2026 |
| No XSS protection on HTML content | ✅ DOMPurify sanitisation on all `dangerouslySetInnerHTML` usage | 29 March 2026 |
| No file upload validation | ✅ Extension whitelist, MIME cross-checking, size limits, blocked types | 31 March 2026 |
| No cookie consent | ✅ GDPR-compliant cookie consent banner with privacy policy link | 31 March 2026 |
| No error boundaries | ✅ Loading and error boundaries for all 6 route groups | 29 March 2026 |
| Build ignoring TypeScript errors | ✅ `ignoreBuildErrors` removed; TS errors now caught at build time | 29 March 2026 |
| SSO password nullable issue | ✅ `password` field made nullable in schema; bcrypt.compare guard added | 29 March 2026 |
| SAML session too long (30 days) | ✅ Reduced to 8 hours to match NextAuth session maxAge | 29 March 2026 |

### 12.2 Remaining gaps

| Gap | Risk | Recommended Mitigation | Priority |
|-----|------|------------------------|----------|
| SSO users bypass consent checkbox | GDPR consent record incomplete for Google/Azure/SAML sign-ins | Show consent screen on first SSO sign-in before granting access | **Medium** |
| No automated data retention | Stale data accumulates; GDPR retention obligations | Implement a cron job to flag/delete accounts inactive for 24+ months | **Medium** |
| No data export (portability) | GDPR Article 20 right to portability not met | Build a "Download my data" feature exporting observations as JSON/CSV | **Medium** |
| Application-level field encryption | Observation notes stored in plaintext in DB (encrypted at rest by Azure, but not at application level) | Consider encrypting `notes` fields at application level for additional defence in depth | **Low** |
| No signed DPAs with processors | GDPR Article 28 compliance incomplete | Obtain and file signed DPAs with Vercel, Neon, Google, Resend | **High** |
| ICO registration unconfirmed | Regulatory non-compliance risk | Confirm registration status and register if required before public launch | **High** |
| No DPIA completed | Required for large-scale processing of health-adjacent child data | Complete DPIA before deploying to more than a pilot user group | **High** |
| Resend email domain not verified | Password reset emails may be blocked or go to spam | Verify `ambitiousaboutautism.org.uk` domain in Resend dashboard and add SPF/DKIM records | **Medium** |
| No error tracking/monitoring | Cannot detect runtime errors in production proactively | Add Sentry or similar APM for error alerting | **Medium** |
| CSP uses `unsafe-inline`/`unsafe-eval` | Slightly reduced XSS protection (mitigated by DOMPurify) | Investigate nonce-based CSP for Next.js | **Low** |
| In-memory rate limiting | Resets on cold starts; not shared across serverless instances | Consider Upstash Redis for distributed rate limiting at scale | **Low** |
| No formal penetration test | Unknown vulnerabilities may exist | Commission external penetration test before public launch | **Medium** |
| TOTP secrets not app-level encrypted | Stored encrypted at rest by Azure, but visible in database queries | Consider app-level encryption with a dedicated key | **Low** |

---

## 13. Compliance Checklist — Pre-Launch

| Item | Status | Owner |
|------|--------|-------|
| Change default admin password | ✅ Enforced via `mustChangePassword` + complexity rules | Development |
| Rate limiting on auth endpoints | ✅ Implemented | Development |
| MFA for admin roles | ✅ Implemented and enforced | Development |
| Password complexity requirements | ✅ Implemented (10+ chars, mixed case, number, special) | Development |
| Security headers (CSP, HSTS, etc.) | ✅ Implemented | Development |
| XSS sanitisation | ✅ Implemented (DOMPurify) | Development |
| File upload validation | ✅ Implemented | Development |
| Cookie consent banner | ✅ Implemented | Development |
| Terms of Service page | ✅ Published at /terms | Development |
| Privacy Policy page | ✅ Published at /privacy | Development |
| Error boundaries | ✅ All route groups covered | Development |
| Confirm ICO registration | ⬜ Pending | DPO / Legal |
| Sign DPAs (Vercel, Neon, Google, Resend) | ⬜ Pending | DPO / Legal |
| Complete DPIA | ⬜ Pending | DPO |
| Verify email domain (Resend SPF/DKIM) | ⬜ Pending | IT / Development |
| Commission penetration test | ⬜ Pending | Security |
| SSO first-login consent screen | ⬜ Pending | Development |
| Data export feature (GDPR portability) | ⬜ Pending | Development |
| Error monitoring (Sentry) | ⬜ Pending | Development |
| Staff training on AI disclaimers | ⬜ Pending | Operations |

---

## 14. Conclusion & Risk Rating

The application has comprehensive technical security controls: strong password hashing with complexity requirements, TOTP MFA enforced for all admin roles, role-based access control across 8 roles with granular permissions, rate limiting on all authentication endpoints, XSS prevention via DOMPurify, security headers including CSP and HSTS, file upload validation with MIME cross-checking, and a GDPR-compliant cookie consent mechanism. The hosting infrastructure (Vercel, Neon/Azure) provides SOC 2 Type II certified environments with encryption at rest and in transit.

Remaining gaps are primarily administrative and procedural rather than technical:
- Signed DPAs with all processors
- ICO registration confirmation
- DPIA completion
- Email domain verification
- External penetration test

**Overall risk rating: LOW-MEDIUM**
Technical controls are comprehensive. Administrative items should be resolved before broad public deployment but do not represent exploitable vulnerabilities.

**Minimum requirements before public launch:**
1. ✅ ~~Change default admin password~~ (enforced)
2. ✅ ~~Rate limiting~~ (implemented)
3. ✅ ~~MFA for admins~~ (implemented)
4. ⬜ Confirm ICO registration
5. ⬜ Obtain signed DPAs with Vercel, Neon, Google, and Resend
6. ⬜ Complete a DPIA
7. ⬜ Verify Resend email domain (SPF/DKIM)

---

*This document should be reviewed and updated whenever significant changes are made to the application architecture, data flows, third-party processors, or security controls.*
