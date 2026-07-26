# AAA Digital Platform — Training Materials

**Version 2.0 · 11 May 2026 · Internal use only**

Onboarding materials, quick-reference cards, FAQs, and a glossary covering every user role on the AAA Digital Platform.

> **Changes since v1.0:** Updated the "Can users self-register?" FAQ (self-registration is now enabled — see the [Self-Registration Flow](AAA_Self_Registration_Flow.pdf) document). Added a Charity Employee onboarding checklist. Added FAQ entries on cohorts and brand assets.

## Platform Overview

### What is the AAA Digital Platform?

A training platform for Ambitious about Autism. It delivers structured training programmes to the charity's own staff and to external organisations — schools, colleges, universities and employers — alongside virtual workshops, a document library and a job board.

### Who uses it?

There are four roles.

- **Learners** (`LEARNER`) — anyone who takes training, whether charity staff or a member of an external organisation. Training, jobs, workshops and the document library.
- **Organisation Admins** (`ORG_ADMIN`) — manage their own organisation's users, workshops, job openings, library and reports
- **Charity Staff** (`CHARITY_EMPLOYEE`) — delegated charity-level access, permissions configurable per user
- **Charity Admins** (`SUPER_ADMIN`) — full platform access

**What a learner sees is set by their organisation, not their role.** Access comes from the training programmes an organisation has been assigned, so two learners in different organisations can see entirely different content. Internal versus external is a property of the organisation too: the charity has its own organisation record, and its staff are ordinary members of it.

### Training programmes

ASD Awareness Training · Careers CPD Training · Autism in the Workplace · custom SCORM packages uploaded by the charity. Progress is tracked automatically and completion earns a certificate.

### Job openings

Two tiers, both shown in one list to the learner. The charity publishes curated opportunities platform-wide; an organisation can publish its own, visible only to its members and to any child organisations beneath it. Listings carry autism-friendly notes describing what makes the role and workplace suitable, and close automatically once the closing date passes.

### Admin features

User management · Organisation hierarchy · Cohort management (with optional Eventbrite import) · Brand asset store · Document library · Surveys with AI insights · Workshops & sessions · Job board · Announcements · Reports & CSV export · Enterprise SAML SSO · AI Prompt registry · Integration API keys.

### Technology

Built on Next.js 14, hosted on Vercel, database on Neon PostgreSQL. AI via the Vercel AI Gateway (Gemini / Claude / GPT). Text-to-speech via ElevenLabs (Lily voice). Email via Resend.

## Onboarding Checklists by Role

### Learner (`LEARNER`)

- ☐ Receive a welcome email from the platform, or be invited by an Organisation Admin
- ☐ Click the welcome link and pick a password on `/welcome`
- ☐ Land on the dashboard — review assigned training and announcements
- ☐ Start the first training module from the sidebar
- ☐ Complete all lessons and quizzes to earn a certificate
- ☐ Browse the Jobs board for opportunities
- ☐ Check the Workshops section for upcoming sessions
- ☐ Update display name in Settings → Account

### Organisation Admin (`ORG_ADMIN`)

- ☐ Sign in and **complete MFA setup** — mandatory for admin roles
- ☐ Review organisation settings (allowed programmes, allowed roles, feature flags)
- ☐ Invite the first colleagues with appropriate roles
- ☐ Create a test announcement to verify it appears on dashboards
- ☐ Create a workshop session and invite attendees
- ☐ Review the Reports page to understand available data
- ☐ Configure Zoom or Teams API in Meeting Settings if you want auto-generated meeting links
- ☐ Review Document Library collections shared with your org
- ☐ Configure SAML SSO at Enterprise SSO if your org uses an IdP

### Charity Employee (`CHARITY_EMPLOYEE`)

A delegated charity-level role with configurable permissions. Sidebar items appear based on which permissions a Charity Admin has granted you.

- ☐ Sign in and **complete MFA setup**
- ☐ Confirm your `charityPermissions` with the Charity Admin who created your account
- ☐ Walk through each section your sidebar shows
- ☐ Read the Charity Admin Guide sections for the permissions you've been granted

### Charity Admin (`SUPER_ADMIN`)

- ☐ Sign in and **complete MFA setup**
- ☐ Review the Overview dashboard
- ☐ Create the first real organisation
- ☐ Invite that org's first administrator
- ☐ Review and publish training content
- ☐ Set up the AI Prompt registry — review the tone & model for each prompt
- ☐ Upload initial brand assets (logos, banners) for the AI banner generator
- ☐ Create a charity-level cohort if running open workshops
- ☐ Set up the Integration API key for Power Automate / external reporting if needed
- ☐ Configure OAuth SSO toggles if Google / Microsoft credentials are present
- ☐ Test the full user journey end-to-end: self-register a test learner → complete a lesson → view the report

