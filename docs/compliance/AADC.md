# ICO Age-Appropriate Design Code — Compliance Matrix

**Product:** Ambitious About Autism Training Platform
**Version:** 3.0 — 2026-07-26
**Supersedes:** v2.0 (2026-05-11), which mapped AADC to the CV Builder and Careers Advisor features removed in July 2026.
**ICO Code:** [Age Appropriate Design: a code of practice for online services](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/)

## Applicability

The platform is designed for adult-led training. Learner accounts can, however, be held by users under 18 (sixth-form pupils, FE college learners, supported-internship participants). The AADC therefore remains in scope because the service is *"likely to be accessed by children"*.

The platform processes only ordinary personal data. **No Art. 9 special-category data is processed and no children-as-data-subjects are tracked** — under-18 access to the platform is as an account holder over their own data, not as the subject of someone else's record. This is a substantially narrower AADC footprint than v1.0 (which assessed processing of children's developmental observations).

Each of the 15 AADC standards is mapped to the current implementation below.

| # | Standard | Status | Implementation |
|---|---|---|---|
| 1 | **Best interests of the child** | ✅ | No advertising. No engagement-maximising mechanics (streaks, leaderboards, rewards). AI outputs are explicitly framed as suggestions, not advice. The platform's commercial model is a per-seat charity service paid by the customer organisation, not by the learner, so there is no incentive to maximise learner-side engagement or data collection. |
| 2 | **Data protection impact assessments** | ✅ | DPIA v2.0 for AI-assisted processing for autistic learners — see [DPIA.md](DPIA.md). Review cycle: annual or on material change. |
| 3 | **Age appropriate application** | ✅ | The product is designed for adult-led use; under-18 learners participate via a customer organisation (school / college / employer / charity). UI tone is plain English. No age-restricted content is delivered to learner roles. CV Builder is an explicitly accessible 8-step wizard with auto-save and visible examples (rather than placeholders). |
| 4 | **Transparency** | ✅ | Privacy policy in plain English at [`app/privacy/page.tsx`](../../app/privacy/page.tsx); terms at [`app/terms/page.tsx`](../../app/terms/page.tsx). Sub-processor list cross-referenced from [ROPA.md](ROPA.md). All AI-generated reports are clearly labelled as AI-generated. |
| 5 | **Detrimental use of data** | ✅ | Data is used only for (a) the user's own training / CV / careers work, (b) aggregate insights to the controller organisation, and (c) anti-fraud / audit logging. **No profiling for advertising, no behavioural targeting, no model training.** Upstream LLM provider DPAs prohibit use of API content for model training. |
| 6 | **Policies and community standards** | ✅ | AaA's published safeguarding policy applies to all processing. Terms of service require the registering account holder to be an adult; learner accounts are provisioned by the customer organisation, not self-registered by a child. |
| 7 | **Default settings** | ✅ | No telemetry / analytics cookies. No data sharing with third parties beyond named sub-processors. AI features default to **off until explicitly invoked** (each survey-insight generation, each content-generation run is an admin click; no AI runs against a learner's record at all). MFA is enforced by default for all administrative roles. |
| 8 | **Data minimisation** | ✅ | The platform does not collect surname (only first / display name where the user enters it), home address, NHS number, UPN, photograph, ethnicity, religion, sexual orientation, or health diagnosis. AI payloads carry user-authored text only — no identifiers, no organisation metadata. |
| 9 | **Data sharing** | ✅ | Sub-processors limited to those listed in [ROPA.md](ROPA.md) §Sub-processor register. No sharing for marketing. AI processing routed through the Vercel AI Gateway whose upstream providers (Google / Anthropic / OpenAI) are bound by ToS that prohibit training-set use. |
| 10 | **Geolocation** | ✅ | The platform does not request or use device geolocation. IP address is logged for login-audit purposes only and is never used for content targeting or behavioural inference. |
| 11 | **Parental controls** | ✅ | In the platform's deployment model, the parent / guardian role sits with the customer organisation (school / college / supported-internship provider) rather than the platform itself. Where a learner wishes to involve a parent, the learner can download their own data (training certificates, lesson notes) via the in-app actions. ORG_ADMIN can deactivate or delete an under-18 learner's account at the parent's request. |
| 12 | **Profiling** | ✅ | **No profiling of any kind.** The two profiling-adjacent features (CV suggestions and the Careers Advisor report) were removed in July 2026. Remaining AI features are admin-triggered and operate on aggregate counts or admin-supplied source material, never on an individual learner's record. No behavioural or automated profile is built from training progress or login patterns. |
| 13 | **Nudge techniques** | ✅ | No dark patterns. No engagement streaks, no badge / point gamification, no push for additional disclosure. Delete and export controls are as prominent as create / save controls. |
| 14 | **Connected toys and devices** | N/A | Web application only. No IoT integration. |
| 15 | **Online tools** | ✅ | Account self-service at `/settings` exposes the user's own data; CVs can be exported as PDF or `.docx`; careers reports as PDF. The DPO inbox (`privacy@ambitiousaboutautism.org.uk`) is published at `/privacy`. SAR response time: typically minutes for self-service export, well inside the 30-day UK GDPR maximum for any manual request. |

---

## Evidence locations in the codebase

| Claim | File(s) |
|---|---|
| No special-category data on the schema (Child / Observation / AiInsight removed) | `prisma/schema.prisma` |
| Data minimisation (no surname / address / NHS / UPN / photo / ethnicity columns) | `prisma/schema.prisma` |
| AI Gateway routing & multi-provider portability | `lib/ai-runner.ts`, `lib/ai-models.ts` |
| Input sanitisation | `lib/sanitize.ts` |
| Rate limiting (auth + AI endpoints) | `lib/rate-limit.ts` |
| Role-based access control | `middleware.ts`, `lib/rbac.ts` |
| Token hashing at rest (reset / welcome) | `lib/reset-token.ts` |
| Auth-gated proxy for library / SCORM / job documents | `app/api/library/documents/[docId]/file/route.ts`, `app/api/scorm/[lessonId]/[...path]/route.ts`, `app/api/jobs/[jobId]/attachments/[attachmentId]/file/route.ts` |
| Survey respondent pseudonymisation | survey insight pipeline (security-audit hardening, 2026-05) |
| Accessible training and lesson surfaces | `app/(dashboard)/training/`, `components/lessons/` |
| Public privacy policy | `app/privacy/page.tsx` |
| Public terms | `app/terms/page.tsx` |
| Live security baseline | `compliance/SECURITY_AND_COMPLIANCE.md` v3.0 |

## Residual gaps

| Gap | Owner | Target |
|---|---|---|
| Add ICO registration number to `/privacy` once charity completes ICO self-assessment | Charity DPO + dev team | Tracked in `docs/compliance/PRE_LAUNCH_ACTIONS.md` §1 |
| Confirm Vercel DPA sub-processor appendix lists Google / Anthropic / OpenAI as upstream | Charity DPO | Tracked in `docs/compliance/PRE_LAUNCH_ACTIONS.md` §2.5 |
| Re-evaluate AADC applicability if the under-18 learner cohort grows materially (e.g. > 25 % of active learners), as this would warrant more aggressive child-specific defaults (e.g. mandatory high-privacy settings on new accounts) | Charity DPO | Next review: 2027-07-26 |

Review cycle: annual, or on material change to the platform's data flows, learner cohort composition, or sub-processor list.
