# Data Protection Impact Assessment — AI-assisted processing for autistic learners

**Product:** Ambitious About Autism Training Platform
**Subject of this DPIA:** AI-assisted training, CV and careers processing for autistic learners — including learners under the age of 18
**DPIA version:** 2.0
**Completed:** 2026-05-11
**Supersedes:** v1.0 (2026-04-19), which assessed the Child Observations feature removed in commit `8968cf0` on 21 April 2026.
**Review due:** 2027-05-11, or sooner if processing changes materially
**Data controller:** The customer organisation (school / college / Local Authority / employer)
**Data processor:** Ambitious About Autism
**DPIA owner:** Ambitious About Autism — privacy@ambitiousaboutautism.org.uk

---

## 1. Why a DPIA is needed

Under the ICO's screening criteria for Art. 35 high-risk processing, a DPIA is required when **two or more** of the nine high-risk triggers apply. The following four apply to the current platform:

- **Children's data.** STUDENT and INTERN learner accounts may be held by users under 18 (sixth-form pupils, FE college learners, supported-internship participants).
- **Vulnerable data subjects.** The service is designed for autistic learners; in the ICO's view, autistic users are within scope of the "vulnerable" criterion regardless of age.
- **Innovative use of technology / AI.** Large-language-model inference (Vercel AI Gateway routing to Google Gemini, Anthropic Claude, OpenAI GPT) is used for CV writing assistance, the Careers Advisor report, survey insight reports, training-quiz / content generation, and library-collection metadata.
- **Combining datasets.** AI features take the user's own training, CV, and careers-questionnaire content together to produce personalised reports.

The platform **no longer** processes special-category data under Art. 9 (the Child Observations feature that required Art. 9 cover was removed on 21 April 2026; this DPIA replaces the v1.0 assessment that covered that feature).

## 2. Description of the processing

### 2.1 Nature

The platform calls the **Vercel AI Gateway** at the moment a user (or admin) triggers an AI-assisted feature. The Gateway forwards the request to the upstream provider configured on the matching `AiPrompt` row (currently Google / Anthropic / OpenAI). The response is persisted on the platform's database against the calling activity's record. No batch, scheduled, or behind-the-back AI calls are made — every AI call is initiated by an explicit user action.

The AI-assisted features in scope are:

| Feature | Trigger | Input to AI | Output persisted on |
|---|---|---|---|
| CV Builder section suggestions | Learner clicks "Suggest" in the wizard | Their own CV section text | `CV*` model |
| Careers Advisor report | Learner finishes the 12-step questionnaire | Their structured answers | `CareerAdvisorSession.report` |
| Survey insights | Charity admin opens the insight tab | Aggregate response counts (not respondent rows) | `SurveyInsight` |
| Training quiz / content generation | Admin uploads source material | Admin-supplied text | Draft `Module` / `Lesson` rows in the editor |
| Library collection thumbnail | Admin saves a collection | Admin-supplied title + description | `LibraryCollection.thumbnailUrl` |

### 2.2 Scope

| Dimension | Detail |
|---|---|
| Data subjects | (a) Learners — STUDENT / INTERN / EMPLOYEE — including under-18s in school / college / supported-internship contexts. (b) Adult users in training, careers and admin roles. |
| Data categories sent in AI payloads | User-authored CV text; questionnaire answers; lesson notes; aggregate survey response counts; admin-supplied training source material. |
| Data categories explicitly **not** sent | Name (other than where the user includes it in CV text), email, organisation, role, account id, IP address, special-category data (the platform does not collect health / ethnicity / religion / biometric / sexual-orientation data at all). |
| Volume | ≤ 30 customer organisations and ≤ 5 000 active users in year 2. |
| Geography | UK controllers. Processing in US (Vercel AI Gateway and its upstream providers Google / Anthropic / OpenAI) under SCC + UK Addendum. |
| Duration | AI output retained until the user deletes it or closes their account. AI Gateway observability logs retained per Vercel DPA. Upstream provider DPAs confirm that API inputs are not used for training and are not retained beyond processing. |

### 2.3 Context

- The service is contracted by the customer organisation; learner usage is mediated by the organisation's careers professional / org admin in most cases.
- Under-18 learners are not the *target* audience for the platform's core training tracks — they appear in STUDENT / INTERN cohorts as part of educational programmes commissioned by the customer org. Where they do appear, the platform is treated as in scope for AADC (see [AADC.md](AADC.md) v2.0).
- AI outputs are **explicitly non-deterministic suggestions**. The Careers Advisor report uses the framing "career *suggestions*" rather than "career advice"; CV suggestions are presented as drafts to edit, not as final copy.

