# Security & Compliance Review
## Ambitious About Autism — ASD Training Platform

**Document version:** 3.0
**Date:** 26 April 2026
**Classification:** Internal — For review by CISO, DPO, or Information Governance lead
**Prepared by:** Development team
**Previous version:** 2.0 (1 April 2026)

**Material changes since v2.0:** The child-observation feature (`Child`, `Observation`, `AiInsight` models and associated `/children` routes) has been removed from the platform. This document has been updated to remove all references to special-category health-adjacent data processing. The platform now handles only ordinary personal data (training records, CV/careers content authored by adult users, organisational data). All AI processing is now routed through the **Vercel AI Gateway** rather than Google Gemini directly. SCORM 1.2 / 2004 package hosting has been added.

---

## 1. Executive Summary

This document provides a comprehensive security and compliance review of the Ambitious About Autism web application — a multi-tenant platform designed for caregivers, early-years practitioners, careers professionals, autistic students, interns, employees, and organisation staff to access ASD awareness training, careers training, virtual workshops, document libraries, CV building tools, an AI careers advisor, and a job-opening directory.

The application handles **ordinary personal data** under the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018. It does not store information *about* children, health records, or any other Article 9 special-category data. The data inventory consists of adult user account information, training records, CV / careers content authored by the user themselves, organisational metadata, and document-library files chosen for upload by administrators.

The platform supports administrative roles (charity admin, charity employees with delegated permissions, organisation admins) and end-user roles (practitioners, careers professionals, students, interns, employees). MFA is mandatory for all administrative roles.

**Overall risk rating: LOW**
The application has comprehensive technical security controls. Remaining items are primarily administrative (signed DPAs, ICO registration confirmation) rather than technical.

---

## 2. Data Classification

| Data Type | Sensitivity | Stored Where | Encryption at Rest | Retention |
|-----------|-------------|--------------|-------------------|-----------|
| User name and email | Personal Data (Article 4 UK GDPR) | Neon PostgreSQL | AES-256 (Azure managed) | Until account deletion |
| Hashed password (bcrypt, cost 12) | Personal Data | Neon PostgreSQL | AES-256 + bcrypt hash | Until account deletion |
| Training progress records (CMI snapshots, completion, score) | Personal Data | Neon PostgreSQL | AES-256 (Azure managed) | Until account deletion |
| CV content authored by the user (work history, education, skills, interests, references, personal statement) | Personal Data | Neon PostgreSQL | AES-256 (Azure managed) | Until account deletion |
| Careers Advisor questionnaire answers and AI-generated reports | Personal Data | Neon PostgreSQL | AES-256 (Azure managed) | Until account deletion |
| Document library files (organisational documents chosen by admins for upload) | Organisational data | Vercel Blob storage | AES-256 (Vercel/Cloudflare managed) | Until admin deletion |
| SCORM packages (third-party e-learning content uploaded by admins) | Organisational data | Vercel Blob storage | AES-256 | Until admin deletion |
| Survey responses | Personal Data | Neon PostgreSQL | AES-256 (Azure managed) | Until survey deletion |
| Lesson notes (free-text personal notes per lesson) | Personal Data | Neon PostgreSQL | AES-256 (Azure managed) | Until account deletion |
| TOTP MFA secrets | Personal Data (sensitive) | Neon PostgreSQL | AES-256 (Azure managed) | Until MFA disabled/account deletion |
| JWT session tokens | Personal Data | Client-side cookie (httpOnly) | HTTPS transport, signed (HS256) | 8 hours (maxAge) |
| Password reset tokens | Personal Data | Neon PostgreSQL | AES-256 (Azure managed) | 1 hour (auto-expired) |
| Integration API key hashes | Organisational data | Neon PostgreSQL | AES-256 + SHA-256 hash | Until key revocation |
| SAML SSO certificates | Organisational data (sensitive) | Neon PostgreSQL | AES-256 (Azure managed) | Until SSO config removal |

