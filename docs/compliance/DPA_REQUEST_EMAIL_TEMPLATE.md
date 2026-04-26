# DPA Request Email Template

Use this template when a processor doesn't have a self-serve DPA flow and you need to email their support / legal / privacy team.

For the asd-training-app, the only processor that requires an email request is **Neon** (`support@neon.tech`). Vercel, Resend, and ElevenLabs all have self-serve DPA flows in their dashboards — see [`PRE_LAUNCH_ACTIONS.md`](PRE_LAUNCH_ACTIONS.md).

---

## Template — copy from below

> **To:** `support@neon.tech` *(or the relevant processor's privacy / compliance address)*
> **Subject:** Data Processing Agreement request — UK GDPR Article 28

Hello,

I'm writing on behalf of **[Charity legal name, e.g. Ambitious about Autism]** (registered charity number **[charity number]**, registered office **[full UK address]**) to request your standard **Data Processing Agreement (DPA)** for execution.

We are a UK-based data controller subject to the UK GDPR and the Data Protection Act 2018, and we use **[processor name]** to process personal data on our behalf. Article 28 UK GDPR requires us to have a written DPA in place with each of our processors, and we'd like to put one on file before we onboard wider end-users to our platform.

**Brief description of how we use your service:**

We operate a multi-tenant web application (the *ASD Training Platform*) for caregivers, careers professionals, autistic students, and organisation administrators to access training, virtual workshops, document libraries, and CV / careers tools. **[Processor name]** is used as **[one short sentence — e.g. "the managed PostgreSQL database where all platform data is stored at rest"]**.

**Data categories we send through your service:**

- User account data (name, email, role, organisation membership)
- Training progress records and SCORM CMI snapshots
- User-authored content (CV drafts, careers questionnaire answers, lesson notes)
- Survey responses
- Document library files and metadata

**No special-category data (UK GDPR Article 9) is sent through your service.** We do not store health records, biometric data, or data about identified third parties (including children).

**What we'd appreciate from you:**

1. Your standard DPA for counter-signature
2. The current sub-processor list (so we can verify the chain of processing)
3. Confirmation of the data hosting region(s) and any international transfer mechanism (UK Extension to the EU-US Data Privacy Framework, Standard Contractual Clauses, or UK International Data Transfer Agreement)

We're happy to use your standard form rather than negotiate bespoke terms — we just need an executed copy on file.

Many thanks,

**[Your name]**
**[Role — e.g. Data Protection Officer / Operations Lead]**
**[Charity legal name]**
**[Email]** · **[Phone (optional)]**
**[Charity registered office address]**

---

## Notes for the sender

- Replace every `**[bracketed]**` placeholder before sending.
- Send from a charity-domain email address (not a personal Gmail / Outlook), so the processor's compliance team can verify your identity.
- Most providers respond within 3–5 business days. If a response hasn't arrived in 7 business days, follow up.
- When the DPA arrives:
  - Read it. Most are template-based and unobjectionable, but check the **sub-processor appendix** and the **data hosting region** — those are the two places where surprises occur.
  - Have a **trustee or executive with authority to bind the charity** sign it, not just the DPO.
  - Save both the unsigned and counter-signed copies in the compliance folder, with the date it was executed.
- If the processor's DPA refers to standard clauses by reference (e.g. "incorporates the EU SCCs"), download those linked documents too — you need the complete chain on file, not just the cover page.

---

## When you DON'T need this template

You don't need to email anyone for the following processors — the DPA is self-serve in their dashboard:

| Processor | Where to find it |
|-----------|------------------|
| Vercel | <https://vercel.com> → Settings → Legal → Data Processing Agreement |
| Resend | <https://resend.com> → Settings → Compliance → DPA |
| ElevenLabs | <https://elevenlabs.io> → Settings → Compliance → DPA |

Just accept the DPA in their UI and download the counter-signed copy.
