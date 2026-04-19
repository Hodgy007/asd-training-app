# Record of Processing Activities

**Product:** Ambitious About Autism Training & Observation Platform
**Controller(s):** The customer organisation (school / Local Authority / nursery)
**Processor:** Ambitious About Autism (service provider, UK charity no. 1063184)
**Version:** 1.0 — 2026-04-19
**Review cycle:** Annual

UK GDPR Art. 30 ROPA covering all processing activities within the platform. Each activity is documented as an Art. 30(1)(a–g) record.

---

## Activity 1 — Caregiver account management

| Field | Value |
|---|---|
| Purpose | Authenticate the caregiver and bind them to an organisation so they can access their organisation's training content and child records. |
| Lawful basis (Art. 6) | Contract (Art. 6(1)(b)) — performance of the service contract between AaA and the customer org. |
| Special category basis (Art. 9) | N/A |
| Data subjects | Caregivers (adults). |
| Data categories | Name, email, hashed password, org id, role, MFA secret (encrypted), last-login timestamp. |
| Recipients | None external. |
| International transfers | Hosting in Vercel US (SCC + UK Addendum). |
| Retention | Until the organisation deactivates the user or closes the account. |
| Security measures | bcrypt hashing, MFA (TOTP), rate-limited auth endpoints, 8h session TTL. |

## Activity 2 — Child profile creation

| Field | Value |
|---|---|
| Purpose | Create a tracking record for a single child so the caregiver can log observations. |
| Lawful basis (Art. 6) | Per-org configurable: `CONSENT` (default) / `PUBLIC_TASK` / `LEGITIMATE_INTERESTS`. Value recorded on `Organisation.observationLawfulBasis`. |
| Special category basis (Art. 9) | Explicit consent (9(2)(a)) for consent-basis orgs; DPA 2018 Sch. 1 Pt 2 para 18 (safeguarding) for public-task orgs. |
| Data subjects | Children (0–18). |
| Data categories | First name, date of birth, consent attestation (date + user + note). |
| Recipients | Caregiver-owner only (row-level restriction). Org-admin can see audit log rows but cannot read observation content. Ambitious About Autism staff (processor) have no routine access to child records — incident-response access via break-glass only. |
| International transfers | Hosting in Vercel US (SCC + UK Addendum). |
| Retention | Lifetime of the org relationship; on child delete, all observations cascade. |
| Security measures | Row-level ownership; ORG_ADMIN / SUPER_ADMIN cannot read child content — only audit metadata. |

## Activity 3 — Behavioural observation logging

| Field | Value |
|---|---|
| Purpose | Record a structured observation for pattern-spotting and later discussion with professionals. |
| Lawful basis (Art. 6) | Same as Activity 2 (`Organisation.observationLawfulBasis`). |
| Special category basis (Art. 9) | Same as Activity 2. |
| Data subjects | Children (0–18). |
| Data categories | Date, behaviour-type label, domain enum, frequency enum, context enum. No free-text narrative (removed 2026-04-19). |
| Recipients | Caregiver-owner only. |
| International transfers | Hosting in Vercel US (SCC + UK Addendum). |
| Retention | Per-org `observationRetentionDays` — default 1 095 days (3 years). Daily cron (`/api/cron/retention`) deletes rows past the threshold. |
| Security measures | Row-level ownership; audit log on every mutation; immutable audit table. |

## Activity 4 — AI insight generation (Google Gemini)

| Field | Value |
|---|---|
| Purpose | Generate a plain-English summary of a child's observation set with discussion prompts for the caregiver to take to a GP / SENCO. |
| Lawful basis (Art. 6) | Same as Activity 2 — triggered by explicit caregiver action. |
| Special category basis (Art. 9) | Same as Activity 2. |
| Data subjects | Children (0–18). |
| Data categories **sent to Google** | Pseudonym (`child-<8-char-hash>`), age bucket (e.g. `2y3m`), structured observations (no names, no exact DOB, no free text). |
| Data categories **never sent** | Child's real name, exact DOB, caregiver name, caregiver email, organisation id. |
| Recipients | Google LLC (Google Gemini API). |
| International transfers | Google Gemini API (US). Covered by Google's SCC + UK Addendum. Google API TOS prohibits use of API data for model training. |
| Retention | AI reports persisted to `AiInsight` table; deleted on child delete. Gemini itself does not retain request content under API ToS. |
| Security measures | Pseudonymisation at `lib/pseudonymise.ts`; prompt-injection guarded by input sanitisation (structured enums only); prompts instruct model never to diagnose. |

