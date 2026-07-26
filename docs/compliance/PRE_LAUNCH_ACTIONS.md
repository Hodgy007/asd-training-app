# Pre-Launch Compliance Actions

**Audience:** Charity DPO / trustees / operations lead
**Owner of this doc:** Development team (keeps it in sync with the main compliance review at [`compliance/SECURITY_AND_COMPLIANCE.md`](../../compliance/SECURITY_AND_COMPLIANCE.md))
**Last reviewed:** 26 April 2026

---

## What this document is

The platform's technical security controls are in place (MFA, RBAC, encryption, sanitisation, etc.). But UK GDPR also requires a small amount of **paperwork and registration** before the platform can be considered launch-ready for the wider charity audience. This document is the punch-list for that paperwork — written so a non-technical reader can pick it up and work through it step by step.

Each item below has:
- **What it is** — plain English
- **Why we need it** — the legal driver and the practical risk
- **What you actually need to do** — exact clicks / forms
- **How long / how much** — realistic effort and cost

When all items have a green tick, the platform is launch-ready from a UK GDPR perspective.

---

## High-priority gaps

These two are statutory — i.e. the charity is technically non-compliant from the moment the platform goes live to real users, regardless of how good the technical controls are. Both are paperwork, not code, and together cost roughly £100 + a few hours of admin time.

### 1. Confirm ICO registration

#### What it is

Under the **Data Protection (Charges and Information) Regulations 2018**, any UK organisation that processes personal data must pay an annual **data protection fee** to the **Information Commissioner's Office (ICO)** unless they qualify for an exemption.

The fee is tiered by organisation size:

| Tier | Annual fee | Who it covers |
|------|-----------|---------------|
| Tier 1 | £52 | Micro organisations — ≤10 staff and ≤£632K turnover |
| Tier 2 | £78 | Small/medium — ≤250 staff and ≤£36M turnover |
| Tier 3 | £3,763 | Large organisations |

**Charity exemption — careful here.** Charities only qualify for an exemption if they process personal data **solely for their charitable purpose** and don't trip any catch-alls. Running an interactive web platform with user accounts, training analytics, third-party SSO, and AI features goes beyond what the ICO accepts as "solely for charitable purposes" in their narrow reading. **Most charities running a system like this do need to register.**

#### Why we need it

- It's statutory. Non-payment is a fixed regulatory offence — the ICO can issue penalties **up to £4,350** for failure to register / pay.
- Once registered, the charity's **registration number** must appear in privacy notices (we'll need to add it to the `/privacy` page on the platform).
- The number is a routine due-diligence check from partner organisations, large funders, schools, and DBS-related work.

#### What you actually need to do

1. **Run the ICO self-assessment** (15 minutes):
   <https://ico.org.uk/for-organisations/data-protection-fee/self-assessment/>
   It walks through ~15 multiple-choice questions about staff size, turnover, and what kinds of processing the organisation does. At the end it tells you which tier you're in (or that you're exempt).

2. **If a fee is due, register and pay**:
   <https://ico.org.uk/for-organisations/data-protection-fee/pay-fee/>
   Pay by direct debit (gives a £5 discount) or card. You'll be issued a registration number immediately.

3. **Save the registration certificate** in the charity's compliance folder along with the renewal date (annual).

4. **Pass the registration number to the dev team** so it can be added to the Privacy Policy page on the platform.

#### Effort & cost

- Time: 30 minutes today, then ~10 minutes per year for renewal
- Cost: £52 or £78 depending on the tier (or £0 if exempt)

#### Status

- [ ] Self-assessment completed
- [ ] Registered with ICO (if required)
- [ ] Registration number filed in compliance folder
- [ ] Privacy Policy updated with the registration number

---

### 2. Sign Data Processing Agreements (DPAs) with all processors

#### What a DPA is

A **Data Processing Agreement** is a contract between you (the *Data Controller* — the charity, who decides what to do with the personal data) and any company you pay to process personal data on your behalf (a *Data Processor*). It is required by **Article 28 of UK GDPR**.

The DPA spells out:
- What personal data is being processed
- Why (the purpose)
- How long it's kept
- What security controls the processor must apply
- What happens on a data breach
- Which sub-processors they're allowed to use
- What happens to the data when the contract ends

#### Why we need it

The platform sends personal data to several third parties as part of normal operation. Without signed DPAs in place, the charity is technically **in breach of UK GDPR Article 28** — even though every one of these providers offers a DPA, you have to actively accept / counter-sign / file a copy.

The practical risk is two-fold:
1. **Regulatory:** the ICO can fine for Article 28 non-compliance even if no data breach has occurred.
2. **Operational:** at audit or due-diligence time (large funders, partner orgs, safeguarding reviews) the missing DPA chain is the first thing that gets queried.

#### Which processors and which DPAs