**No Article 9 special-category data.** The platform does not store health records, biometric data, or any data about identified or identifiable third parties (including children). All personal data on the platform is supplied by adult users about themselves, or by administrators about adult colleagues they are inviting.

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
  ├── XSS sanitisation layer (`sanitize-html` on all HTML output)
  └── Input validation (Zod schemas, server-side)
        │
        ├──► Neon PostgreSQL (Azure East US 2, ep-blue-thunder.eastus2.azure.neon.tech)
        │        Pooled connection (PgBouncer, port 6543) for runtime
        │        Direct connection (port 5432) for migrations only
        │        TLS enforced on all connections
        │        AES-256 encryption at rest (Azure managed)
        │
        ├──► Vercel AI Gateway (provider/model strings)
        │        Routes AI calls to Gemini, Claude, or OpenAI per-prompt
        │        Used for: CV writing assistance, Careers Advisor reports,
        │        survey insights, training quiz/content generation,
        │        library collection metadata
        │        No special-category data sent — only user-authored CV/careers
        │        content, survey responses, or training material excerpts
        │        Provider terms: API inputs not used for model training
        │
        ├──► Vercel Blob Storage (document library, SCORM packages, TTS cache, CV uploads)
        │        Authenticated uploads via server-side token
        │        File type/MIME validation before upload
        │
        ├──► ElevenLabs (text-to-speech for the lesson read-aloud feature)
        │        Lesson text only — no user identifiers
        │        Synthesised MP3s cached on Vercel Blob (SHA-256 keyed)
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

### 4.4 Vercel AI Gateway (AI Processing)

| Aspect | Detail |
|--------|--------|
| **Provider** | Vercel Inc. (the AI Gateway is a Vercel-operated service that proxies to upstream model providers) |
| **Models** | Gemini, Claude, GPT — selected per-prompt via provider/model strings (e.g. `google/gemini-2.5-flash`, `anthropic/claude-sonnet-4`, `openai/gpt-4o-mini`) |
| **Authentication** | `AI_GATEWAY_API_KEY` (server-side only; never sent to the browser) |
| **Use cases** | CV writing assistance, Careers Advisor report generation, survey AI insights, training quiz/content generation from uploaded documents, document-library collection metadata |
| **Data minimisation** | Only the content needed for the specific feature is sent. CV: the user's own CV draft. Careers Advisor: the user's questionnaire answers. Survey insights: aggregate anonymised response counts. Quiz generation: lesson text supplied by the admin. **No user identifiers, account data, or special-category data is transmitted.** |
| **Provider data retention** | Upstream provider DPAs (Google Cloud, Anthropic, OpenAI) state API inputs are not used for model training and are not retained beyond processing. The Vercel AI Gateway adds an observability/usage-logging layer that the org should review when signing the Vercel DPA. |
| **DPA available** | Yes — Vercel DPA covers the gateway; upstream provider DPAs cover the models. |

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
| `CAREGIVER` | Practitioner | ASD awareness training, virtual workshops, document library, lesson notes |
| `CAREER_DEV_OFFICER` | Careers Professional | Careers CPD training, CV Builder, AI Careers Advisor, virtual workshops, document library, jobs, plus same-organisation read access to student CVs and careers reports |
| `STUDENT` | Student | Training only — assigned training programs |
| `INTERN` | Intern | Training only — assigned training programs |
| `EMPLOYEE` | Employee | Training only — assigned training programs |

**Access enforcement:**
- All API routes verify session and role on every request
- Middleware enforces route-level access: admin roles cannot access leaf-role routes (and vice versa)
- User-owned data (CVs, careers sessions, lesson notes, training progress) is filtered by `userId` — cross-user data access is not possible
- Organisation-scoped queries filter by `organisationId` — cross-org data access is not possible
- Admin actions (user creation, training editing, etc.) verify appropriate role before execution
- CHARITY_EMPLOYEE users have granular permission checks via `hasPermission()` helper across nine permissions (manage_organisations, manage_training, manage_surveys, manage_announcements, view_reports, manage_sessions, manage_library, manage_ai_prompts, manage_jobs)
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