## Activity 5 — Audit logging

| Field | Value |
|---|---|
| Purpose | Accountability under UK GDPR Art. 5(2) — proving who accessed, created, modified, deleted or exported a child's record. |
| Lawful basis (Art. 6) | Legitimate interests (Art. 6(1)(f)) — the controller's (and AaA's) legitimate interest in being able to respond to SARs and demonstrate compliance. |
| Data subjects | Caregivers, org-admins, super-admins (actor); children (subject of the action). |
| Data categories | Actor user id, child id, action enum, IP address, timestamp, minimal metadata (e.g. observation id for deletes). |
| Recipients | Org-admin (`/admin/audit`, scoped to own org), caregiver (`/activity`, scoped to own actions). Ambitious About Autism staff have no routine access. |
| International transfers | Hosting in Vercel US. |
| Retention | Retained for the lifetime of the child record, then cascade-deleted. |
| Security measures | Immutable — no UPDATE or DELETE endpoint exposed. |

## Activity 6 — Subject Access Request export

| Field | Value |
|---|---|
| Purpose | Enable a caregiver to obtain a complete copy of a child's record on behalf of a parent's SAR (Art. 15). |
| Lawful basis (Art. 6) | Legal obligation (Art. 6(1)(c)) — compliance with UK GDPR Art. 15. |
| Data subjects | Children (0–18). |
| Data categories | Everything in Activities 2, 3, 4, 5 for a single child as JSON. |
| Recipients | The requesting caregiver (who then hands off to the parent / young person). |
| International transfers | None beyond hosting. |
| Retention | The export itself is ephemeral (download only). The access event is logged as an `EXPORT` row. |
| Security measures | Row-level ownership (only the owning caregiver can export); every export creates an audit row. |

## Activity 7 — Training content delivery

| Field | Value |
|---|---|
| Purpose | Deliver training modules, quizzes and certificates to registered users. |
| Lawful basis (Art. 6) | Contract (Art. 6(1)(b)). |
| Data subjects | Adult users (caregivers, career dev officers, students, interns, employees). |
| Data categories | Progress per lesson, quiz scores, completion timestamps. |
| Recipients | Org-admin (aggregate reporting), super-admin (aggregate reporting). |
| International transfers | Hosting in Vercel US. |
| Retention | Lifetime of the account. |
| Security measures | Scoped by user id; ORG_ADMIN reports are org-scoped. |

## Activity 8 — Document library

| Field | Value |
|---|---|
| Purpose | Deliver AaA-produced PDFs / images / resources to targeted users. |
| Lawful basis (Art. 6) | Legitimate interests (Art. 6(1)(f)). |
| Data subjects | Users who download / view. |
| Data categories | File metadata, download / view event (user id, collection id, timestamp). |
| Recipients | Super-admin reporting. |
| International transfers | Vercel Blob (US). |
| Retention | Events retained for account lifetime. |
| Security measures | Visibility targeting by org id / role; Vercel Blob private-by-default for non-public collections. |

---

## Sub-processor register

| Sub-processor | Role | Location | Safeguards |
|---|---|---|---|
| Vercel Inc. | Application hosting + Blob storage | US | SCC + UK Addendum; SOC 2 Type II |
| Neon Inc. | PostgreSQL hosting | US (Azure East US 2) | SCC + UK Addendum; SOC 2 Type II |
| Google LLC | Gemini API (AI insight generation) | US | SCC + UK Addendum; API TOS prohibits training use |
| Microsoft Corp. | Azure AD (optional SSO) | EU/UK region tenants | Customer configures own tenant |
| Resend Inc. | Transactional email (password reset) | EU region | SCC + UK Addendum |
| Auth / Google | Google OAuth (optional SSO) | US | SCC + UK Addendum |
