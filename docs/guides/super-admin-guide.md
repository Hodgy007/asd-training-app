# Super Admin User Guide

**Ambitious about Autism — Training Platform**

---

## Table of Contents

1. [Welcome](#1-welcome)
2. [First Login and MFA Setup](#2-first-login-and-mfa-setup)
3. [Dashboard Overview](#3-dashboard-overview)
4. [Managing Organisations](#4-managing-organisations)
5. [Managing Cohorts (Charity-Run Workshops)](#5-managing-cohorts-charity-run-workshops)
6. [Managing Training Content](#6-managing-training-content)
7. [AI Quiz Generation](#7-ai-quiz-generation)
8. [Announcements](#8-announcements)
9. [Reports](#9-reports)
10. [Document Library](#10-document-library)
11. [Surveys](#11-surveys)
12. [AI Prompts](#12-ai-prompts)
13. [Job Openings](#13-job-openings)
14. [Charity Employee Accounts](#14-charity-employee-accounts)
15. [Single Sign-On (SSO) Setup](#15-single-sign-on-sso-setup)
16. [Security and MFA](#16-security-and-mfa)

---

## 1. Welcome

As a Super Admin, you are responsible for the entire Ambitious about Autism training platform. You have access to tools and settings that no other user role can see.

Your responsibilities include:

- Creating and managing organisations (care providers, schools, employers, etc.) on the platform
- Deciding which training modules each organisation can access
- Building and maintaining all training content — modules, lessons, and quizzes
- Publishing platform-wide announcements to all users
- Viewing training progress reports across all organisations

Super Admins access a separate area of the platform at `/super-admin`. You will not see the regular learner dashboard — your navigation includes **Overview**, **Organisations**, **Cohorts**, **Training Content**, **Document Library**, **Surveys**, **Announcements**, **Workshops**, **Reports**, and **Integrations**.

---

## 2. First Login and MFA Setup

### Why MFA is required

Because Super Admins have platform-wide access, the system requires **two-factor authentication (2FA)** before you can use any admin features. This means, in addition to your password, you will need a short code from your phone each time you sign in.

This is not optional — you will be redirected to the MFA setup page automatically if it has not been configured.

### What you need before you start

- Your login email and password
- A smartphone or tablet
- An authenticator app installed on your phone. Any of the following will work:
  - **Google Authenticator** (free, iOS and Android)
  - **Microsoft Authenticator** (free, iOS and Android)
  - **Authy** (free, iOS and Android)

### Signing in

The login page has a toggle at the top to switch between **Email & Password** and **Single Sign-On** (Google / Microsoft). **Google and Microsoft SSO are currently disabled** — when the user opens the Single Sign-On tab they see "Single Sign-On is not yet configured. Please sign in with email and password." See section 15 for how to re-enable. Super Admins should sign in with email and password; MFA is required after login regardless.

### Setting up MFA — step by step

1. Sign in with your email and password.
2. You will be taken to the **Set Up Two-Factor Authentication** page automatically.
3. Click **Get Started**. The system will generate a QR code for your account.
4. Open your authenticator app on your phone.
   - In Google Authenticator: tap the **+** button, then **Scan a QR code**.
   - In Microsoft Authenticator: tap **Add account**, choose **Other account**, then scan.
   - In Authy: tap **Add Account**, then **Scan QR code**.
5. Point your phone camera at the QR code on screen. Your app will add the account automatically.
6. If you cannot scan the QR code, click the copy button next to the text code shown beneath the QR image and paste it manually into your authenticator app.
7. Once scanned, click **I've scanned the code**.
8. Your authenticator app will now show a 6-digit code that changes every 30 seconds. Type the current code into the box on screen.
9. Click **Verify & Enable**.

If the code is accepted, MFA is now active and you will be taken to the Super Admin dashboard.

### Signing in after MFA is set up

Each time you sign in, you will be asked for your password first, then redirected to a page asking for your 6-digit code. Open your authenticator app, find the Ambitious about Autism entry, and type in the code shown. Codes expire every 30 seconds, so enter the code promptly.

---

## 3. Dashboard Overview

The **Overview** page is the first thing you see after signing in. It gives you a quick snapshot of the whole platform.

### The three summary tiles

- **Organisations** — the total number of organisations currently registered on the platform (active and inactive).
- **Total Users** — the number of learner and admin accounts across all organisations (Super Admins are not included in this count).
- **Completed Lessons** — the cumulative number of individual lesson completions across all users and all organisations.

### The organisations table

Below the tiles is a summary table listing every organisation. For each one you can see:

- **Name** — clicking the name takes you directly to that organisation's management page.
- **Slug** — a short identifier used internally (shown in a fixed-width font).
- **Users** — how many user accounts belong to that organisation.
- **Lessons** — the total number of lessons completed by users in that organisation.
- **Status** — whether the organisation is currently **Active** (green) or **Inactive** (red).

Click **View all** in the top-right corner of the table to go to the full Organisations page.

---

## 4. Managing Organisations

Navigate to **Organisations** in the left-hand sidebar.

This page lists every organisation on the platform in a table. You can see each organisation's name, its internal slug, how many users it has, whether it is active, and when it was created.

### Creating a new organisation

1. Click **Create Organisation** in the top-right corner. A form appears below the header.
2. Fill in the **Name** field (e.g. "Sunrise Care Services"). The **Slug** field will fill in automatically based on the name — you can edit it if needed. The slug must use only lowercase letters, numbers, and hyphens.
3. Under **Allowed Roles**, tick the types of users this organisation will have. The available roles are:
   - **Practitioner** — accesses ASD awareness training and can log child observations
   - **Careers Professional** — accesses careers training only
   - **Student**, **Intern**, **Employee** — access both ASD and careers training
4. Under **Module Access**, use the **ASD Awareness Training** and **Careers CPD Training** toggles to control which training plans this organisation's users may access.
5. The **Active** checkbox is ticked by default. Leave it ticked to make the organisation live immediately.
6. The **Parent Organisation** checkbox is unticked by default. Tick it if this organisation will manage child organisations underneath it (e.g. a Multi-Academy Trust, CEC Careers Hub, or Local Authority that oversees multiple schools). See [Hierarchical Organisations](#hierarchical-organisations-parentchild) below for details.
7. Click **Create Organisation**.

### Hierarchical Organisations (Parent/Child)

Some organisations — such as Multi-Academy Trusts (MATs), CEC Careers Hubs, and Local Authorities — need to manage multiple schools or sub-organisations underneath them. The platform supports this with a parent/child hierarchy.

**Enabling a parent organisation:**

1. When creating a new organisation, tick the **Parent Organisation** checkbox in the create form.
2. For an existing organisation, go to its detail page and tick the **Parent Organisation** toggle in the edit section, then click **Save Changes**.

Once an organisation is marked as a parent, its Org Admin will see a **Schools** link in their admin sidebar. From there they can create and manage child schools.

**How settings inheritance works:**

Child organisations can inherit their parent's settings (allowed training programs and allowed roles). This is controlled by the **Inherit Settings** toggle on each child school:

- **Inherit Settings ON (default):** The child uses whatever training programs, roles, and feature flags the parent has. If you update the parent's settings, all inheriting children automatically pick up the changes.
- **Inherit Settings OFF:** The child has its own independent settings. The Org Admin can configure programs, roles, and feature flags separately for that school.

**What the parent org admin can do:**

- Create child schools with name, slug, type, contact details, and address
- Activate or deactivate child schools
- Create and manage users in each child school
- View reports, sessions, and announcements filtered by a specific child school (using the org selector dropdown on those pages)
- Reports default to aggregating across all children when no filter is selected

**What you see as a Super Admin:**

- Parent organisations display a purple **Parent** badge next to their name in the organisations table
- The organisation detail page shows a **Hierarchy** section listing any child organisations (with name, status, and links to each child)
- If an organisation has a parent, a link to the parent org is shown in the Hierarchy section
- The child org count is shown in the organisations table

**Important notes:**

- Only one level of hierarchy is supported (parent → children). Children cannot themselves be parents.
- Non-parent organisations see no hierarchy features at all — their admin panel works exactly as before.
- Deleting a parent organisation does not automatically delete its children. Reassign or delete child schools first.

### Activating and deactivating an organisation

In the organisations table, each organisation has an **Active / Inactive** badge in the Active column. Clicking that badge toggles the status immediately — no save button is needed. A green notification will confirm the change.

When an organisation is set to **Inactive**, its users cannot sign in. This is useful for temporarily suspending access without deleting the organisation.

### Editing an organisation

Click the **Manage** link (or the organisation name) to open its detail page. Here you can:

- Change the organisation's **Name** or **Slug**
- Update the **Allowed Roles** — tick or untick the roles available to users in this organisation
- Update **Module Access** — toggle **ASD Awareness Training** and **Careers CPD Training** on or off
- Toggle the **Active** status on or off

Click **Save Changes** when you are done.

### Viewing users in an organisation

The lower half of an organisation's detail page shows a table of all users belonging to that organisation. For each user you can see their name, email address, role, whether their account is active, how many training lessons they have completed, and when their account was created.

### Creating an Org Admin

An Org Admin is a user who manages a single organisation — they can add users, post announcements, and view reports for their own organisation only.

To create an Org Admin for an organisation:

1. Go to the organisation's detail page (click the organisation name or the Manage link).
2. In the **Users** section, click **Add Org Admin**.
3. Fill in the admin's **Name**, **Email**, and a **Temporary Password** (minimum 8 characters).
4. Click **Create Admin**.

The new admin will be prompted to set up MFA the first time they sign in, and they will also be prompted to change their temporary password.

### Deleting an organisation

At the bottom of an organisation's detail page there is a **Danger Zone** section. You can delete the organisation only if it has no users. If the organisation still has users, you will need to reassign or delete those users first. Deletion is permanent and cannot be undone.

---

## 5. Managing Cohorts (Charity-Run Workshops)

Navigate to **Cohorts** in the left-hand sidebar.

Cohorts are a lightweight way to group people who are **not part of any registered organisation** — for example, walk-in attendees at a community event, parents at a one-off awareness workshop, or members of the public attending an in-person training session run directly by the charity.

A cohort behaves like a small, charity-managed organisation. You can:

- Give cohort members platform accounts (with printable login cards)
- Assign them training programmes
- Share document collections with them
- Invite them to in-person workshops

Cohort members are completely separate from your registered organisations — they will not appear in the Organisations list, and their data does not mix with any organisation's reports.

### Creating a cohort

1. Click **Cohorts** in the sidebar.
2. Click **New Cohort** in the top-right corner.
3. Fill in:
   - **Name** — a clear, descriptive label (e.g. "Spring Community Workshop 2026", "Harpenden Library Drop-in — March")
   - **Description** (optional) — any context that will help you identify this cohort later
   - **Training Programs** — tick the programmes you want to make available to this cohort's members. Members will see one sidebar link per assigned programme when they sign in.
4. Click **Create Cohort**. You are taken straight to the cohort detail page.

### Adding members

Open any cohort from the Cohorts list to see its detail page. The detail page has four tabs: **Members**, **Training**, **Documents**, and **Workshops**.

#### Adding a single member

1. On the **Members** tab, click **Add Member**.
2. Enter the person's **Name** and **Email**.
3. Set a **Temporary Password** (minimum 8 characters) or click the dice icon to generate one automatically.
4. Click **Create**.

A **credential card modal** appears immediately with a printable card containing:

- A QR code that opens the platform login page with the email pre-filled
- The platform URL
- The user's email
- The temporary password

Click **Print** to print the card. Hand the printed card to the attendee at the event — they can scan the QR code with their phone camera to start signing in. They will be required to set a new password the first time they log in.

#### Bulk import from CSV

For larger cohorts, you can create many accounts at once from a CSV file.

1. On the **Members** tab, click **Bulk Import**.
2. Prepare a CSV file with two columns: `name` and `email`. The first row should be the column headers. For example:

   ```csv
   name,email
   Alex Smith,alex@example.com
   Jamie Brown,jamie@example.com
   Sam Taylor,sam@example.com
   ```

3. Paste the CSV content into the textarea (or upload the file).
4. Click **Import**.

The system will:

- Auto-generate a strong temporary password for each new account
- Skip any emails that already exist on the platform (these are listed back to you)
- Create the rest of the accounts with `mustChangePassword: true`

After the import completes, you can click **Download Credentials CSV** to export a file containing the name, email, and temporary password for every newly-created account. Use this to print credential cards in bulk, or to email each attendee their login details.

#### Removing a member

Click the bin icon next to any member to delete their account. Deletion is permanent.

### Assigning training programmes

On the **Training** tab you can see which programmes the cohort currently has access to. Click **Edit Programs** to tick or untick programmes. Changes take effect immediately — the next time members sign in, the sidebar will reflect the updated list.

### Sharing documents with a cohort

Cohorts work seamlessly with the **Document Library**. To share a collection with a cohort:

1. Navigate to **Document Library** in the sidebar.
2. Open the collection you want to share.
3. In the **Targeting** section, add the cohort to the list of organisations.
4. Save.

The cohort will appear in the existing organisation picker — you do not need to do anything special. Cohort members will then see the collection in their sidebar and at `/library`.

The **Documents** tab on the cohort detail page shows a read-only list of all collections currently visible to that cohort, so you can see at a glance what content has been shared.

### Creating a workshop for a cohort

In-person workshops use the **Workshops** feature with the **In Person** platform option.

1. Navigate to **Workshops** in the sidebar.
2. Click **Create Workshop**.
3. Fill in title, description, date/time, and duration as normal.
4. Set the **Platform** to **In Person**. (You can leave the meeting URL field blank — for in-person workshops you can use it to store a venue address or directions link.)
5. In the attendees section, choose **Specific organisations** and select the cohort. Cohorts appear in the same picker as your registered organisations.
6. Save.

The cohort's members will see the workshop on their dashboard and at `/sessions`. After the workshop, you can mark attendance and add notes the same way you would for any other workshop.

The **Workshops** tab on the cohort detail page shows all workshops where the cohort's members have been invited.

### Deactivating a cohort

When a cohort is finished (e.g. the workshop programme has ended), open it from the Cohorts list and click **Deactivate**. Deactivating sets the cohort and all of its member accounts to inactive — members will no longer be able to sign in, but their data is preserved in case you need it for reporting.

You can reactivate a deactivated cohort at any time.

### What cohorts do **not** do

- Cohorts do not have an Org Admin. They are managed entirely by you (the Charity Admin) from `/super-admin/cohorts`.
- Cohorts are not visible on the Organisations page and do not show up in organisation reports.
- Cohort members cannot belong to a registered organisation as well — each user belongs to exactly one cohort or one organisation.

---

## 6. Managing Training Content

Navigate to **Training Content** in the left-hand sidebar.

Training content uses a three-level hierarchy: **Training Program → Module → Lesson**. Learners see one sidebar link per Training Program assigned to their organisation.

### Training Programs

Training Programs are the top-level containers. Each program has a name (which appears as a link in the learner sidebar), a rich-text description, a status, and a version number.

**Creating a program**

Click **New Program** at the top of the Training Content page. A modal offers three creation modes:

- **Blank Program** — creates an empty program. You add modules and lessons manually.
- **Generate from Files** — upload one or more PDFs or Word documents. The AI reads them and drafts a full program structure (modules, lessons, and content) for you to review and edit. Useful for converting existing training materials into the platform format.
- **Import SCORM** — upload a SCORM zip package (max 200 MB). The platform extracts the package and creates a program with one module and one SCORM lesson automatically.

**Status lifecycle**

| Status | Meaning |
|---|---|
| Draft | Being built — not visible to learners |
| Under Review | Awaiting sign-off — not visible to learners |
| Approved | Live — visible to learners in assigned organisations |
| Archived | Retired — no longer accessible to learners |

Learners can only access programs in **Approved** status. A program must also be assigned to their organisation.

**Assigning a program to an organisation**

Go to the organisation's detail page (Organisations → click the org name) and find the **Training Programs** section. Select the programs to enable for that org and save. The program will appear in the sidebar for all users in that org the next time they load the page.

**Preview**

Click the **View** button on a program to open it as a learner would see it — in a new tab. This lets you check the experience without leaving the admin area.

### Modules

Modules sit inside a Training Program and group related lessons together.

**Adding a module**

1. Open a program from the Training Content page.
2. Click **Add Module**.
3. Enter a title and optional description (supports rich text).
4. Set the display order, or drag to reorder after creation.
5. Click **Create Module**.

### Lessons

Lessons sit inside a module and hold the actual content learners read, watch, or interact with.

**Adding a lesson**

Click **Add Lesson** inside a module. Enter a title and choose a type:

- **Text** — rich WYSIWYG editor with interactive blocks
- **Video** — embed a video URL (e.g. a YouTube or Vimeo embed link) plus optional transcript
- **SCORM** — upload a SCORM 1.2 or 2004 zip package directly to a lesson

**Editing a lesson — the Lesson Editor**

Click **Edit** on any lesson to open the full Lesson Editor. Changes are saved by clicking **Save Lesson** — there is no auto-save. After saving you are returned to the module page.

**Rich text editor (Text lessons)**

The editor works like a word processor. You can:

- Make text bold, italic, or underlined
- Add headings (H2, H3)
- Create numbered or bulleted lists
- Insert links
- Upload images directly from the toolbar (stored in Vercel Blob)
- Embed videos inline

**Interactive blocks (Text lessons)**

Below the main editor you can add interactive blocks. These appear inside the lesson after the main content:

- **Carousel** — a slide show. Add slides with text, images, or video. Each slide gets its own TTS audio button, generated automatically when you save the lesson.
- **Hotspot Image** — an image with clickable areas. Each hotspot shows a label or tooltip when tapped.
- **Video Block** — embeds a video within the lesson flow.
- **Rich Text Block** — an additional block of formatted text.

**PDF and file attachments**

Scroll to the **Attachments** section at the bottom of the Lesson Editor. Upload PDFs or other files — these are stored in Vercel Blob and shown to learners as a **Resources** section below the lesson content, with a download link for each file.

**Text-to-speech (TTS)**

When you save a Text lesson, the platform automatically generates an audio version of the lesson text using ElevenLabs (Lily voice, British female). Learners see a play button at the top of the lesson. Carousel slides each get their own per-slide audio button. Audio is cached so it does not need to be regenerated unless the content changes.

**Completion and certificates**

Progress is saved automatically when a learner reaches the end of a lesson and clicks Complete. Completing a lesson shows a **Certificate of Completion** screen with the Ambitious about Autism logo.

**SCORM lessons**

Upload a SCORM zip (max 200 MB) via the **Upload SCORM Package** button in the Lesson Editor. The platform:

- Supports SCORM 1.2 and SCORM 2004
- Extracts the package to Vercel Blob storage
- Detects a table of contents (TOC) if the package contains multiple SCOs — displayed as a left-rail navigation panel inside the lesson
- Tracks completion and score using the SCORM runtime (scorm-again)
- Resumes from where the learner left off

**AI quiz generation**

Each lesson can have a multiple-choice quiz. See [Section 7](#7-ai-quiz-generation) for full details.

---

## 7. AI Quiz Generation

Each lesson can have a quiz attached to it. Quizzes are shown to learners after they complete a lesson. Questions are multiple-choice with one correct answer and an explanation.

You can add questions manually, or use the built-in AI tool to generate them automatically from the lesson content.

### Generating a quiz with AI

Quiz generation is done from inside the **Lesson Editor** — not on the module page.

1. Open a lesson by clicking **Edit** on it from the module page.
2. Scroll down to the **Quiz Questions** section at the bottom of the Lesson Editor.
3. Click **Generate Quiz Questions** (the purple button with a sparkle icon).
4. A panel appears. Set the **Number of questions** — you can choose between 3 and 10.
5. Click **Generate**. The AI reads the lesson content currently in the editor and generates questions based on it. This usually takes a few seconds.
6. Once generation is complete, a preview of the questions appears. Each question shows:
   - The question text
   - The answer options (A, B, C, D), with the correct answer highlighted in green
   - An explanation of why that answer is correct
7. Review each question. If a question is not right, you can edit it directly in the preview.
8. When you are happy with the questions, click **Save Questions**. The generated questions are **appended** to any questions already on the lesson — they do not replace existing ones. If you want a clean slate, delete the existing questions first.

**Tip:** The AI generates questions from the content in the editor at the time you click Generate. For good results, make sure the lesson has at least 200 words of substantive content before generating. Very short lessons produce generic questions.

### Editing AI-generated questions before saving

In the AI preview panel, each question can be edited before you save. Expand a question, make your changes, then continue reviewing the rest before clicking Save Questions.

### Adding a question manually

1. In the **Quiz Questions** section of the Lesson Editor, click **Add Question**.
2. Fill in the **Question** text.
3. Fill in options **A**, **B**, **C**, and **D**.
4. Set the **Correct Answer** by selecting which option letter is correct.
5. Optionally add an **Explanation** — this is shown to learners after they answer.
6. Click **Add Question**.

### Editing an existing question

In the Quiz Questions list, click anywhere on a question row to expand it and see its options and explanation. Then click **Edit** to open an inline edit form. Make your changes and save.

### Deleting a question

Expand the question, then click **Delete**. You will be asked to confirm before the question is removed.

---

## 8. Announcements

Navigate to **Announcements** in the left-hand sidebar.

Announcements are messages that are broadcast to all users across every organisation on the platform. They are useful for notifying everyone about scheduled maintenance, new features, or important updates.

### Creating an announcement

1. Click **Create Announcement** in the top-right corner.
2. Fill in the **Title** — a short, clear summary (e.g. "Scheduled maintenance on Saturday").
3. Fill in the **Body** — the full text of your message.
4. Optionally set an **Organisation** — leave this blank to send a global announcement to all users on the platform, or select one or more specific organisations to target only their users.
5. Optionally set an **Expires at** date and time. After this date, the announcement will no longer be shown to users. If you leave this blank, the announcement will remain active until you manually deactivate or delete it.
6. The **Active** checkbox is ticked by default — this means the announcement will be visible to users immediately after saving. Untick it if you want to save it as a draft for now.
7. Click **Create Announcement**.

### Activating and deactivating an announcement

In the announcements table, each announcement has an **Active / Inactive** badge. Clicking it toggles the visibility immediately. Use this to temporarily hide an announcement without deleting it.

### Deleting an announcement

Click the red bin icon on the right of any announcement row. You will be asked to confirm before it is deleted. Deletion is permanent.

### Refreshing the list

Click the circular arrow icon in the top-right of the announcements table to reload the latest data.

---

## 9. Reports

Navigate to **Reports** in the left-hand sidebar.

The Reports page gives you a cross-organisation view of training progress. It shows how far learners in each organisation have got through each training module.

### Reading the reports table

The table has one row per organisation. The columns are:

- **Organisation** — the organisation name and its internal slug
- **Users** — total number of users in that organisation
- **Module columns** — one column per training module, showing the full module name (e.g. "Understanding ASD: An Introduction") with a subtitle indicating the training plan it belongs to (ASD Awareness Training or Careers CPD Training)

Each module cell shows a completion figure in the format **completed/total (%)**, for example `8/10 (80%)`. The colour of each cell indicates progress at a glance:

- **Green** — 80% or more of users have completed the module
- **Amber** — between 40% and 79% completion
- **Grey** — below 40% completion
- **Dash (—)** — no users in this organisation have access to that module, or the organisation has no users

Click the circular arrow icon to refresh the report data.

### Additional report sections

Below the training completion table, the Reports page includes several further sections:

- **Session Attendance** — counts of workshops held and attendance per organisation
- **Document Library** — download counts per document and per organisation, showing which resources are most used
- **Surveys** — response rates per survey, including how many targeted users have responded
- **SCORM Quiz Analytics** — per-question performance aggregated across all learners (anonymised — no per-learner data is shown). Questions are sorted worst-performing first so you can quickly see which material may need updating. Access this section at `/super-admin/reports/scorm-quizzes` (requires View Reports permission)
- **Integration API** — last-used timestamps and request counts for any active Integration API keys

### Virtual Classroom Sessions — super admin note

Sessions are managed at the organisation level by Org Admins and are scoped to their own organisation. As a Super Admin you do not create or manage sessions directly, but org-level session counts are visible in the platform's organisation reports. If session volume reporting is required, it will appear alongside the existing module completion data in future report updates.

Organisations that wish to auto-generate Zoom or Microsoft Teams meeting links for their sessions can configure their API credentials through the **Meeting Settings** page within their own admin panel. If an org admin asks you how to set this up, direct them to the Meeting Settings section of their admin panel — see the Org Admin Guide for full instructions. No platform-wide configuration is required from the Super Admin side.

---

## 10. Document Library

Navigate to **Document Library** in the left-hand sidebar.

The Document Library lets you organise and share files (PDFs, Word documents, images) with learners through targetable collections. Each collection appears as a sidebar link for the users it is shared with, and all collections are also accessible at `/library`.

### Creating a collection

1. Click **New Collection**.
2. Enter a **Title** and optional **Description**.
3. Under **Target Organisations**, select which organisations should see this collection. Leave blank to share with all organisations.
4. Under **Target Roles**, select which roles should see this collection. Leave blank to share with all roles.
5. Click **Create**.

### Uploading documents

Open a collection and click **Upload Document**. You can upload PDFs, Word documents, and images. Files are stored in Vercel Blob. Each document gets a title (editable after upload) and a download link.

### Thumbnails

Each collection can have a thumbnail image displayed in the library view.

- **AI-generated thumbnail** — click **Generate Thumbnail**. The AI creates an image based on the collection title and description. A preview is shown — click **Accept** to use it or **Regenerate** to try again.
- **Custom thumbnail** — upload your own JPG or PNG image (800×500 px recommended).

### Editing a collection

You can update a collection's title, description, and targeting at any time. Org Admins can also edit the title and description of collections that are visible to their organisation (from `/admin/library`), but they cannot change targeting.

### Tracking downloads

Downloads are tracked per user and per organisation. View download counts in **Reports → Document Library**. This shows which documents are most used and which organisations are actively engaging with the library.

---

## 11. Surveys

Navigate to **Surveys** in the left-hand sidebar.

Surveys let you collect structured feedback or assessments from learners across the platform.

### Creating a survey

1. Click **New Survey**.
2. Enter a title and description.
3. Add questions. Supported question types:
   - **Multiple Choice** — one answer from a list of options
   - **Yes / No** — a simple binary question
   - **Free Text** — an open-ended written response
   - **Rating Scale** — a numeric scale (e.g. 1–5 or 1–10)
   - **Multi-Select** — multiple answers allowed from a list of options
4. Under **Target Audience**, select the organisations and/or roles you want to reach. Leave blank to target everyone.
5. Save as **Draft** when you are still building the survey.

### Publishing and closing a survey

- **Draft → Published** — click **Publish**. The survey immediately appears on the dashboard of all targeted users who have not yet responded. Users respond at `/surveys/[id]`.
- **Published → Closed** — click **Close**. No further responses are accepted. Existing responses are preserved.

### Viewing results

Go to the survey's detail page and click **View Results** (or navigate to `/super-admin/surveys/[id]/results`). You can see response counts per question and export raw data as CSV.

### AI insights

After a survey is closed, click **Generate Insights** to ask the AI to analyse the responses. Three insight types are available:

- **Summary** — an overall summary of what respondents said
- **Comparative** — how different groups (by org or role) answered differently
- **Recommendations** — suggested actions based on the feedback

Insights are saved to the survey and can be re-generated at any time.

---

## 12. AI Prompts

Navigate to **AI Prompts** in the left-hand sidebar (requires the **Manage AI Prompts** permission).

All AI features on the platform — quiz generation, survey insights, and document thumbnails — are powered by prompt rows stored in the database. This page lets you view and edit those prompts.

### How prompts work

Each prompt has:

- **Key** — a unique identifier used in code (e.g. `quiz-generation`, `cv-personal-statement`). Do not change the key without a corresponding code update — the system looks up prompts by key at runtime.
- **Name and Purpose** — a human-readable label and description of what this prompt does.
- **Model** — the AI model to use for this prompt. Options include `google/gemini-2.5-flash` (default, fast), `google/gemini-2.5-pro` (slower, more capable), `anthropic/claude-sonnet-4`, `anthropic/claude-haiku-4`, `openai/gpt-4o-mini`, and `openai/gpt-4.1`. Models route through the Vercel AI Gateway.
- **Requirements** — rules the AI must follow when responding (e.g. "always use UK English", "never suggest a diagnosis").
- **Response Format** — the expected shape of the AI's output (e.g. a JSON structure, a numbered list).
- **Context Files** — PDFs or Word documents uploaded to Vercel Blob that are prepended to the prompt at runtime. Use these to give the AI additional background knowledge (e.g. a clinical reference document, a style guide).

### Platform-wide AI guidelines

All pre-configured prompts instruct the AI to:

- Never diagnose or suggest that someone has autism
- Use UK English spelling and grammar
- Frame responses in a strengths-focused, positive way

Do not remove these instructions when editing prompts.

### Testing a prompt

Click the **Test** button on any prompt to send a sample request and see the AI's output before saving changes. This is a safe way to check the effect of edits without affecting live users. Error messages are sanitised — raw API error details are not shown.

---

## 13. Job Openings

Navigate to **Job Openings** in the left-hand sidebar (requires the **Manage Jobs** permission).

The Jobs feature lets the charity publish job listings to targeted learners — students, interns, employees, and career development officers.

### Creating a job listing

1. Click **New Job**.
2. Fill in:
   - **Employer name** and optional **employer logo** (uploaded via the logo button after initial save)
   - **Job title**
   - **Description** — full job details
   - **Location type** — On-site, Hybrid, or Remote
   - **Employment type** — Internship, Apprenticeship, Part-time, Full-time, or Volunteer
   - **Closing date** — the listing auto-closes after this date and is no longer shown to learners
   - **Autism-friendly notes** — any workplace adjustments or autism-friendly practices the employer offers (shown prominently to learners)
   - **Target organisations** — leave blank to show to all orgs, or select specific ones
   - **Target roles** — leave blank to show to all eligible roles, or select specific ones
3. Save as **Draft**. The listing is not visible to learners until Published.

### Status lifecycle

| Status | Meaning |
|---|---|
| Draft | Being prepared — not visible to learners |
| Published | Live — visible to targeted learners at `/jobs` |
| Closed | No longer accepting interest — can be re-opened |
| Archived | Retired — hidden from all views |

### Attaching documents

Open a job listing and click **Add Attachment** to upload supporting documents (e.g. a job description PDF, an application form). These appear as downloads on the job detail page at `/jobs/[jobId]`.

### Job Assignments (CDO-to-student targeting)

Career Development Officers (CDOs) can assign specific published jobs to individual students in their organisation. This creates a personalised jobs feed for that student. Assignments are managed by CDOs from their own panel — you do not need to manage these as a Super Admin.

---

## 14. Charity Employee Accounts

The **Charity Employee** role is a delegated access level sitting between Super Admin (full access) and no admin access at all. It allows you to grant trusted staff members access to specific areas of the super admin panel without giving them full platform control.

### Creating a Charity Employee account

Create the user as normal (via an organisation's user list or via Cohorts) and set their role to **Charity Employee**. Charity Employees are typically placed in a dedicated internal organisation or cohort.

### Granting permissions

Once the user account exists, open the user's profile in the super admin panel and find the **Permissions** section. Tick the permissions you want to grant. Available permissions:

| Permission | What it unlocks |
|---|---|
| Manage Organisations | Create and edit organisations, manage org users |
| Manage Cohorts | Create and manage cohorts and their members |
| Manage Training | Create and edit training programs, modules, and lessons |
| Manage Surveys | Create, publish, and view survey results |
| Manage Announcements | Post and manage platform announcements |
| View Reports | Access the Reports page and all report sections |
| Manage Sessions | Create and manage charity-level workshops |
| Manage Library | Create and manage document library collections |
| Manage AI Prompts | View and edit AI prompt configurations |
| Manage Jobs | Create and manage job listings |

Save after ticking the permissions you want.

### How the sidebar adapts

The super admin sidebar dynamically shows or hides nav items based on the Charity Employee's permissions. A user with only **View Reports** will see just the Reports link; a user with **Manage Training** and **Manage Surveys** will see those two sections and nothing else.

### Super Admins always have all permissions

Super Admins (Charity Admins) have implicit access to every feature regardless of the permissions list — the permissions system applies only to Charity Employee accounts.

---

## 15. Single Sign-On (SSO) Setup

SSO lets users across all organisations sign in with their existing Google or Microsoft account instead of a platform-specific password. The setup is a two-part process:

1. **Configure the OAuth provider** in Google Cloud Console / Azure Portal and add the credentials to Vercel env vars (one-off, technical).
2. **Turn the toggle on** in `/super-admin/settings/sso` (any-time, no redeploy).

Both providers default to **off**. The toggle UI locks the switch off and shows an amber "credentials missing" warning if the env vars aren't set, so you can't accidentally enable a button that would fail on click.

### Toggling OAuth providers on or off

1. Sign in as a Charity Admin and go to **Settings → SSO**.
2. Scroll to the **OAuth Sign-in Providers** card below the SAML configuration.
3. Use the switches to enable Google and/or Microsoft. Save is automatic.
4. Refresh `/login` to see the buttons appear inline above the password form. To turn them off again, flip the same switches back.

### Google OAuth setup (one-off)

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and open your project.
2. Navigate to **APIs & Services > Credentials** and create an OAuth 2.0 Client ID (Web application).
3. Add the following as an **Authorised redirect URI**:
   ```
   https://asd-training-app-v2.vercel.app/api/auth/callback/google
   ```
4. Copy the **Client ID** and **Client Secret** into the Vercel environment variables `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
5. Redeploy (or wait for the next push) so the new env vars are loaded.
6. Once deployed, the Google toggle in **Settings → SSO** becomes available.

### Microsoft (Azure AD) OAuth setup (one-off)

1. Go to the [Azure Portal](https://portal.azure.com/) and open **App registrations**.
2. Register a new application (or use an existing one).
3. Under **Authentication > Web**, add the following as a **Redirect URI**:
   ```
   https://asd-training-app-v2.vercel.app/api/auth/callback/azure-ad
   ```
4. Copy the **Application (client) ID** and **Client Secret** into the Vercel environment variables `AZURE_AD_CLIENT_ID` and `AZURE_AD_CLIENT_SECRET`.
5. Set `AZURE_AD_TENANT_ID` to `common` (to allow both personal and work/school Microsoft accounts) or to your specific tenant ID.
6. In the app's **Manifest editor**, ensure `signInAudience: "AzureADandPersonalMicrosoftAccount"` so both personal and work/school accounts are supported.
7. Redeploy. The Microsoft toggle in **Settings → SSO** becomes available.

### What happens for new vs existing users

- **Existing user, OAuth toggle ON**: clicks Google / Microsoft → lands on `/` signed in. The platform links the OAuth account to their existing record on first sign-in.
- **New user with no platform account, OAuth toggle ON**: clicks Google / Microsoft → lands on a one-question self-registration page (`/register/sso-complete`) where they pick a role (autistic / parent or carer / supporter / professional) and finish sign-up automatically under the public user pool. No pre-creation needed — the OAuth provider has verified their email, so they're trusted to register themselves.
- **Toggle OFF**: the button doesn't appear; direct hits on `/api/auth/signin/google` are rejected by the sign-in callback.

### Charity SAML SSO vs OAuth

Charity SAML SSO is a separate feature in the same settings page — for situations where the charity uses an enterprise identity provider (Okta, Azure AD as SAML, Google Workspace as SAML) for its own staff. Configure it in the **SAML Configuration** card above the OAuth toggles. SAML users still need to be pre-created in the platform unless `autoProvision` is set on the per-org SAML config; OAuth is the only path that allows full self-registration.

---

## 16. Security and MFA

### MFA is mandatory for admin accounts

Both Super Admins and Org Admins are required to set up two-factor authentication (TOTP) before they can access any admin pages. This is enforced automatically — anyone who signs in with an admin account and has not set up MFA will be redirected to the setup page and cannot proceed until they complete it.

### How the sign-in flow works with MFA

1. Enter your email and password on the login page.
2. If your credentials are correct, the system checks whether MFA has been verified for this session.
3. If MFA is enabled but not yet verified, you are redirected to a verification page.
4. Enter the 6-digit code from your authenticator app.
5. Once the code is accepted, you are taken to the Super Admin dashboard.

### If you lose access to your authenticator app

If you lose your phone or delete your authenticator app and cannot generate a code, you will not be able to sign in. In this situation, contact whoever manages the platform's database or deployment environment — an administrator with database access will need to reset the `totpEnabled` and `totpSecret` fields on your user account so that you can go through MFA setup again.

### Keeping your account secure

- Use a strong, unique password for your Super Admin account.
- Do not share your authenticator app codes with anyone.
- If you suspect your account has been compromised, change your password immediately and re-enrol your MFA.
- Users with a `mustChangePassword` flag on their account are forced to set a new password before they can access anything else — this is applied automatically to new Org Admins created through the platform.
- Inactive user accounts cannot sign in, even if they have valid credentials. If an organisation is deactivated, all of its users are blocked from signing in as well.

---

### Dark mode

The platform fully supports dark mode. All interface elements — including role badges, status indicators, and form controls — are designed to remain clearly readable in both light and dark themes. Dark mode follows the user's system preference automatically.

---

*This guide covers the Super Admin features of the Ambitious about Autism training platform. For questions about the platform or to report an issue, contact the platform development team.*