### 2.4 Purposes

1. **Reduce barriers to CV-writing** for autistic learners who find blank-page tasks difficult.
2. **Surface career options** matched to a learner's own stated interests, strengths, and sensory / communication preferences.
3. **Generate aggregate survey insights** that help the charity improve the service without exposing respondent-level data.
4. **Speed admin workflows** (quiz generation, library metadata) so charity staff can focus on programme work.

The platform **does not** diagnose autism or any other condition. Every prompt in the `AiPrompt` registry instructs the model never to diagnose or to suggest a diagnosis, to be strength-focused, and to use UK English. Reports framed for learners use language like "you might find..." and "people with similar interests have..." rather than predictive or deterministic phrasing.

## 3. Consultation

| Party | Consulted | Outcome |
|---|---|---|
| Ambitious About Autism internal DPO | 2026-05-11 | Pending sign-off. |
| Customer DPOs | Per-procurement | This DPIA forms part of the due-diligence pack shared with each school / college / LA / employer DPO at procurement. |
| Learners (lived-experience input) | Iterative — CV Builder UX was designed against accessibility principles (auto-save, visible examples, single AI suggestion not multi-option) | Ongoing via product feedback channels. |
| ICO | Not required | No residual high-risk outcome after mitigations (§5). |

## 4. Necessity & proportionality

- **Lawful basis (Art. 6):** Contract (Art. 6(1)(b)) — performance of the service contract between the charity and the customer organisation.
- **Special-category basis (Art. 9):** Not engaged — no Art. 9 data is processed. The platform's audience (autistic learners) is not itself a data category recorded against any user.
- **Data minimisation:** AI payloads carry only the content needed for the specific feature — no identifiers, no account metadata. The prompt registry sanitises user-authored HTML / text through `lib/sanitize.ts`. The data minimisation posture is enforced at the schema level: the platform does not have columns for surname, address, NHS number, UPN, photograph, ethnicity, or religion.
- **Storage limitation:** AI output is kept on the user's own record and deleted on account closure or on user deletion of the parent object (CV, careers session, etc.).
- **Purpose limitation:** Upstream provider DPAs prohibit use of API content for model training. The Vercel AI Gateway adds an observability layer that the controller should review when signing the Vercel DPA.
- **Less-intrusive alternatives considered:** Self-hosted open-source LLMs (rejected — operational cost and security review burden disproportionate at year-2 scale); deterministic templates only (rejected — gives every learner the same output; loses the personalisation value).

## 5. Risk register

Each risk is scored *Likelihood × Severity* before mitigation (Gross) and after mitigation (Net).

| # | Risk | L | S | Gross | Mitigation | L' | S' | Net |
|---|---|---|---|---|---|---|---|---|
| R1 | A learner reads an AI careers suggestion as deterministic employment advice and acts on it without further support. | Med | High | High | Output framed as "suggestions" not "advice"; learner is routed back to a careers professional inside the platform; CDOs have read-only visibility of student sessions to discuss them; prompts instruct the model never to commit to outcomes. | Low | Med | **Med** |
| R2 | AI generates biased or stigmatising output for an autistic learner (e.g. recommends only stereotypical roles). | Med | High | High | Prompts are explicitly strength-focused, UK English, and forbid deterministic / diagnostic phrasing; multiple upstream providers available so the charity can route around any one provider whose output quality regresses; prompt registry is editable by the charity. | Low | Med | **Med** |
| R3 | Identifiable data leaks into a prompt because a learner pastes name / email / address into a free-text CV section. | High | Low | Med | AI payload structure is content-only; the system never adds identifiers; user-authored text is sanitised before transmission; provider DPAs prohibit training-set use so even a leaked payload does not contaminate future model output. | Low | Low | **Low** |
| R4 | Prompt injection from user-authored input causes an AI call to behave outside its prompt template (e.g. emit confidential prompt text). | Med | Med | Med | Prompts are loaded from the DB-backed `AiPrompt` registry; user input is concatenated as a delimited section, not woven into prompt control text; admin-prompt test endpoint sanitises error responses to strip provider stack traces. | Low | Med | **Low** |
| R5 | Upstream provider retains content despite DPA. | Low | High | Med | Multi-provider routing (Google / Anthropic / OpenAI) gives the charity a credible escape route if a provider's DPA materially changes; controller is alerted via the standard sub-processor change process in §2 of [ROPA.md](ROPA.md). | Low | Med | **Low** |
| R6 | Under-18 learner cannot exercise their own GDPR rights because the data is held against their organisation. | Med | Med | Med | Account self-service in `/settings` allows users (including under-18s) to view and export their own CV / careers data, and to delete it. Org admin can deactivate or delete an account on request. The DPO inbox is published at `/privacy`. |  Low | Low | **Low** |
| R7 | Credential compromise → AI history exfiltrated. | Med | Med | Med | bcrypt cost factor 12; rate-limited login (10 / 15 min / IP); MFA mandatory for SUPER_ADMIN / CHARITY_EMPLOYEE / ORG_ADMIN; 8-hour JWT session TTL; ownership-checked queries on every read. | Low | Med | **Low** |
| R8 | Vendor lock-in to a single AI provider → service-availability risk. | Med | Med | Med | AI Gateway model strings are configurable per `AiPrompt` row; charity can swap `google/gemini-2.5-flash` for `anthropic/claude-haiku-4` or `openai/gpt-4o-mini` without code changes. | Low | Low | **Low** |
| R9 | Survey insight report inadvertently identifies a respondent in a small sub-group (e.g. only 1 respondent matches a filter). | Low | Med | Low | Survey insights operate on aggregate response counts; respondents pseudonymised with per-survey key (security-audit hardening, 2026-05); admin UI does not surface respondent-level rows except where the survey is non-anonymous by design. | Low | Low | **Low** |
| R10 | AI Gateway provider list changes and adds a sub-processor outside the SCC framework. | Low | High | Med | Sub-processor list reviewed at the same cadence as the Vercel DPA (§2 of [ROPA.md](ROPA.md)); 30-day notice to controller orgs on material change. | Low | Med | **Low** |

