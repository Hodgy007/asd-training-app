# Super Admin User Guide

**Ambitious about Autism — Training Platform**

---

## Table of Contents

1. [Welcome](#1-welcome)
2. [First Login and MFA Setup](#2-first-login-and-mfa-setup)
3. [Dashboard Overview](#3-dashboard-overview)
4. [Managing Organisations](#4-managing-organisations)
5. [Managing Training Content](#5-managing-training-content)
6. [AI Quiz Generation](#6-ai-quiz-generation)
7. [Announcements](#7-announcements)
8. [Reports](#8-reports)
9. [Single Sign-On (SSO) Setup](#9-single-sign-on-sso-setup)
10. [Security and MFA](#10-security-and-mfa)

---

## 1. Welcome

As a Super Admin, you are responsible for the entire Ambitious about Autism training platform. You have access to tools and settings that no other user role can see.

Your responsibilities include:

- Creating and managing organisations (care providers, schools, employers, etc.) on the platform
- Deciding which training modules each organisation can access
- Building and maintaining all training content — modules, lessons, and quizzes
- Publishing platform-wide announcements to all users
- Viewing training progress reports across all organisations

Super Admins access a separate area of the platform at `/super-admin`. You will not see the regular learner dashboard — your navigation shows five sections: **Overview**, **Organisations**, **Training Content**, **Announcements**, and **Reports**.

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

The login page has a toggle at the top to switch between **Email & Password** and **Single Sign-On** (Google / Microsoft). Super Admins typically sign in with email and password, since MFA is required after login regardless.

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
   - **Caregiver** — accesses ASD awareness training and can log child observations
   - **Careers Professional** — accesses careers training only
   - **Student**, **Intern**, **Employee** — access both ASD and careers training
4. Under **Module Access**, use the **ASD Awareness Training** and **Careers CPD Training** toggles to control which training plans this organisation's users may access.
5. The **Active** checkbox is ticked by default. Leave it ticked to make the organisation live immediately.
6. Click **Create Organisation**.

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

## 5. Managing Training Content

Navigate to **Training Content** in the left-hand sidebar.

Training content is organised into **Modules**, and each module contains **Lessons**. There are two types of training:

- **ASD Training** — for Caregivers, Students, Interns, and Employees learning about autism
- **Careers Training** — for Careers Professionals and others focused on career development

### Browsing modules

The Training Content page shows two sections — ASD Training Modules and Careers Training Modules. Each module card shows:

- The module title and a short description
- Whether it is **Active** (green) or **Inactive** (red)
- How many lessons it contains

### Previewing training content

Each module card has a **View** button. Clicking it opens the training content as a learner would see it — `/training` for ASD modules or `/careers` for Careers modules — in a new browser tab. This lets you preview exactly what learners experience without leaving the admin area.

### Reordering modules

Each module card has up and down arrow buttons on the left side. Click these to move a module higher or lower in the list. The order here is the order learners will see.

### Activating and deactivating a module

Deactivating a module is done from inside the module editor (click **Edit** on the module card). There is no toggle on the module list itself. Inside the editor, you can deactivate or delete the module. Inactive modules are hidden from learners.

### Creating a new module

1. Click **Add Module** next to the relevant section (ASD or Careers).
2. Fill in the **Module ID** — this is a short internal identifier (e.g. `module-6`). It must be unique.
3. Fill in the **Title** (e.g. "Module 6: Transitions").
4. Add an optional **Description** explaining what the module covers.
5. Click **Create Module**.

### Editing a module

Click **Edit** on any module card. This opens the module editor, where you can:

- Change the module's **Title** and **Description**
- Click **Save** to apply those changes

The module editor also shows all the lessons within that module.

### Adding a lesson to a module

On the module editor page:

1. Click **Add Lesson**.
2. Enter a **Lesson ID** — a short unique identifier (e.g. `lesson-6-1`).
3. Enter the **Title** of the lesson.
4. Choose a **Type**:
   - **Text** — the lesson will display formatted text content
   - **Video** — the lesson will embed a video (you will provide a URL)
5. Optionally add some initial **Content** — you can add and edit this properly in the full lesson editor later.
6. Click **Create Lesson**.

### Reordering lessons

Just like modules, each lesson has up and down arrows to change its position within the module.

### Editing a lesson

Click **Edit** on any lesson row. This opens the **Lesson Editor**, where you can:

- Update the lesson **Title**
- Switch the lesson **Type** between Text and Video
- For Video lessons: paste in a **Video URL** (e.g. a YouTube embed link)
- Write or edit the lesson **Content** using the rich text editor (see below)
- Click **Save Lesson** when finished — after saving, you are automatically returned to the module page

### Using the rich text editor

The content editor works similarly to a word processor. You can:

- Make text **bold**, *italic*, or underlined using the toolbar buttons
- Add headings (Heading 2 or Heading 3)
- Create numbered or bulleted lists
- Insert links
- Click the eraser icon to remove formatting

There is no auto-save — always click **Save Lesson** when you have finished making changes.

### Activating and deactivating a lesson

To deactivate or delete a lesson, click **Edit** on the lesson to open the lesson editor. Inside the editor you can deactivate or delete the lesson. Inactive lessons are hidden from learners.

---

## 6. AI Quiz Generation

Each lesson can have a quiz attached to it. Quizzes are shown to learners after they complete a lesson. Questions are multiple-choice with one correct answer and an explanation.

You can add questions manually, or use the built-in AI tool to generate them automatically from the lesson content.

### Generating a quiz with AI

1. Open a lesson by clicking **Edit** on it from the module editor.
2. Scroll down to the **Quiz Questions** section at the bottom of the page.
3. Click **Generate Quiz with AI** (the purple button with a sparkle icon).
4. A panel appears. Set the **Number of questions** — you can choose between 3 and 10.
5. Click **Generate**. The AI will read the content currently in the editor above and generate questions based on it. This usually takes a few seconds.
6. Once generation is complete, a preview of the questions appears. Each question shows:
   - The question text
   - The answer options (A, B, C, D), with the correct answer highlighted in green
   - An explanation of why that answer is correct
7. Review each question. If a question is not right, you can edit it directly in the preview (see below).
8. When you are happy with the questions, click **Save Quiz**. If the lesson already has questions, you will be asked to confirm — saving the AI-generated questions will replace the existing ones.

**Note:** The AI generates questions from the content currently in the editor — not the last-saved version. If the lesson content is thin or very short, the questions may be generic. Make sure you have written substantial content in the editor before generating the quiz.

### Editing AI-generated questions before saving

In the AI preview panel, each question can be edited before you save. Expand a question, make your changes, then continue reviewing the rest before clicking Save Quiz.

### Adding a question manually

1. In the **Quiz Questions** section, click **Add Manually**.
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

## 7. Announcements

Navigate to **Announcements** in the left-hand sidebar.

Announcements are messages that are broadcast to all users across every organisation on the platform. They are useful for notifying everyone about scheduled maintenance, new features, or important updates.

### Creating an announcement

1. Click **Create Announcement** in the top-right corner.
2. Fill in the **Title** — a short, clear summary (e.g. "Scheduled maintenance on Saturday").
3. Fill in the **Body** — the full text of your message.
4. Optionally set an **Expires at** date and time. After this date, the announcement will no longer be shown to users. If you leave this blank, the announcement will remain active until you manually deactivate or delete it.
5. The **Active** checkbox is ticked by default — this means the announcement will be visible to users immediately after saving. Untick it if you want to save it as a draft for now.
6. Click **Create Announcement**.

### Activating and deactivating an announcement

In the announcements table, each announcement has an **Active / Inactive** badge. Clicking it toggles the visibility immediately. Use this to temporarily hide an announcement without deleting it.

### Deleting an announcement

Click the red bin icon on the right of any announcement row. You will be asked to confirm before it is deleted. Deletion is permanent.

### Refreshing the list

Click the circular arrow icon in the top-right of the announcements table to reload the latest data.

---

## 8. Reports

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

---

## 9. Single Sign-On (SSO) Setup

SSO allows users across all organisations to sign in with their existing Google or Microsoft account instead of a platform-specific password. SSO is a one-time setup performed by the super admin or app owner — once configured, all organisations benefit automatically.

### Google SSO

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and open your project.
2. Navigate to **APIs & Services > Credentials** and create an OAuth 2.0 Client ID (Web application).
3. Add the following as an **Authorised redirect URI**:
   ```
   https://asd-training-app-v2.vercel.app/api/auth/callback/google
   ```
4. Copy the **Client ID** and **Client Secret** into the Vercel environment variables `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### Microsoft (Azure AD) SSO

1. Go to the [Azure Portal](https://portal.azure.com/) and open **App registrations**.
2. Register a new application (or use an existing one).
3. Under **Authentication > Web**, add the following as a **Redirect URI**:
   ```
   https://asd-training-app-v2.vercel.app/api/auth/callback/azure-ad
   ```
4. Copy the **Application (client) ID** and **Client Secret** into the Vercel environment variables `AZURE_AD_CLIENT_ID` and `AZURE_AD_CLIENT_SECRET`.
5. Set `AZURE_AD_TENANT_ID` to `common` (to allow both personal and work/school Microsoft accounts) or to your specific tenant ID.

Once these environment variables are deployed, the login page will show Google and Microsoft options under the **Single Sign-On** tab. Users must still be pre-created by an admin before they can sign in via SSO — the platform does not allow self-registration through SSO.

---

## 10. Security and MFA

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
