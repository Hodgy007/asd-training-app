# Record of Processing Activities

**Product:** Ambitious About Autism Training Platform
**Controller(s):** The customer organisation (school / Local Authority / college / nursery / employer)
**Processor:** Ambitious About Autism (service provider, UK charity no. 1063184)
**Version:** 3.0 — 2026-07-26
**Supersedes:** v2.0 (2026-05-11), which recorded the CV Builder and Careers Advisor activities removed in July 2026
**Review cycle:** Annual, or on material change

UK GDPR Art. 30 record covering all current processing activities within the platform.

## Material changes from v2.0

The CV Builder and Careers Advisor features were removed from the platform in July 2026. v2.0 Activities 4 and 5 no longer occur and are removed from this record. **This is a net reduction in processing:** the platform no longer collects CV personal details (name, contact, personal statement, work history, education, references) or careers questionnaire answers covering sensory and communication preferences, and no longer sends either to an AI provider.

The six underlying tables (`CV`, `CVWorkExperience`, `CVEducation`, `CVSkill`, `CVReference`, `CareerAdvisorSession`) were dropped from both the development and production databases. All were empty at the point of removal, so no personal data required erasure.

Also in v3.0:

- **Role model collapsed from ten roles to four** — `SUPER_ADMIN`, `CHARITY_EMPLOYEE`, `ORG_ADMIN`, `LEARNER`. What a learner can access is now determined by the training programmes their organisation is assigned, not by a role that implied an audience. Data-subject descriptions throughout this record are updated accordingly. The self-declared identity captured at registration ("I am autistic", "I am a parent or carer") is unchanged — it was always held on the registration record rather than inferred from the role.
- **The charity's own staff are now ordinary members of a charity organisation record**, so internal training is processed on the same basis as external.
- **Integration API narrowed** — the `cv` and `careers` export sections were removed, so those data categories are no longer available to downstream BI consumers.

## Material changes from v1.0

The Child Observations feature (`Child`, `Observation`, `AiInsight`, `ObservationAccessLog` models; `/children` and `/activity` routes; `lib/pseudonymise.ts`; per-org observation lawful-basis / retention configuration) was removed from the platform on 21 April 2026. v1.0 Activities 2–6 (Child profile creation, Behavioural observation logging, AI insight generation, Audit logging of child records, SAR export of child records) no longer occur and are removed from this record.

In v2.0:

- Title revised — the platform is no longer an "Observation Platform".
- New activity records added for CV Builder, Careers Advisor, Surveys, Virtual Classroom Sessions (workshops), Jobs, Text-to-speech, and Integration API access — all of which existed in some form at v1.0 but were not separately recorded.
- AI processing rerouted from a direct Google Gemini integration to the Vercel AI Gateway (multi-provider: Google / Anthropic / OpenAI). The sub-processor register reflects this and adds ElevenLabs.
- All processing is now ordinary personal data; **no Article 9 special-category data is processed**.

---

## Activity 1 — User account management

| Field | Value |
|---|---|
| Purpose | Authenticate the user and bind them to a customer organisation so they can access the training, careers, library and workshop features their organisation has enabled. |
| Lawful basis (Art. 6) | Contract (Art. 6(1)(b)) — performance of the service contract between Ambitious About Autism and the customer organisation. |
| Special category basis (Art. 9) | N/A |
| Data subjects | Adult users (charity staff, organisation admins) and learners in adult-led education / employment contexts (may be aged 16+). All non-admin users hold the single `LEARNER` role. |
| Data categories | Name, email, hashed password, organisation id, role, charity permissions (where applicable), MFA secret, last-login timestamp, account flags (`active`, `mustChangePassword`). |
| Recipients | Org-admin (their own users only), super-admin / permissioned charity employees (cross-org reporting). |
| International transfers | Vercel US (SCC + UK Addendum). |
| Retention | Until the organisation deactivates the user or the account is closed. |
| Security measures | bcrypt cost factor 12; MFA (TOTP) mandatory for SUPER_ADMIN / CHARITY_EMPLOYEE / ORG_ADMIN; rate-limited login (10 / 15 min / IP); 8-hour JWT session TTL; admin-set forced password change. |

## Activity 2 — Authentication tokens & SSO