## General FAQs

**Q: How do I log in?**
A: Go to the platform URL, type your email, and the page shows the right sign-in method (password, SSO button, or both) automatically. There's no manual toggle.

**Q: I forgot my password — what do I do?**
A: Click *Forgot password?* on the login page and enter your email. You'll receive a reset link valid for 1 hour.

**Q: I never set a password — I got a welcome email but lost it.**
A: Ask your Org Admin to resend it, or use the *Forgot password?* link with the email you registered.

**Q: Why can't I see some menu items?**
A: Menu items depend on your role and, for learners, on which training programmes your organisation has been assigned. Contact your admin if you believe something is missing.

**Q: Is my data secure?**
A: Yes. Passwords are bcrypt-hashed at cost 12. Sessions use signed JWT tokens with an 8-hour TTL. MFA is mandatory for admin roles. All traffic is over HTTPS. The platform is hosted on Vercel with Neon's SOC 2 compliant database. Sub-processor list and DPA status are published at `/privacy`.

## Learner FAQs

**Q: How do I unlock the next module?**
A: Complete all lessons in the current module. The next module is then unlocked automatically.

**Q: Can I retake a quiz?**
A: Yes — you can retry immediately after a failed attempt.

**Q: How do I get my certificate?**
A: Your Certificate of Completion appears automatically after you finish the final lesson in a module.

**Q: What is the TTS play button?**
A: TTS (Text-to-Speech) reads lesson content aloud using the Lily voice from ElevenLabs. Click the play button at the top of any text lesson.

**Q: Can I add personal notes to a lesson?**
A: Yes — every lesson has a notes field. Notes are private to you.

**Q: Where do the job listings come from?**
A: Two places, shown together in one list. Ambitious about Autism publishes curated opportunities platform-wide, and your own organisation can publish its own. A job may also be assigned to you individually, in which case it appears even if it was not otherwise aimed at your organisation.

**Q: What are the autism-friendly notes on a job?**
A: A description from the employer of what makes the role and workplace suitable — predictable hours, quiet spaces, a named contact, an adjusted interview process, and so on. Not every listing has them.

**Q: A job disappeared from my list. Why?**
A: Listings close automatically once their closing date passes. If it was assigned to you individually, you can still reach it from a direct link.

## Organisation Admin FAQs

**Q: Why is MFA mandatory for my account?**
A: Admin accounts have access to all user data in your organisation. MFA protects against unauthorised access if a password is compromised.

**Q: How do I create a user's account?**
A: Go to Users → Add User. Enter their name, email, role, and a temporary password (or tick "SSO only" if your org uses Google / Microsoft / SAML). The user is prompted to change the password on first sign-in.

**Q: Can users self-register without me inviting them?**
A: **Yes** — as of May 2026, self-registration is enabled. A user from your organisation can visit `/register`, select "I work for or study at an existing organisation", and find your org in the typeahead. They'll only see roles your org has approved (`allowedRoles`). They get a welcome email and choose their own password. You can deactivate them from the Users page if needed. To disable self-registration into your org, contact the Charity Admin.

**Q: How do I configure automatic meeting links for workshops?**
A: Go to Settings → Meeting Settings and enter your Zoom or Microsoft Teams API credentials. The platform will generate meeting URLs automatically when you create a workshop.

**Q: My organisation manages multiple schools — how does that work?**
A: If your org is flagged as a parent organisation (`isParentOrg`), a **Schools** link appears in your sidebar. From there you can create and manage child orgs. Child orgs with **Inherit Settings** on share your training programmes, allowed roles, and feature flags.

## Charity Admin FAQs

**Q: How do I enable Google / Microsoft sign-in?**
A: Two steps. (1) Set `GOOGLE_CLIENT_ID` / `AZURE_AD_CLIENT_ID` env vars in Vercel and redeploy. (2) Sign in as Charity Admin, go to Settings → SSO, and flip the matching toggle on. The toggle won't activate without the env vars (an amber warning appears).

**Q: What's the difference between an Organisation and a Cohort?**
A: Both are rows in the `Organisation` table. **Organisations** are registered schools / employers with their own admin and ongoing user accounts. **Cohorts** are lightweight groups for one-off events (a public workshop, an awareness session) — members are managed by the charity directly, with no organisation admin. Cohorts can also be imported from Eventbrite event attendee lists.

**Q: How do brand assets get used?**
A: The Brand Store under Charity Admin holds AAA logos, banners, and illustrations. The AI banner generator and AI library-thumbnail features use them as context so the output stays on-brand. You can tick "Use brand store as context" on the banner-generation modal.

