# ICO Age-Appropriate Design Code — Compliance Matrix

**Product:** Ambitious About Autism Training & Observation Platform — Child Observations feature
**Version:** 1.0 — 2026-04-19
**ICO Code:** [Age Appropriate Design: a code of practice for online services](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/)

The AADC applies because the platform processes the personal data of children and is *likely to be accessed by children* (via the caregiver account they belong to, and directly once a child reaches 13 and exercises their own rights).

Each of the 15 standards is mapped to platform implementation.

| # | Standard | Status | Implementation |
|---|---|---|---|
| 1 | **Best interests of the child** | ✅ | Product decisions prioritise the child's welfare over commercial considerations. No advertising. No engagement-maximising mechanics. AI outputs are explicitly non-diagnostic and instruct caregivers to consult professionals. Disclaimer shown on every caregiver page. |
| 2 | **Data protection impact assessments** | ✅ | DPIA completed for Child Observations feature ([DPIA.md](./DPIA.md)). Review cycle: annual or on material change. |
| 3 | **Age appropriate application** | ✅ | The service is designed for adults (caregivers) who act on behalf of children. Where a child-data-subject reaches 13 and can exercise their own rights, the caregiver UI surfaces an amber banner reminding the caregiver to inform the young person. Direct child access is not a feature. |
| 4 | **Transparency** | ✅ | Privacy policy rewritten 2026-04-19 in plain English; published at `/privacy`. Disclaimer on every caregiver page. Audit log available to the caregiver themselves at `/activity`. At-13 banner summarises the young person's rights. |
| 5 | **Detrimental use of data** | ✅ | Data is used only for (a) the caregiver's own tracking UI, and (b) AI reports requested explicitly by the caregiver. No profiling for ads, behavioural targeting, or model training. Google Gemini API ToS prohibits use of API content for model training. |
| 6 | **Policies and community standards** | ✅ | AaA's published safeguarding policy applies to all processing. T&C enforce age gate on caregiver registration (adult only). |
| 7 | **Default settings** | ✅ | Settings that reveal data (AI report generation, document export) default to **off** — the caregiver must explicitly trigger each. Retention defaults to the most-conservative ICO-recognised value for special-category data (1 095 days = 3 years). |
| 8 | **Data minimisation** | ✅ | Only first name + DOB identifies a child. Surname, address, UPN, NHS number, photograph **not** collected. Free-text notes columns **removed** 2026-04-19 to enforce this at the schema level. AI calls receive pseudonym + age bucket only — never real name or exact DOB. |
| 9 | **Data sharing** | ✅ | No sharing with third parties except named sub-processors listed in [ROPA.md](./ROPA.md). No data sharing for marketing. AI processor (Google) receives pseudonymised data only. |
| 10 | **Geolocation** | ✅ | **Not collected.** Observation `context` uses the four-value enum (Home / Nursery / Outdoors / Other) — free-text location descriptors are not permitted. IP address is logged for audit purposes only, never used to geo-target content. |
| 11 | **Parental controls** | ✅ | In this product the parent *is* the caregiver in most deployments. Where a school/LA is the caregiver, the product requires them to attest that parental consent has been obtained (`Child.consentObtainedAt`). A parent can demand the full record via the caregiver, who can produce it in ≤ 5 seconds via the `/api/children/[childId]/export` one-click SAR export. |
| 12 | **Profiling** | ✅ | AI reports are the only profiling-adjacent feature. Each run is triggered manually by the caregiver (no automatic behavioural profiling), receives pseudonymised input, never includes a diagnosis, and every run is logged. |
| 13 | **Nudge techniques** | ✅ | No dark patterns. No engagement streaks. No reward loops. No push for additional data disclosure. Delete and export buttons are as prominent as "add observation". |
| 14 | **Connected toys and devices** | N/A | Platform is a web app only. No IoT integration. |
| 15 | **Online tools** | ✅ | The `/activity` page gives the caregiver a plain-English view of every event recorded about their actions, with one-click download of any child record. The `/admin/audit` page gives the org DP contact the same view scoped to their organisation. SAR response time: minutes, not the 30-day UK GDPR maximum. |

---

## Evidence locations in the codebase

| Claim | File(s) |
|---|---|
| Data minimisation (no free-text narrative) | `prisma/schema.prisma` (Child / Observation models — no `notes` column) |
| Pseudonymisation before AI | `lib/pseudonymise.ts`, `lib/gemini.ts` |
| Audit log | `prisma/schema.prisma` (`ObservationAccessLog`), `lib/observation-audit.ts` |
| Retention enforcement | `app/api/cron/retention/route.ts`, `vercel.json` |
| Caregiver SAR export | `app/api/children/[childId]/export/route.ts` |
| At-13 banner | `app/(dashboard)/children/[childId]/page.tsx` |
| Caregiver activity log | `app/(dashboard)/activity/page.tsx`, `app/api/activity/route.ts` |
| Org-admin audit viewer | `app/(org-admin)/admin/audit/page.tsx`, `app/api/admin/audit/route.ts` |
| Super-admin audit viewer | `app/(super-admin)/super-admin/audit/page.tsx`, `app/api/super-admin/audit/route.ts` |
| Per-org lawful basis | `prisma/schema.prisma` (`Organisation.observationLawfulBasis / RetentionDays`), `app/(super-admin)/super-admin/organisations/[orgId]/page.tsx` |

## Residual gaps

None identified at time of writing. Review at next annual cycle (2027-04-19) or upon material change.