| Field | Value |
|---|---|
| Purpose | Sign users in via password, federated identity (Google OAuth, Microsoft Azure AD), or SAML SSO (per-org and charity-level); deliver welcome / password-reset / magic-link emails. |
| Lawful basis (Art. 6) | Contract (Art. 6(1)(b)). |
| Data subjects | All users. |
| Data categories | OAuth `Account` records (provider, providerAccountId), SAML certificates and metadata (organisational data), `PasswordResetToken` and welcome-link tokens (SHA-256 hashed at rest — see `lib/reset-token.ts`), TOTP secrets, login-audit rows (IP, user-agent, success/failure). |
| Recipients | Identity providers chosen by the customer organisation (Google, Microsoft, the org's own IdP); transactional email recipient. |
| International transfers | Google (US), Microsoft (customer-tenant region), Resend (EU). All SCC + UK Addendum. |
| Retention | Reset tokens: 1 h. Welcome / magic-link tokens: 24 h. Login-audit rows: account lifetime. SSO configuration: until removed by the controller. |
| Security measures | Reset tokens generated via `crypto.randomBytes`; stored as SHA-256 digest only; rate-limited reset (3 / 15 min / email). |

## Activity 3 — Training delivery & progress tracking

| Field | Value |
|---|---|
| Purpose | Deliver assigned training programs (modules, lessons, quizzes, SCORM packages, ElevenLabs read-aloud, certificates) and record per-user progress for reporting. |
| Lawful basis (Art. 6) | Contract (Art. 6(1)(b)). |
| Data subjects | Adult users and learners assigned to a training program. |
| Data categories | Progress per lesson (`TrainingProgress.completedAt`, score, `interactionData`), SCORM CMI snapshots (`cmi.interactions.*`, `cmi.score.*`, `cmi.completion_status`), free-text `LessonNote` rows (learner's personal notes, single row per user/lesson). |
| Recipients | Organisation admins and charity admins (aggregate reporting); the user themselves. |
| International transfers | Vercel US. |
| Retention | Until the account is closed or the org relationship ends. Per-question SCORM analytics anonymised; no per-learner data exposed in cross-org reports. |
| Security measures | Row-level ownership on read; auth-gated `/api/scorm/[lessonId]/[...path]` for SCORM assets (lesson → program → user entitlement check); admin-side SCORM zips validated for entry count, decompressed size, zip-slip and ZIP64 EOCD per `lib/scorm/package.ts`. |

## Activity 4 — Surveys

| Field | Value |
|---|---|
| Purpose | Collect feedback from targeted audiences (by org / role) and generate aggregate AI insight reports (SUMMARY / COMPARATIVE / RECOMMENDATIONS) for the charity. |
| Lawful basis (Art. 6) | Contract (Art. 6(1)(b)) where embedded in training delivery; legitimate interests (Art. 6(1)(f)) where used for charity-wide service improvement. |
| Data subjects | Survey respondents (any role). |
| Data categories | Multiple-choice / yes-no / free-text / rating-scale / multi-select responses; AI-generated `SurveyInsight` rows. |
| Recipients | Super-admin and permissioned charity employees with `MANAGE_SURVEYS` or `VIEW_REPORTS`. |
| International transfers | Vercel AI Gateway upstream providers (US) for insight generation. |
| Retention | Lifetime of the survey; deleted on survey deletion. |
| Security measures | Respondents pseudonymised with a per-survey key so a respondent cannot be cross-referenced across surveys (security-audit hardening, 2026-05); insight generation operates on aggregate response counts; CSV export reports respondent role / org only, not name. |

## Activity 5 — Document library

| Field | Value |
|---|---|
| Purpose | Distribute AaA-produced PDFs / images / training resources to targeted users (by org id / role). |
| Lawful basis (Art. 6) | Legitimate interests (Art. 6(1)(f)). |
| Data subjects | Users who download / view (event-level only). |
| Data categories | Collection / document metadata (organisational data); per-user download / view events (`LibraryDocumentEvent`) — user id, collection id, document id, timestamp. |
| Recipients | Super-admin reporting (downloads per org, downloads per document). |
| International transfers | Vercel US (compute + Blob). |
| Retention | Event rows: account lifetime. Documents: until admin deletion. |
| Security measures | Visibility targeting (`targetOrgIds`, `targetRoles`); document URLs served via auth-gated proxy routes (`/api/library/.../download/*`) — raw Blob URLs are never rendered (security-audit hardening, 2026-05, hash-rewrite migration `f5b2b19`); SVG uploads blocked; admin-uploaded files validated for extension + MIME (`lib/upload-validation.ts`). |

## Activity 6 — Virtual classroom sessions (workshops)

| Field | Value |
|---|---|
| Purpose | Schedule, deliver and report on live workshops (Zoom / Teams / custom URL) hosted by org admins or charity staff. |
| Lawful basis (Art. 6) | Contract (Art. 6(1)(b)). |
| Data subjects | Hosts, attendees, charity employees who organise workshops. |
| Data categories | Session metadata (title, time, platform, host); attendee join (`SessionAttendee` — user id, attendance flag); recording URL (where the host chooses to record). The audio/video stream itself is hosted by Zoom / Microsoft, not by the platform. |
| Recipients | Host, org admin, charity staff with `MANAGE_SESSIONS`. |
| International transfers | Zoom / Microsoft Teams per the customer's own meeting-platform contract. The platform stores only an API token in `OrgMeetingConfig` / `CharityMeetingConfig` and the resulting meeting URL — it is not a sub-processor of the meeting recording. |
| Retention | Until the session is deleted by the host or org admin. |
| Security measures | Per-org / per-charity meeting API credentials stored encrypted at rest; only hosts and org admins can edit a session. |

## Activity 7 — Jobs

| Field | Value |
|---|---|
| Purpose | Surface charity-curated job openings to learners; allow CDOs to assign jobs to specific learners. |
| Lawful basis (Art. 6) | Contract (Art. 6(1)(b)). |
| Data subjects | Learners who view or are assigned to job openings. |
| Data categories | Job opening (organisational data — employer, role, autism-friendly notes); `JobAssignment` (user ↔ job link, assigned-by). |
| Recipients | Learner, the assigning CDO, super-admin / `MANAGE_JOBS` charity employees. |
| International transfers | Vercel US. |
| Retention | Job openings until status `ARCHIVED`. Assignments retained for the lifetime of the job. |
| Security measures | Visibility resolved by `lib/jobs.ts` (`targetOrgIds`, `targetRoles`, `PUBLISHED` status, `closingDate` not past); assignments unique on `(jobId, userId)`. |

## Activity 8 — AI processing via Vercel AI Gateway

| Field | Value |
|---|---|
| Purpose | Provide AI assistance across survey insights, training quiz and content generation, document-library metadata and thumbnails, and homepage banner generation. |
| Lawful basis (Art. 6) | Triggered by, and inherited from, the activity that calls it (Activities 3, 4, 5, 6, 7). |
| Data subjects | The user who triggered the AI call; never third parties. |
| Data categories | Only the content needed for the specific feature: the user's own CV draft, their own questionnaire answers, aggregate (not respondent-level) survey response counts, admin-supplied lesson text, admin-supplied collection metadata. **No user identifiers, account data, organisation id, or special-category data is transmitted.** |
| Recipients | Vercel Inc. (the AI Gateway); upstream model providers Google LLC, Anthropic PBC, OpenAI L.L.C. (each is a sub-processor of Vercel via the AI Gateway). |
| International transfers | All upstream providers operate from the US. SCC + UK Addendum apply via the Vercel DPA and the provider-tier DPAs referenced therein. |
| Retention | AI Gateway observability logs per Vercel DPA; upstream provider DPAs confirm API inputs are not used for model training and are not retained beyond processing. AI outputs are persisted on the platform's own database against the calling activity's record. |
| Security measures | Prompt registry in `AiPrompt` table — every prompt explicitly instructs the model never to diagnose; user-authored input sanitised via `lib/sanitize.ts`; rate limits per feature (`lib/rate-limit.ts`); error responses sanitised on the admin prompt-test endpoint to strip provider stack traces. |

## Activity 9 — Text-to-speech (ElevenLabs)

| Field | Value |
|---|---|
| Purpose | Synthesise lesson text into MP3 audio for the "play lesson" feature on training modules. |
| Lawful basis (Art. 6) | Contract (Art. 6(1)(b)). |
| Data subjects | None directly — the payload is **lesson text**, not user data. |
| Data categories sent to ElevenLabs | Lesson text (admin-authored training content) and voice id. **No user identifiers, no learner data.** |
| Recipients | ElevenLabs Inc. (US). |
| International transfers | US. SCC + UK Addendum via the ElevenLabs DPA. |
| Retention | MP3s cached on Vercel Blob keyed by `sha256(voiceId|text)` (`lib/tts-blob.ts`) and reused across users; never tagged with a user id. |
| Security measures | Cache key is content-derived (no user identifier in path); `/api/tts` streams the cached MP3 with MP3 magic-byte validation; per-user rate limit on the route. |

## Activity 10 — Audit logging

| Field | Value |
|---|---|
| Purpose | Accountability under UK GDPR Art. 5(2) — record administrative actions and authentication events for incident investigation and SAR response. |
| Lawful basis (Art. 6) | Legitimate interests (Art. 6(1)(f)) — controller and processor's interest in being able to investigate incidents and prove access control. |
| Data subjects | Actor (admin / user) and the target of the action. |
| Data categories | Login audit (timestamp, IP, user-agent, outcome); admin action audit (actor, action, target id, timestamp); admin-prompt test errors are sanitised before being written. |
| Recipients | Super-admin, ORG_ADMIN (scoped to their own org), charity employees with `VIEW_REPORTS`. |
| International transfers | Vercel US. |
| Retention | Account lifetime. |
| Security measures | Audit rows are insert-only on the application path; admin permissions required to view. |

## Activity 11 — Integration API access

| Field | Value |
|---|---|
| Purpose | Allow external systems (e.g. Microsoft Dynamics 365 via Power Automate) to pull reporting data — training, library, surveys — under a controlled API key. |
| Lawful basis (Art. 6) | Contract (Art. 6(1)(b)) — the customer organisation has commissioned the integration. |
| Data subjects | The users whose data appears in the requested report. |
| Data categories | Whichever subset of Activities 3 / 6 / 7 the `?section=` filter selects. |
| Recipients | Whichever external system the controller has authorised. |
| International transfers | Depends on the integration target (recorded by the controller, not by the platform). |
| Retention | API key lifetime; revocable at `/super-admin/integrations`. |
| Security measures | API keys SHA-256 hashed at rest, prefix-displayed only on creation, last-used tracked, optional expiry; Bearer-token auth on `/api/integrations/*`. |

---

## Sub-processor register

| Sub-processor | Role | Region | Safeguards |
|---|---|---|---|
| Vercel Inc. | Application hosting, Blob storage, AI Gateway | US | SCC + UK Addendum; SOC 2 Type II; ISO 27001 |
| Neon Inc. | PostgreSQL hosting (on Microsoft Azure East US 2) | US | SCC + UK Addendum; SOC 2 Type II; AES-256 at rest |
| Google LLC | Upstream LLM models (Gemini) via Vercel AI Gateway | US | Sub-processor of Vercel; SCC + UK Addendum; API ToS prohibits use of API content for model training |
| Anthropic PBC | Upstream LLM models (Claude) via Vercel AI Gateway | US | Sub-processor of Vercel; SCC + UK Addendum; API ToS prohibits training use |
| OpenAI L.L.C. | Upstream LLM models (GPT) via Vercel AI Gateway | US | Sub-processor of Vercel; SCC + UK Addendum; API ToS prohibits training use |
| ElevenLabs Inc. | Text-to-speech synthesis for training lessons (lesson text only — no user identifiers) | US | SCC + UK Addendum |
| Resend Inc. | Transactional email (password reset, welcome links, scheduled reports) | EU | SCC + UK Addendum |
| Microsoft Corp. | Azure AD (optional SSO; only where the customer org enables it). Microsoft Teams meeting platform where the customer org configures it for workshops. | Customer-tenant region | Customer-configured |
| Google LLC | Google OAuth (optional SSO; only where the customer org enables it) | US | SCC + UK Addendum |
| Zoom Video Communications, Inc. | Workshop hosting (only where the customer org configures Zoom meetings) | Customer's contracted region | Customer-configured; the platform stores only the API token and meeting URL |

**DPA status:** see [`docs/compliance/PRE_LAUNCH_ACTIONS.md`](PRE_LAUNCH_ACTIONS.md) for the punch-list. Vercel / Resend / ElevenLabs are self-serve; Neon is email-request; upstream LLM providers are covered as sub-processors of Vercel.

---

## Cross-references

- Live security and compliance baseline: [`compliance/SECURITY_AND_COMPLIANCE.md`](../../compliance/SECURITY_AND_COMPLIANCE.md) v3.0
- DPIA covering AI-assisted processing for autistic learners (including under-18s): [`DPIA.md`](DPIA.md) v2.0
- AADC 15-standard mapping: [`AADC.md`](AADC.md) v2.0
- Pre-launch DPA punch-list: [`PRE_LAUNCH_ACTIONS.md`](PRE_LAUNCH_ACTIONS.md)
- Public privacy policy: [`app/privacy/page.tsx`](../../app/privacy/page.tsx)
