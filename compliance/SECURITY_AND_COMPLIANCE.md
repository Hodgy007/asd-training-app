# Security & Compliance Review
## Ambitious About Autism — ASD Training & Observation Platform

**Document version:** 1.0
**Date:** 28 March 2026
**Classification:** Internal — For review by CISO, DPO, or Information Governance lead
**Prepared by:** Development team

---

## 1. Executive Summary

This document provides a security and compliance review of the Ambitious About Autism web application — a platform designed for caregivers, early years practitioners, and careers professionals to access ASD awareness training and log structured behavioural observations for children in their care.

The application handles **special category personal data** (health-adjacent observations relating to children's developmental behaviour) and is therefore subject to heightened data protection obligations under the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.

**Overall risk rating: MEDIUM**
The application has appropriate foundational security controls in place. Key gaps exist around email domain ownership for transactional mail, data retention automation, and formal ICO registration. These are documented below with recommended mitigations.

---

## 2. Data Classification

| Data Type | Sensitivity | Stored Where | Retention |
|-----------|-------------|--------------|-----------|
| User name and email | Personal Data (Article 4 UK GDPR) | Neon PostgreSQL | Until account deletion |
| Hashed password (bcrypt, cost 12) | Personal Data | Neon PostgreSQL | Until account deletion |
| Child first name and date of birth | Personal Data (child — heightened sensitivity) | Neon PostgreSQL | Until account deletion |
| Behavioural observations (domain, frequency, context, notes) | **Special Category Data** (Article 9 — health-adjacent) | Neon PostgreSQL | Until account deletion |
| AI-generated insight reports | Special Category Data (derived) | Neon PostgreSQL | Until account deletion |
| Training progress records | Personal Data | Neon PostgreSQL | Until account deletion |
| NextAuth session tokens | Personal Data | Neon PostgreSQL | Session lifetime |
| Password reset tokens | Personal Data | Neon PostgreSQL | 1 hour (auto-expired) |

**Note on special category classification:** The behavioural observations recorded on this platform relate to potential neurodevelopmental differences in children. Although the platform explicitly does not diagnose, the data is sufficiently health-adjacent to be treated as special category data requiring explicit consent under Article 9(2)(a) UK GDPR.

---

## 3. Data Flow

```
User (browser, HTTPS)
        │
        ▼
Vercel Edge Network (TLS 1.3, global CDN)
        │
        ▼
Next.js Application (Vercel Serverless Functions, Node.js 24, iad1 — Washington DC)
        │
        ├──► Neon PostgreSQL (Azure East US 2, ep-blue-thunder.eastus2.azure.neon.tech)
        │        Pooled connection (PgBouncer, port 6543) for runtime
        │        Direct connection (port 5432) for migrations only
        │
        ├──► Google Gemini API (gemini-1.5-flash)
        │        Observation text sent on AI report request only
        │        Google API terms: data not used for model training
        │
        └──► Resend (transactional email)
                 Email address + name sent for password reset only
                 Resend infrastructure: US-based
```

**International transfers:** Both Neon (Azure East US 2) and Resend are US-based processors. Transfers from the UK to the US are covered under the UK Extension to the EU-US Data Privacy Framework and/or Standard Contractual Clauses (SCCs) in the respective processor agreements. Organisations deploying this application should verify current transfer mechanisms with each processor.

---

## 4. Authentication & Access Controls

### Authentication mechanism

| Control | Implementation | Assessment |
|---------|---------------|------------|
| Password hashing | bcrypt, cost factor 12 | ✅ Strong |
| Password minimum length | 8 characters (enforced server-side via Zod) | ✅ Adequate |
| Session strategy | JWT (NextAuth v4, HS256) | ✅ Acceptable |
| Session secret | `NEXTAUTH_SECRET` env var (32+ chars) | ✅ Good |
| SSO providers | Google OAuth 2.0, Azure AD (optional) | ✅ Good |
| Brute force protection | None | ⚠️ Gap — see §10 |
| Multi-factor authentication | Not implemented | ⚠️ Gap — see §10 |
| Account deactivation | Admin can deactivate accounts (`active: false`) | ✅ Present |
| Email enumeration resistance | Forgot-password endpoint always returns 200 | ✅ Good |

### Role-based access control

Three roles are defined:

| Role | Access |
|------|--------|
| `CAREGIVER` | Own child profiles, observations, ASD training, reports |
| `CAREER_DEV_OFFICER` | Careers CPD training only — no child data access |
| `ADMIN` | All of the above + user management panel, bypasses training locks |

All API routes verify session and ownership on every request. Child data endpoints filter by `userId` — cross-user data access is not possible via normal API paths.

Admins **cannot** modify or delete their own account via the admin panel (enforced in API). Self-service account deletion is blocked for admin accounts.

---

## 5. Data Encryption

| Layer | Mechanism | Assessment |
|-------|-----------|------------|
| Data in transit (browser ↔ Vercel) | TLS 1.3, enforced by Vercel | ✅ Strong |
| Data in transit (Vercel ↔ Neon) | TLS (Neon default) | ✅ Strong |
| Data at rest (Neon) | AES-256 (Azure managed encryption) | ✅ Strong |
| Data at rest (Vercel) | Vercel platform encryption | ✅ Strong |
| Passwords | bcrypt (irreversible hash) | ✅ Strong |
| Application-level field encryption | Not implemented | ⚠️ Gap — see §10 |

---

## 6. UK GDPR Compliance

### 6.1 Lawful basis for processing

| Data Type | Lawful Basis |
|-----------|-------------|
| Account registration data | Consent (Article 6(1)(a)) — collected at registration via consent checkbox |
| Child profiles and behavioural observations | Explicit Consent (Article 9(2)(a)) — collected at registration |
| AI-generated reports | Explicit Consent — covered by registration consent |
| Training progress | Legitimate Interests / Consent — minimal, non-sensitive |

### 6.2 Consent record

Explicit consent is collected via a checkbox at registration. The checkbox text references the Privacy Policy and explicitly mentions AI processing and special category data. SSO sign-ins (Google/Azure) do not currently capture the consent checkbox — this is a **gap** (see §10).

### 6.3 Data subject rights

| Right | Implementation Status |
|-------|----------------------|
| Right of access (Article 15) | Manual process — contact DPO by email | ⚠️ Manual |
| Right to rectification (Article 16) | User can update profile fields | ⚠️ Partial |
| Right to erasure (Article 17) | Self-service account deletion in Settings | ✅ Implemented |
| Right to data portability (Article 20) | Not implemented | ⚠️ Gap — see §10 |
| Right to restrict processing (Article 18) | Manual process | ⚠️ Manual |
| Right to withdraw consent | Achieved via account deletion | ✅ Functional |

### 6.4 Data retention

No automated retention policy is currently implemented. Recommendation: purge accounts inactive for more than 24 months (see §10).

### 6.5 Children's data

The platform stores data **about** children, not **accounts for** children. Accounts are held by adult caregivers. The children whose data is recorded are not users of the platform. Processing of children's personal data requires the consent of a person holding parental responsibility — this is implicitly assumed when a caregiver registers an account, but is not explicitly stated in the current privacy notice.

**Recommendation:** Explicitly state in the privacy notice and registration flow that by adding a child profile, the user confirms they hold parental responsibility or appropriate legal authority to record observations for that child.

### 6.6 ICO registration

All organisations that process personal data in the UK are required to register with the Information Commissioner's Office (ICO) unless exempt. Charities processing only for their charitable purpose with no fee may qualify for the £40 tier or an exemption. **ICO registration status should be confirmed before live deployment to the public.**

### 6.7 Data Protection Impact Assessment (DPIA)

Given the nature of the data (health-adjacent observations relating to children), a **DPIA is likely required** under Article 35 UK GDPR before large-scale deployment. A DPIA should be completed if the application will be used by more than a small number of internal users.

---

## 7. Third-Party Processors

| Processor | Purpose | Data Shared | Location | DPA/SCCs |
|-----------|---------|-------------|----------|----------|
| **Vercel** (Vercel Inc.) | Application hosting, CDN | All application data passes through Vercel infrastructure | US (global CDN) | Vercel DPA available — review required |
| **Neon** (Neon Inc. / Microsoft Azure) | PostgreSQL database hosting | All stored personal data | Azure East US 2 | Neon DPA / Azure SCCs — review required |
| **Google LLC** (Gemini API) | AI report generation | Observation text, no names or DOB | US | Google Cloud DPA — review required. Google API terms state data is not used for model training |
| **Resend** (Resend Inc.) | Transactional email (password reset) | Email address, first name | US | Resend DPA — review required |

**Action required:** Signed Data Processing Agreements (DPAs) should be in place with each processor before live deployment. Verify current SCCs / UK IDTA coverage for US transfers.

---

## 8. AI and Google Gemini Considerations

The platform generates AI insight reports by sending child observation data (behaviour descriptions, frequencies, domains) to Google Gemini (gemini-1.5-flash) via the Gemini API.

**Key considerations:**

1. **No diagnosis:** All prompts explicitly instruct the model not to diagnose or suggest autism. The output includes a mandatory disclaimer. This must be maintained in all future prompt changes.

2. **Data minimisation:** The prompts send observation records but do not include child surnames, dates of birth, or user account information. This limits re-identification risk.

3. **Google data retention:** Under Google Cloud / Gemini API terms, API inputs are not used for model training and are not retained beyond the processing of the request. This should be confirmed in the DPA.

4. **Output accuracy:** AI-generated reports are supplementary to — not a replacement for — professional assessment. The platform includes explicit disclaimers. Staff using the platform should be trained to communicate this to caregivers.

5. **Future model changes:** If the Gemini model version is updated, a review of output quality and disclaimer adequacy should be conducted.

---

## 9. Incident Response

In the event of a suspected personal data breach:

1. **Contain** — Immediately revoke affected credentials, rotate `NEXTAUTH_SECRET` and database credentials via Vercel and Neon dashboards.

2. **Assess** — Determine what data was exposed, how many individuals are affected, and whether special category data (observations) was involved.

3. **Report** — If the breach is likely to result in a risk to individuals' rights and freedoms, report to the ICO **within 72 hours** of becoming aware (Article 33 UK GDPR). If high risk, notify affected individuals directly (Article 34).

4. **Notify** — Contact affected users via the email addresses on record. Advise them to change passwords.

5. **Review** — Conduct a post-incident review and update controls accordingly.

**Key contacts to prepare:**
- ICO breach reporting: ico.org.uk/for-organisations/report-a-breach
- Neon support: console.neon.tech
- Vercel support: vercel.com/support
- Google Cloud support: cloud.google.com/support

---

## 10. Known Gaps and Recommended Mitigations

| Gap | Risk | Recommended Mitigation | Priority |
|-----|------|------------------------|----------|
| No rate limiting on auth endpoints | Brute force / credential stuffing attacks on login and password reset | Implement rate limiting via Vercel WAF or middleware (e.g. 5 attempts per IP per 15 min) | **High** |
| No MFA option | Account takeover risk, particularly for admin accounts | Add TOTP-based MFA for admin users as a minimum | **High** |
| SSO users bypass consent checkbox | GDPR consent record incomplete for Google/Azure sign-ins | Show consent checkbox on first SSO sign-in before granting access | **High** |
| No automated data retention | Stale data accumulates; GDPR retention obligations | Implement a cron job to flag/delete accounts inactive for 24+ months | **Medium** |
| No data export (portability) | GDPR Article 20 right to portability not met | Build a "Download my data" feature exporting observations as JSON/CSV | **Medium** |
| Application-level field encryption | Observation notes stored in plaintext in DB | Consider encrypting `notes` fields at application level for additional defence in depth | **Medium** |
| No parental responsibility declaration | Unclear legal authority for recording child data | Add explicit declaration to child profile creation form | **Medium** |
| No signed DPAs with processors | GDPR Article 28 compliance incomplete | Obtain and file signed DPAs with Vercel, Neon, Google, Resend | **High** |
| ICO registration unconfirmed | Regulatory non-compliance risk | Confirm registration status and register if required before public launch | **High** |
| No DPIA completed | Required for large-scale processing of health-adjacent child data | Complete DPIA before deploying to more than a pilot user group | **High** |
| Resend email domain not verified | Password reset emails may be blocked or go to spam | Verify `ambitiousaboutautism.org.uk` domain in Resend dashboard and add SPF/DKIM records | **Medium** |
| Admin password is `admin123` (seeded) | Credential compromise | Change admin password immediately on first login in any environment | **Critical — immediate** |
| No audit log | Cannot detect or investigate unauthorised access | Implement application-level audit logging for data access and admin actions | **Medium** |

---

## 11. Conclusion & Risk Rating

The application has a solid technical foundation: strong password hashing, role-based access control, TLS enforcement, cascading data deletion, and an explicit consent mechanism at registration. The codebase shows evidence of security-conscious development (Zod input validation, email enumeration resistance, session-based auth checks on all routes).

However, several gaps must be addressed before this application is deployed to a broad public audience, particularly given the special category nature of the data being processed.

**Minimum requirements before public launch:**
1. Change default admin password (`admin123`)
2. Complete ICO registration check
3. Obtain signed DPAs with Vercel, Neon, Google, and Resend
4. Add rate limiting to authentication endpoints
5. Fix SSO consent gap
6. Complete a DPIA

**Overall risk rating: MEDIUM**
Manageable with the mitigations above. Not recommended for broad public deployment in current state without addressing the High-priority items.

---

*This document should be reviewed and updated whenever significant changes are made to the application architecture, data flows, or third-party processors.*