**Content Security Policy (CSP) directives** (current production CSP — see `next.config.js`):
- `default-src 'self'`
- `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com` — Stripe.js for payment flows; `unsafe-*` required for Next.js hydration and the react-quill WYSIWYG editor
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` — Google Fonts (Lexend) and Tailwind utility styles
- `img-src 'self' data: blob: https://via.placeholder.com https://placehold.co https://*.public.blob.vercel-storage.com https://*.stripe.com`
- `font-src 'self' https://fonts.gstatic.com`
- `connect-src 'self' https://generativelanguage.googleapis.com https://api.stripe.com https://vercel.com https://blob.vercel-storage.com https://*.public.blob.vercel-storage.com` — AI Gateway / direct Gemini fallback, Stripe API, and Vercel Blob client-direct uploads
- `media-src 'self' blob: https://*.public.blob.vercel-storage.com` — `blob:` is required for the TTS player's `<audio>` element
- `frame-src 'self' https://www.youtube.com https://player.vimeo.com https://js.stripe.com https://hooks.stripe.com`
- `frame-ancestors 'self'`

The `/api/scorm/[lessonId]/[...path]` route emits its own per-asset CSP (more permissive within the iframe; restricts external loads).

**CSP notes:** `unsafe-inline` and `unsafe-eval` are required for Next.js page hydration and the react-quill rich text editor. A nonce-based CSP is documented as a future improvement.

### 6.2 XSS prevention

| Control | Implementation |
|---------|---------------|
| React auto-escaping | React escapes all interpolated values by default |
| HTML sanitisation | All `dangerouslySetInnerHTML` usage (training lesson content, interactive blocks, survey results) passes through `sanitize-html` with an explicit whitelist of allowed HTML tags and attributes. (`isomorphic-dompurify` was previously used and was swapped out — the project no longer depends on `jsdom` at runtime.) |
| Tag whitelist | Only formatting tags allowed: headings, paragraphs, lists, links, images, tables, code blocks, text formatting |
| Attribute whitelist | Only safe attributes: `href`, `target`, `rel`, `src`, `alt`, `class`, `style`, `width`, `height`, `colspan`, `rowspan` |
| Data attributes | Blocked from sanitiser output to prevent injection via custom attributes |

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
| Data in transit (Vercel ↔ AI Gateway) | TLS (Vercel default) | ✅ Strong |
| Data in transit (Vercel ↔ Resend) | TLS | ✅ Strong |
| Data in transit (Vercel ↔ ElevenLabs) | TLS | ✅ Strong |
| Data at rest (Neon/Azure) | AES-256 (Azure managed encryption keys) | ✅ Strong |
| Data at rest (Vercel Blob) | AES-256 (Vercel/Cloudflare managed) | ✅ Strong |
| Data at rest (Vercel env vars) | Encrypted at rest by Vercel | ✅ Strong |
| Passwords | bcrypt hash (cost factor 12, irreversible) | ✅ Strong |
| TOTP secrets | Stored in database (encrypted at rest by Azure) | ✅ Adequate |
| API keys | SHA-256 hash stored; raw key shown only once at creation | ✅ Strong |
| JWT session tokens | HS256 signed with NEXTAUTH_SECRET; httpOnly, secure, sameSite cookies | ✅ Strong |
| Application-level field encryption | Not implemented for free-text fields (lesson notes, CV bodies). At-rest encryption is provided by Azure (Neon) and Vercel Blob; defence-in-depth field encryption is a low-priority enhancement — see §12. |

---

## 8. UK GDPR Compliance

### 8.1 Lawful basis for processing