**Q: How do I extract reporting data into our internal system (e.g. Dynamics 365)?**
A: Create an Integration API key at `/super-admin/integrations`, then call `/api/integrations/reports?section=training|library|surveys` with a Bearer token. The raw key is shown only once on creation — store it safely.

## Quick Reference Cards

### Learner — key URLs

`/dashboard` · `/training` · `/sessions` · `/settings` · `/cv-builder` · `/careers-advisor` · `/jobs` · `/library`

### Admin — key URLs

`/admin` (Org Admin) · `/super-admin` (Charity Admin) · `/admin/users` · `/admin/sessions` · `/admin/reports` · `/admin/library` · `/admin/settings/sso` · `/admin/settings/meetings` · `/super-admin/cohorts` · `/super-admin/integrations` · `/super-admin/ai-prompts`

### Roles at a glance

- `SUPER_ADMIN` = Charity Admin
- `CHARITY_EMPLOYEE` = Charity Staff (configurable permissions)
- `ORG_ADMIN` = Organisation Admin
- `LEARNER` = Learner (everyone who takes training, internal or external)

### Support contacts

- **Login or password reset:** Org Admin (or Forgot Password link)
- **Missing menu item or feature:** Org Admin (they control your role + org settings)
- **Platform-wide issue:** Charity Admin
- **Technical issue or bug:** Charity Admin (escalates to development team)
- **Training content question:** Charity Admin
- **SSO configuration:** Charity Admin or charity IT team

## Glossary

| Term | Definition |
|---|---|
| AAA Digital Platform | The Ambitious about Autism training and career-development platform |
| LEARNER | The single role for everyone who takes training. What they can see comes from their organisation's assigned programmes |
| Cohort | A lightweight group for charity-run events (organisation row with `orgType = COHORT`) |
| MFA | Multi-Factor Authentication — a second login step using an authenticator app |
| TOTP | Time-based One-Time Password — the 6-digit code generated by authenticator apps |
| SCORM | Sharable Content Object Reference Model — a standard for packaged e-learning content |
| TTS | Text-to-Speech — reads lesson content aloud using ElevenLabs (Lily voice) |
| SSO | Single Sign-On — log in using an existing Google, Microsoft, or SAML-federated account |
| SAML | Security Assertion Markup Language — enterprise SSO standard |
| Magic link | The 24h tokenised welcome email used by self-registration |
| Brand asset | Logo, banner, illustration uploaded by the charity for AI context |
| Neon | Cloud PostgreSQL database hosting the platform data |
| Vercel | Cloud platform where the app is deployed |
| Prisma | ORM (Object Relational Mapper) used to query the database |
| NextAuth | Authentication library managing login sessions |
| Vercel Blob | Cloud file storage for documents, images, SCORM packages, TTS audio cache |
| AI Gateway | Vercel AI Gateway — routes AI requests to Gemini / Claude / GPT with multi-provider fallback |
| Resend | Transactional email provider used for welcome links, password resets, scheduled reports |

## Help & Support

> **Tip:** Most admin pages include a "How to use this page" expandable section. Click it for in-app guidance specific to that page.

| Need help with | Who to contact | How |
|---|---|---|
| Login or password reset | Org Admin | Direct contact or Forgot Password link |
| Missing menu item or feature | Org Admin | They control your role and org settings |
| Platform-wide issue | Charity Admin (`SUPER_ADMIN`) | Contact the Ambitious about Autism team |
| Technical issue or bug | Developer / Charity Admin | Report via GitHub issues or direct contact |
| Training content question | Charity Admin | They manage all training content |
| SSO configuration | Charity Admin or IT team | Requires Azure AD / Google Cloud / SAML IdP access |
| Cohort import / Eventbrite | Charity Admin | Permission `MANAGE_COHORTS` required |
| Brand asset upload | Charity Admin | Permission `MANAGE_LIBRARY` or `MANAGE_TRAINING` required |

## Companion Documents

| Document | Purpose |
|---|---|
| User Guide (`AAA_User_Guide.pdf`) | Step-by-step guide for learner-facing roles |
| Admin Guide (`AAA_Admin_Guide.pdf`) | Full guide for Org Admins, Charity Staff, and Charity Admins |
| Technical Setup Guide (`AAA_Technical_Setup_Guide.pdf`) | Developer reference for setup, deployment, and troubleshooting |
| Data Dictionary (`AAA_Data_Dictionary.pdf`) | Complete database schema reference |
| Handover Plan (`AAA_Digital_Platform_Handover_Plan.pdf`) | Credential transfer and go-live checklist |
| Self-Registration Flow (`AAA_Self_Registration_Flow.pdf`) | How new users sign up — the three paths plus OAuth completion |