| # | Processor | What it processes | DPA source | Cost |
|---|-----------|-------------------|------------|------|
| 2.1 | **Vercel** | Hosts the app, runs serverless compute, stores Blob files (documents, SCORM packages, job attachments, TTS audio cache), proxies AI calls through the AI Gateway | Self-serve in Vercel dashboard | Free |
| 2.2 | **Neon** (Postgres on Azure) | The PostgreSQL database — every user account, training record, survey response, etc. | Email Neon support (`support@neon.tech`) requesting their DPA | Free |
| 2.3 | **Resend** | Sends password-reset emails (recipient email + first name only) | Self-serve in Resend dashboard | Free |
| 2.4 | **ElevenLabs** | Text-to-speech for the lesson read-aloud feature (lesson text only, no user identifiers) | Self-serve in ElevenLabs dashboard | Free |
| 2.5 | **Upstream LLM providers** (Google, Anthropic, OpenAI) — sub-processors of Vercel via the AI Gateway | LLM inference for admin-triggered content generation and survey insights. Formerly also CV writing, Careers Advisor, survey insights, training quiz / content generation, library metadata. User-authored content only — no identifiers, no special-category data. | Verify these are listed as sub-processors under the **Vercel DPA**. If not, the charity may need to sign individual provider DPAs directly. | Free |

#### What you actually need to do — step by step

**Step 2.1 — Vercel** (~15 minutes)

1. Log into <https://vercel.com> with the team admin account
2. Go to **Settings → Legal → Data Processing Agreement**
3. Read the DPA, click **Accept**
4. Vercel emails a counter-signed copy to the team admin
5. Save the PDF in the charity's compliance folder
6. **Confirm sub-processor list** — the Vercel DPA appendix lists which sub-processors they use (this is where the AI Gateway upstream providers should appear). Tick item **2.5** below if they're listed; otherwise flag for separate action.

**Step 2.2 — Neon** (~10 minutes admin + a few days waiting for them to respond)

1. Email `support@neon.tech` with subject line: *"DPA request — UK GDPR Article 28"*
2. Body: include the charity's legal name, registered address, and a brief description of what's stored (PostgreSQL database for an ASD training platform). Ask them to send their standard DPA for counter-signature.
3. When the DPA arrives, have an authorised signatory (trustee or executive) sign it
4. Email the signed copy back to Neon
5. Save both copies in the charity's compliance folder

**Step 2.3 — Resend** (~10 minutes)

1. Log into <https://resend.com>
2. Go to **Settings → Compliance → DPA** (path may vary — the option is labelled *Data Processing Agreement*)
3. Read and accept; Resend emails the counter-signed copy
4. Save the PDF in the charity's compliance folder

**Step 2.4 — ElevenLabs** (~10 minutes)

1. Log into <https://elevenlabs.io>
2. Go to **Settings → Compliance → Data Processing Agreement**
3. Read and accept
4. Save the counter-signed PDF in the charity's compliance folder

**Step 2.5 — Verify upstream LLM provider coverage** (~15 minutes)

1. Open the Vercel DPA you saved in step 2.1 and find the sub-processor appendix
2. Confirm that the AI Gateway upstream providers used by the platform are listed: **Google LLC** (Gemini models), **Anthropic** (Claude models), **OpenAI** (GPT models)
3. If all three are listed → you're done — the Vercel DPA covers them
4. If any are missing → either:
   - Wait for Vercel to update the appendix (raise a support ticket asking for confirmation), OR
   - Sign individual DPAs with the missing provider(s) — links: [Google Cloud DPA](https://cloud.google.com/terms/data-processing-addendum), [Anthropic DPA](https://www.anthropic.com/legal/dpa), [OpenAI DPA](https://openai.com/policies/data-processing-addendum/)

#### Effort & cost

- Time: 2–3 hours of admin spread across the 5 items, plus a few days of waiting on Neon's email response
- Cost: £0 — every provider offers their DPA at no charge

#### Status

- [ ] 2.1 Vercel DPA accepted and filed
- [ ] 2.2 Neon DPA requested, signed, and filed
- [ ] 2.3 Resend DPA accepted and filed
- [ ] 2.4 ElevenLabs DPA accepted and filed
- [ ] 2.5 Upstream LLM providers verified as Vercel sub-processors (or individual DPAs signed)

---

## Once these are done

Update both:
- The DPO's compliance folder (file all the executed DPAs and the ICO certificate)
- The platform's `/privacy` page (add the ICO registration number, mention the third-party processors and their DPAs)

Then the **High priority** section of the compliance review can be ticked off, and the charity is in a defensible position to launch publicly.

The remaining **Medium** and **Low** priority items in the compliance review are improvements rather than launch blockers — see §12 of [`compliance/SECURITY_AND_COMPLIANCE.md`](../../compliance/SECURITY_AND_COMPLIANCE.md) for the full list.

---

## Email template

For step 2.2 (Neon) and any other provider you have to email rather than self-serve, see [`docs/compliance/DPA_REQUEST_EMAIL_TEMPLATE.md`](DPA_REQUEST_EMAIL_TEMPLATE.md).