| Data Type | Lawful Basis |
|-----------|-------------|
| Account registration data | Consent (Article 6(1)(a)) — collected at registration / SSO first sign-in |
| Training progress and SCORM CMI snapshots | Legitimate Interests / Consent — minimal personal data needed to deliver the training service |
| CV content and Careers Advisor questionnaire answers | Consent — users opt in by choosing to use the feature |
| AI-generated reports (CV / Careers / survey insights / quiz / library metadata) | Consent — generated only at the user's request |
| Survey responses | Consent — users choose to respond |
| Document library and SCORM analytics (downloads, views, quiz aggregates) | Legitimate Interests — anonymised counts and aggregates only; never per-learner |

### 8.2 Consent record

Self-registration is **disabled** on this platform — all user accounts are created by an administrator. The administrator presents the Privacy Policy and Terms of Service to the invitee out-of-band (e.g. via the printable QR credential card given to new users). The user is then required to set their own password on first login (`mustChangePassword` flag), at which point they have agreed to the platform's terms by continuing.

**SSO and SAML sign-ins** also do not see a consent checkbox — these users are pre-created by their organisation admin, who is responsible for ensuring the user has agreed to the relevant terms before being onboarded.

**Recommendation:** Consider adding a first-login consent acknowledgement screen for all user types, including SSO, before any feature is exposed.

### 8.3 Data subject rights

| Right | Implementation Status |
|-------|----------------------|
| Right of access (Article 15) | Manual process — contact DPO by email | ⚠️ Manual |
| Right to rectification (Article 16) | User can update profile fields in Settings | ✅ Partial |
| Right to erasure (Article 17) | Self-service account deletion in Settings; cascading deletion of all training progress, CV content, Careers Advisor sessions, lesson notes, and survey responses | ✅ Implemented |
| Right to data portability (Article 20) | Not implemented | ⚠️ Gap — see §12 |
| Right to restrict processing (Article 18) | Manual process — contact DPO | ⚠️ Manual |
| Right to withdraw consent | Achieved via account deletion in Settings | ✅ Functional |

### 8.4 Data retention

No automated retention policy is currently implemented. Data is retained for the lifetime of the user account.

**Recommendation:** Implement an automated process to flag accounts inactive for 24+ months for review, and notify users before purging. See §12.

### 8.5 Children's data

**The platform does not store data about children.** All user accounts and content belong to adults — practitioners, careers professionals, organisation staff, students (16+), interns, employees, and administrators. The previously-shipped child-observation feature has been removed (see version history at the top of this document).

Where the platform is used by **users aged 16 or 17** in a school or college setting (e.g. STUDENT role), the standard UK GDPR rules for older minors apply: data subjects of this age can ordinarily provide their own consent, but the contracting organisation should ensure appropriate parental notification where school-policy requires it.

### 8.6 ICO registration

All organisations that process personal data in the UK are required to register with the Information Commissioner's Office (ICO) unless exempt. Charities processing only for their charitable purpose may qualify for the £40 tier or an exemption.

**Action required:** ICO registration status should be confirmed before live deployment to the public.

### 8.7 Data Protection Impact Assessment (DPIA)

The platform now processes only ordinary personal data — there is no health, biometric, or other Article 9 special-category data. A DPIA is **not strictly required** under Article 35 UK GDPR for the current data inventory, but the ICO recommends one whenever a new system will process personal data at scale, profile users, or use AI for decisions that affect individuals. Given this platform uses LLMs to generate CV / careers / training content for users — outputs that the user may rely on — a lightweight DPIA is recommended before rolling out to the wider charity audience, focusing on:

