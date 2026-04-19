# Data Protection Impact Assessment — Child Observations

**Product:** Ambitious About Autism Training & Observation Platform
**Feature assessed:** Child Observations (child profiles, behavioural observations, AI-generated insight reports)
**DPIA version:** 1.0
**Completed:** 2026-04-19
**Review due:** 2027-04-19 (or sooner if processing changes materially)
**Data controller:** The customer organisation (school / Local Authority / nursery). Ambitious About Autism is a data processor.
**DPIA owner:** Ambitious About Autism — privacy@ambitiousaboutautism.org.uk

---

## 1. Why a DPIA is needed

The Child Observations feature processes special-category personal data (UK GDPR Art. 9 — data concerning a child's developmental health) belonging to children who are by definition vulnerable. An ICO screening under Art. 35(3) and the ICO's own list of high-risk processing indicates a DPIA is required where processing involves:

- Children's personal data (yes — children aged 0–18)
- Health or similarly sensitive data (yes — behavioural observations indicative of neurodevelopmental traits)
- Profiling or AI-assisted analysis (yes — Google Gemini generates insight summaries)
- Systematic monitoring (yes — repeated observations over time)

Four of the ICO's nine high-risk triggers apply, so a DPIA is mandatory.

## 2. Description of the processing

### 2.1 Nature of the processing

A named caregiver (nursery practitioner, SENCO, parent user) creates a **Child** record (first name + date of birth only) and logs **Observations** against it. Each observation captures:

- Date of observation
- Behaviour type (free-text label, e.g. "refused transition to mat time")
- Domain (one of: Social Communication / Behaviour & Play / Sensory Responses)
- Frequency (Rare / Sometimes / Often)
- Context (Home / Nursery / Outdoors / Other)

The caregiver can request an **AI insight report**, which sends the observation set to Google Gemini and receives back a plain-English summary, pattern analysis and discussion-prompts.

### 2.2 Scope

| Dimension | Detail |
|---|---|
| Data subjects | Children (0–18) known to caregivers registered with a customer organisation; the caregivers themselves (account data only). |
| Data categories | Child first name; DOB; behavioural observations; AI-generated reports; audit-log rows; caregiver name/email/org. |
| **Not** collected | Surname; address; NHS number; UPN; photograph; free-text notes (removed 2026-04-19); health diagnosis; ethnicity; religion. |
| Volume | Anticipated ≤ 10 organisations, ≤ 500 caregivers, ≤ 2 000 children in year 1. |
| Geography | Controllers are UK organisations. Processing in US (Vercel, Google) covered by IDTAs / SCCs + UK Addendum. |
| Duration | Observations auto-deleted after each org's `observationRetentionDays` (default 1 095 days = 3 years). Accounts live until the org removes the user or the org itself is deactivated. |

### 2.3 Context

- Caregivers have day-to-day safeguarding responsibilities for the children in the record and already process their data in paper/email form; the platform replaces less-secure ad-hoc tracking.
- Processing begins at the point a caregiver adds a child and attests that they have parental consent (captured in `Child.consentObtainedAt / By / Note`).
- Children aged 13+ can exercise their own UK GDPR rights; the platform surfaces an amber banner on their record reminding the caregiver of this.

### 2.4 Purposes

1. **Support early identification of developmental patterns** that a caregiver may wish to raise with a GP, health visitor or SENCO.
2. **Provide structured, non-diagnostic AI prompts** that reframe observations into discussion-ready language.
3. **Demonstrate accountability** to caregivers, parents and regulators via an immutable audit log.

The platform explicitly **does not** diagnose autism or any other condition. Every AI prompt instructs the model never to suggest a diagnosis; every user-facing page rendering a caregiver view includes the disclaimer "This tool supports observation and pattern recognition only".

## 3. Consultation

| Party | Consulted | Outcome |
|---|---|---|
| Ambitious About Autism internal DPO | 2026-04-19 | Endorsed the four-stage remediation (PRs 1–4). |
| Customer DPOs | Per-procurement | This DPIA forms part of the due-diligence pack shared with each school / LA DPO at procurement. |
| Parents / caregivers | Via customer orgs | Customers are required to obtain parental consent before a Child record is created; the platform captures evidence of this in `consentObtainedAt`. |
| ICO | Not required | No residual high risk remains after mitigations (§6). |

## 4. Necessity & proportionality

- **Lawful basis (Art. 6):** Configurable per organisation — most commonly `CONSENT` (Art. 6(1)(a)); Local Authorities may elect `PUBLIC_TASK` (Art. 6(1)(e)). The value is recorded on `Organisation.observationLawfulBasis` and is visible to the super-admin audit viewer.
- **Special-category basis (Art. 9):** Explicit consent (Art. 9(2)(a)) in the consent case; "substantial public interest — safeguarding of children and individuals at risk" (Sch. 1 Pt 2 para 18, DPA 2018) where the org is a statutory body acting on public task.
- **Data minimisation:** Only first name + DOB identifies the child. Surname, address, UPN, NHS number, photograph and free-text notes are **not** collected. The free-text `notes` columns on `Child` and `Observation` were removed on 2026-04-19 to enforce this at the schema level.
- **Pseudonymisation before AI processing:** `lib/pseudonymise.ts` replaces the child's name with a deterministic pseudonym (`child-<8-char-hash>`) and the exact DOB with a six-month age bucket (`2y3m` / `4y9m` etc.) before any call to Google Gemini. Gemini never receives the child's real name or precise DOB.
- **Storage limitation:** Observations are auto-deleted nightly by `/api/cron/retention` once older than the per-org retention period.
- **Purpose limitation:** The observation corpus is used only to (a) render the caregiver's own tracking UI and (b) generate AI reports at the caregiver's explicit request. It is not used for analytics, marketing, profiling beyond the caregiver's own child, or model training.

## 5. Risks identified

Each risk is scored **Likelihood × Severity** before and after mitigation.

| # | Risk | L | S | Gross | Mitigation | L' | S' | Net |
|---|---|---|---|---|---|---|---|---|
| R1 | Unauthorised person views a child's observations | Med | High | High | Row-level ownership check on every observation read; only caregiver-owner can access; full audit log; 8-hour session TTL; MFA required for admin roles. | Low | High | Med |
| R2 | Child's identifiable data leaves UK/EEA to a third-country AI processor | High | High | **High** | `pseudonymiseChildForAi()` strips name + exact DOB before every Gemini call. Google Gemini API TOS prohibits use of API data for model training. Transfer covered by Google's IDTA + SCC + UK Addendum. | Low | Med | Low |
| R3 | Observations retained indefinitely | High | Med | High | Daily retention cron enforces per-org `observationRetentionDays` (default 1 095 days). Deletion is logged. | Low | Low | Low |
| R4 | No evidence of who accessed a child's record | High | High | **High** | `ObservationAccessLog` records every create / update / delete / AI-generate / export with actor, child, IP, timestamp. Immutable by design — no UPDATE or DELETE endpoint. Viewable by super-admin (`/super-admin/audit`), org-admin (`/admin/audit`, scoped to own org) and the caregiver themselves (`/activity`). | Low | Med | Low |
| R5 | Parent asks "what do you hold on my child?" and we can't answer quickly (SAR) | Med | High | High | Caregiver has a one-click JSON export button on every child page (`/api/children/[childId]/export`) that returns the full record plus audit trail. Export itself is logged. | Low | Low | Low |
| R6 | Young person (13+) cannot exercise their own rights | Med | Med | Med | Amber banner on child record when age ≥ 13 reminds caregiver of the 13+ rights transition. Export button is available for the caregiver to share the record with the young person. | Low | Low | Low |
| R7 | Caregiver leaves org / account goes stale with live data | Med | High | High | Users deactivated by admin cannot sign in; cascading record ownership unchanged (org-admin can reassign). Session maxAge 8h caps window after role change. | Low | Med | Low |
| R8 | AI output misinterpreted as a diagnosis | Med | High | High | Every AI prompt instructs "never suggest autism or any diagnosis". UI banner on all caregiver pages: "This tool supports observation and pattern recognition only". Disclaimer appended to every generated report. | Low | Med | Low |
| R9 | Credentials brute-forced | Med | High | High | bcrypt password hashing; in-memory rate limit on `/login` (10 / 15 min / IP); MFA enforced for SUPER_ADMIN and ORG_ADMIN. | Low | Med | Low |
| R10 | AI prompt injection leaks data across children | Low | High | Med | Each AI call is scoped to a single child's observation set; prompt templates are read-only in DB; no user-supplied free-text reaches the prompt (notes column removed). | Low | Med | Low |

**Residual highest risk: Medium** (R1 — unauthorised access if a caregiver's own credentials are compromised). Mitigated to below the threshold at which ICO consultation is required.

## 6. Measures — technical and organisational

### 6.1 Technical

| Measure | Where implemented |
|---|---|
| Role-based access control | `middleware.ts`, `lib/rbac.ts` |
| Row-level ownership enforcement | `app/api/children/**/*.ts` — every query includes `userId: session.user.id` |
| Audit log | `ObservationAccessLog` model + `lib/observation-audit.ts` |
| Pseudonymisation before AI | `lib/pseudonymise.ts` → `lib/gemini.ts` |
| Retention cron | `app/api/cron/retention/route.ts` (03:00 UTC daily) |
| Encrypted in transit | HTTPS enforced by Vercel platform |
| Encrypted at rest | Neon Postgres (AES-256), Vercel Blob (AES-256) |
| Password hashing | bcrypt cost 10 (`lib/auth.ts`) |
| Session TTL | 8h JWT (`lib/auth.ts`) |
| MFA for admins | `otpauth` TOTP, enforced in middleware |
| Rate limiting | `lib/rate-limit.ts` on login, forgot-password, reset-password, mfa-verify, change-password |
| Forced password change on admin-created accounts | `mustChangePassword` flag |

### 6.2 Organisational

- **DPO:** privacy@ambitiousaboutautism.org.uk — responds to SARs within 30 days per UK GDPR.
- **Breach process:** Any confirmed breach reported to the ICO within 72 hours per Art. 33; affected customer DPOs notified immediately.
- **Sub-processor list:** Published at `/privacy`. Changes notified to customer orgs 30 days in advance.
- **Staff training:** All AaA engineering staff complete annual DP/infosec training; access to production data restricted to named engineers.
- **Access review:** Every six months, SUPER_ADMIN runs a review of ORG_ADMIN accounts and deactivates dormant ones.

## 7. Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| DPIA author (Engineering) | | 2026-04-19 | |
| Ambitious About Autism DPO | | | |
| Customer DPO (per procurement) | | | |

**Decision:** Processing may proceed. No further ICO consultation required. Review at 2027-04-19 or upon material change.