**Residual highest risk: Medium** (R1, R2) — both arise from the inherent non-deterministic nature of LLM output and are managed through framing, human-in-the-loop (CDO oversight), and provider portability rather than purely technical controls. ICO consultation is not required.

## 6. Measures — technical & organisational

### 6.1 Technical

| Measure | Where implemented |
|---|---|
| AI Gateway routing & multi-provider portability | `lib/ai-runner.ts`, `lib/ai-models.ts` |
| Prompt registry (model never instructed to diagnose) | `AiPrompt` table; `lib/ai-runner-assemble.ts` |
| Input sanitisation (HTML / rich text) | `lib/sanitize.ts` (sanitize-html) |
| Rate limiting on AI endpoints (10 / 5 min / user) | `lib/rate-limit.ts` (Upstash-backed in prod) |
| Role-based access control | `middleware.ts`, `lib/rbac.ts` |
| Row-level ownership on AI history reads | `app/api/cv-builder/`, `app/api/careers-advisor/` route handlers |
| Password hashing | bcrypt cost factor 12 (`lib/auth.ts`) |
| Session TTL | 8 h JWT (`lib/auth.ts`) |
| MFA for admins | `otpauth` TOTP, enforced in middleware |
| Forced password change on admin-created accounts | `mustChangePassword` flag |
| Token hashing at rest (reset / welcome tokens) | `lib/reset-token.ts` (SHA-256) |
| Admin prompt-test error sanitisation | `/api/super-admin/ai-prompts/[id]/test` (security-audit hardening) |
| Survey respondent pseudonymisation | per-survey key; security-audit hardening, 2026-05 |
| Encryption in transit | HTTPS (TLS 1.3, Vercel) |
| Encryption at rest | Neon Postgres AES-256; Vercel Blob AES-256 |

### 6.2 Organisational

- **DPO:** privacy@ambitiousaboutautism.org.uk — responds to SARs within 30 days.
- **Breach process:** confirmed breaches reported to ICO within 72 h per Art. 33; affected customer DPOs notified immediately.
- **Sub-processor list:** published at `/privacy`; cross-referenced in [ROPA.md](ROPA.md). Changes notified to customer orgs 30 days in advance.
- **Staff training:** all engineering staff complete annual DP / infosec training; access to production data is restricted to named engineers.
- **Access review:** every six months, SUPER_ADMIN reviews ORG_ADMIN and CHARITY_EMPLOYEE accounts and deactivates dormant ones.
- **Prompt review:** the charity reviews the `AiPrompt` registry quarterly; any prompt change is versioned (`previousFields` JSON column preserves the prior text for one-step undo).

## 7. Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| DPIA author (Engineering) | | 2026-05-11 | |
| Ambitious About Autism DPO | | | |
| Customer DPO (per procurement) | | | |

**Decision:** Processing may proceed. No further ICO consultation required. Next review: 2027-05-11, or sooner on material change (new AI feature category, new sub-processor outside the SCC framework, change in upstream provider DPA training-use terms, or reintroduction of any Art. 9 processing).