- The user-perceived authority of AI outputs (mitigated by explicit disclaimers in the UI and prompt text)
- The Vercel AI Gateway data flow and upstream provider DPAs
- Document-library and SCORM upload validation
- The third-party processors (Vercel, Neon, Resend, ElevenLabs) and their UK / EU transfer mechanisms

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
| **Vercel Inc.** | Application hosting, CDN, serverless compute, Blob storage, AI Gateway | All application data passes through Vercel infrastructure; documents and SCORM packages stored in Vercel Blob; AI prompts proxied through Vercel AI Gateway | US (global CDN, iad1 compute) | SOC 2 Type II, ISO 27001, HIPAA eligible | Available — review required |
| **Neon Inc.** (on Azure) | PostgreSQL database hosting | All stored personal data | Azure East US 2 | SOC 2 Type II (Neon); Azure: ISO 27001, SOC 2, HIPAA, PCI DSS | Available — review required |
| **Google LLC / Anthropic / OpenAI** (sub-processors via Vercel AI Gateway) | LLM inference for CV writing, Careers Advisor reports, survey insights, training content / quiz generation, library metadata | User-authored content only — CV drafts, questionnaire answers, lesson text excerpts. No identifiers, no special-category data. | US | Provider terms via Vercel; provider DPAs available directly | Available — review required |
| **Resend Inc.** | Transactional email (password reset) | Email address and first name | US | Resend DPA | Available — review required |
| **ElevenLabs Inc.** | Text-to-speech for the lesson read-aloud feature | Lesson text only (no user identifiers) | US | ElevenLabs DPA | Available — review required |

**Action required:** Signed Data Processing Agreements (DPAs) should be in place with each processor before live deployment. Verify current SCCs / UK IDTA / DPF coverage for US transfers.

---

## 10. AI Considerations

All AI features route through the **Vercel AI Gateway** with provider/model selection per-prompt (Gemini, Claude, GPT). Prompts live in the `AiPrompt` database table and can be tuned without redeploying. The runtime entry point is `lib/ai-runner.ts:runPrompt(key, values)`.

**AI features in the platform:**

| Feature | Data Sent | Output |
|---------|-----------|--------|
| CV Builder writing assistance | The user's own CV draft (personal statement, work experience entries, etc.) | Rephrased / generated CV prose |
| AI Careers Advisor | The user's questionnaire answers (interests, strengths, environment preferences, etc.) | Structured careers report (strengths, suggestions, next steps, workplace support) |
| Survey AI insights | Aggregate, anonymised survey response counts and texts | Summary, comparative, or recommendation report |
| Training quiz generation | Lesson text supplied by an admin | Multiple-choice question candidates for admin review |
| Training content generation from files | PDF/DOCX/PPTX text uploaded by an admin | Module / lesson / quiz scaffolds for admin review |
| Document library metadata | Document text uploaded by an admin | Collection description / thumbnail prompt |

**Key considerations:**

1. **No diagnosis or autism inference.** All prompts explicitly instruct the model never to diagnose or suggest autism, and to use strength-focused, UK English language. CV and Careers Advisor prompts reference UK-specific resources (Access to Work, National Careers Service) without referencing disability status.

2. **Data minimisation.** The runner sends only the inputs needed for the specific feature. No user identifiers, account data, organisation data, training records, or data about other users are transmitted.

3. **Provider data retention.** Vercel's AI Gateway proxies to Google, Anthropic, and OpenAI under terms that exclude API inputs from model training and limit retention to the processing window. The Vercel DPA covers the gateway layer; upstream provider DPAs cover the model layer.

4. **Output accuracy.** AI-generated content is presented to admin / user for review and editing before any persistent action. CV outputs land in a draft the user must accept; quiz / content generation lands in an editor the admin must approve. No AI output is published to learners without human review.

5. **Rate limiting.** Per-user rate limiters prevent runaway usage (CV AI: 10/5min; Careers Advisor: 10/5min). The Vercel AI Gateway also surfaces usage metrics for cost monitoring.

6. **Model swaps.** Models can be changed per-prompt via the AI Prompts admin UI without code changes. Any model swap should be followed by a sample-output review by an admin to confirm tone and accuracy match expectations.

---

## 11. Incident Response

In the event of a suspected personal data breach:

1. **Contain** — Immediately revoke affected credentials. Rotate `NEXTAUTH_SECRET` via Vercel environment variables (forces all sessions to expire). Rotate database credentials via Neon console. Deactivate compromised user accounts.

2. **Assess** — Determine what data was exposed, how many individuals are affected, and which categories of personal data were involved. Check application logs via Vercel dashboard.

3. **Report** — If the breach is likely to result in a risk to individuals' rights and freedoms, report to the ICO **within 72 hours** of becoming aware (Article 33 UK GDPR). If high risk, notify affected individuals directly (Article 34).

4. **Notify** — Contact affected users via the email addresses on record. Advise them to change passwords. If MFA secrets may be compromised, require MFA re-enrolment.

5. **Review** — Conduct a post-incident review and update controls accordingly.

**Credential rotation procedure:**
- `NEXTAUTH_SECRET` — change in Vercel dashboard → Environment Variables → redeploy. All existing sessions are immediately invalidated.
- Database URL — rotate in Neon console; update `DATABASE_URL` and `DIRECT_URL` in Vercel; redeploy.
- `AI_GATEWAY_API_KEY` — rotate in the Vercel AI Gateway dashboard; update in Vercel project env vars; redeploy.
- `GEMINI_API_KEY` — legacy direct provider key; rotate in Google AI Studio if used.
- `RESEND_API_KEY` — rotate in Resend dashboard; update in Vercel; redeploy.
- `ELEVENLABS_API_KEY` — rotate in ElevenLabs dashboard; update in Vercel; redeploy.
- `BLOB_READ_WRITE_TOKEN` — rotate in Vercel Blob dashboard; update in Vercel; redeploy.

**Key contacts to prepare:**
- ICO breach reporting: ico.org.uk/for-organisations/report-a-breach
- Neon support: console.neon.tech
- Vercel support: vercel.com/support
- Vercel support (incl. AI Gateway): vercel.com/support
- Resend support: resend.com/support
- ElevenLabs support: elevenlabs.io/support

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
| SSO / first-login consent gap | GDPR consent record incomplete for SSO and admin-created accounts | Show consent screen on first sign-in before granting access | **Medium** |
| No automated data retention | Stale data accumulates; GDPR retention obligations | Implement a scheduled job to flag/delete accounts inactive for 24+ months | **Medium** |
| No data export (portability) | GDPR Article 20 right to portability not met | Build a "Download my data" feature exporting training, CV, careers, and survey data as JSON/CSV | **Medium** |
| Application-level field encryption | Free-text fields (lesson notes, CV bodies) stored in plaintext in DB (encrypted at rest by Azure, but not at application level) | Consider encrypting these fields at application level for defence in depth | **Low** |
| No signed DPAs with processors | GDPR Article 28 compliance incomplete | Obtain and file signed DPAs with Vercel (covers AI Gateway + Blob + hosting), Neon, Resend, ElevenLabs. Verify upstream LLM provider DPAs with Google / Anthropic / OpenAI as needed. | **High** |
| ICO registration unconfirmed | Regulatory non-compliance risk | Confirm registration status and register if required before public launch | **High** |
| DPIA not completed | Article 35 not strictly required for current data inventory, but ICO recommends one for AI-assisted features | Complete a lightweight DPIA covering AI Gateway flows + LLM outputs + third-party processors | **Medium** |
| Resend email domain not verified | Password reset emails may be blocked or go to spam | Verify `ambitiousaboutautism.org.uk` domain in Resend dashboard and add SPF/DKIM records | **Medium** |
| No error tracking/monitoring | Cannot detect runtime errors in production proactively | Add Sentry or similar APM for error alerting | **Medium** |
| CSP uses `unsafe-inline`/`unsafe-eval` | Slightly reduced XSS protection (mitigated by `sanitize-html`) | Investigate nonce-based CSP for Next.js | **Low** |
| In-memory rate limiting | Resets on cold starts; not shared across serverless instances | Consider Upstash Redis for distributed rate limiting at scale | **Low** |
| No formal penetration test | Unknown vulnerabilities may exist | Commission external penetration test before public launch | **Medium** |
| TOTP secrets not app-level encrypted | Stored encrypted at rest by Azure, but visible in database queries | Consider app-level encryption with a dedicated key | **Low** |
| SCORM iframe sandbox warning | The iframe sandbox uses both `allow-scripts` and `allow-same-origin` (browser flags this as "could escape sandboxing"). Same-origin is required so SCO subresource requests carry the session cookie. | Implement signed-URL authentication for SCORM asset requests so the iframe can be sandboxed without `allow-same-origin`. Skeleton in `public/scorm-runtime/api-shim.js`. | **Low** |

---

## 13. Compliance Checklist — Pre-Launch

| Item | Status | Owner |
|------|--------|-------|
| Change default admin password | ✅ Enforced via `mustChangePassword` + complexity rules | Development |
| Rate limiting on auth endpoints | ✅ Implemented | Development |
| MFA for admin roles | ✅ Implemented and enforced | Development |
| Password complexity requirements | ✅ Implemented (10+ chars, mixed case, number, special) | Development |
| Security headers (CSP, HSTS, etc.) | ✅ Implemented | Development |
| XSS sanitisation | ✅ Implemented (`sanitize-html`) | Development |
| File upload validation | ✅ Implemented | Development |
| Cookie consent banner | ✅ Implemented | Development |
| Terms of Service page | ✅ Published at /terms | Development |
| Privacy Policy page | ✅ Published at /privacy | Development |
| Error boundaries | ✅ All route groups covered | Development |
| Confirm ICO registration | ⬜ Pending | DPO / Legal |
| Sign DPAs (Vercel, Neon, Resend, ElevenLabs; verify upstream LLM provider DPAs via Vercel AI Gateway) | ⬜ Pending | DPO / Legal |
| Complete DPIA (AI flows + processors) | ⬜ Pending | DPO |
| Verify email domain (Resend SPF/DKIM) | ⬜ Pending | IT / Development |
| Commission penetration test | ⬜ Pending | Security |
| SSO first-login consent screen | ⬜ Pending | Development |
| Data export feature (GDPR portability) | ⬜ Pending | Development |
| Error monitoring (Sentry) | ⬜ Pending | Development |
| Staff training on AI disclaimers | ⬜ Pending | Operations |

---

## 14. Conclusion & Risk Rating

The application has comprehensive technical security controls: strong password hashing with complexity requirements, TOTP MFA enforced for all admin roles, role-based access control across 8 roles with granular permissions, rate limiting on all authentication endpoints, XSS prevention via `sanitize-html`, security headers including CSP and HSTS, file upload validation with MIME cross-checking, and a GDPR-compliant cookie consent mechanism. The hosting infrastructure (Vercel, Neon/Azure) provides SOC 2 Type II certified environments with encryption at rest and in transit.

The platform handles only ordinary personal data — no Article 9 special-category data is processed. The previously-shipped child-observation feature has been removed.

Remaining gaps are primarily administrative and procedural rather than technical:
- Signed DPAs with all processors (Vercel, Neon, Resend, ElevenLabs; upstream LLM providers via the Vercel AI Gateway)
- ICO registration confirmation
- Lightweight DPIA covering AI flows
- Email domain verification
- External penetration test

**Overall risk rating: LOW**
Technical controls are comprehensive. Administrative items should be resolved before broad public deployment but do not represent exploitable vulnerabilities.

**Minimum requirements before public launch:**
1. ✅ ~~Change default admin password~~ (enforced)
2. ✅ ~~Rate limiting~~ (implemented)
3. ✅ ~~MFA for admins~~ (implemented)
4. ⬜ Confirm ICO registration
5. ⬜ Obtain signed DPAs with Vercel, Neon, Resend, and ElevenLabs (and verify upstream LLM provider DPAs via Vercel AI Gateway)
6. ⬜ Complete a DPIA covering AI flows
7. ⬜ Verify Resend email domain (SPF/DKIM)

---

*This document should be reviewed and updated whenever significant changes are made to the application architecture, data flows, third-party processors, or security controls.*
