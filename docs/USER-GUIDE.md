# Ambitious about Autism -- User Guide

This guide covers everything you need to know to use the Ambitious about Autism training platform. It is written for all users: caregivers, careers professionals, organisation administrators, and super administrators.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Roles and Permissions](#3-roles-and-permissions)
4. [For Caregivers](#4-for-caregivers)
5. [For Careers Professionals](#5-for-careers-professionals)
6. [For Organisation Admins](#6-for-organisation-admins)
7. [For Super Admins](#7-for-super-admins)
8. [Security](#8-security)
9. [FAQ and Troubleshooting](#9-faq-and-troubleshooting)

---

## 1. Introduction

Ambitious about Autism is a web-based training and observation platform designed for two main audiences:

- **Caregivers** (parents, guardians, and early years practitioners) who want to learn about Autism Spectrum Disorder (ASD) and record developmental observations for children in their care.
- **Careers professionals** (careers leaders, SENCOs, and SEND professionals) who support autistic young people and need continuing professional development (CPD) training.

The platform provides structured training modules, progress tracking, child observation logging, AI-generated insight reports, and organisational management tools.

> **Important disclaimer:** This platform is not a diagnostic tool. It supports observation, pattern recognition, and professional development only. Observations and AI insights generated within this platform should never be treated as a medical diagnosis. Always consult a qualified healthcare professional (such as your GP or health visitor) with any concerns about a child's development.

---

## 2. Getting Started

### Creating an Account

1. Visit the platform and click **"Create one here"** on the login page.
2. Select your role:
   - **Parent / Caregiver** -- choose this if you care for a child and want to log observations and access ASD awareness training.
   - **Careers Professional** -- choose this if you are a careers leader, SENCO, or SEND professional working with autistic young people.
3. Fill in your details:
   - Full name
   - Email address
   - Password (minimum 8 characters; the form shows a strength indicator)
   - Confirm your password
4. Read and agree to the **Privacy Policy** by ticking the consent checkbox.
5. Click **"Create account"**.
6. You will be redirected to the login page. Sign in with your new credentials.

**Note:** Some users may be created by an organisation administrator rather than self-registering. In that case, you will receive your login details from your admin and may be asked to change your password on first login.

### Logging In

You can sign in using any of the following methods:

- **Email and password** -- enter the email and password you registered with.
- **Google SSO** -- click the "Google" button to sign in with your Google account.
- **Microsoft SSO** -- click the "Microsoft" button to sign in with your Microsoft (work, school, or personal) account.

If you sign in with Google or Microsoft for the first time, an account will be created automatically with the Caregiver role.

There is also a **"Forgot password?"** link on the login page if you need to reset your password.

### Two-Factor Authentication (Admin Accounts)

If you have a Super Admin or Organisation Admin account, you will be required to set up two-factor authentication (2FA) before you can access the platform. This happens automatically the first time you log in.

See the [Security](#8-security) section below for full details on the setup process.

---

## 3. Roles and Permissions

The platform has several roles, each with different levels of access:

| Role | Description | What You Can Access |
|------|-------------|---------------------|
| **Super Admin** | Platform-wide administrator for the charity | Overview dashboard, all organisations, training content management, global announcements, platform reports |
| **Org Admin** | Administrator for a single organisation | User management within their org, organisation announcements, organisation reports |
| **Caregiver** | Parent, guardian, or early years practitioner | Dashboard, ASD training modules, child observations, AI insights, observation reports, account settings |
| **Careers Professional** | Careers leader, SENCO, or SEND professional | Dashboard, careers CPD training modules, account settings |
| **Student** | Learner within an organisation | Dashboard, ASD training, careers training (based on organisation settings), account settings |
| **Intern** | Intern within an organisation | Dashboard, ASD training, careers training (based on organisation settings), account settings |
| **Employee** | Employee within an organisation | Dashboard, ASD training, careers training (based on organisation settings), account settings |

Key points:
- **Caregivers** are the only role that can add children and log observations.
- **Careers Professionals** only see careers training (not ASD modules or child observations).
- **Students, Interns, and Employees** can access both ASD and careers training, depending on what their organisation has enabled.
- **Super Admins and Org Admins** do not access training content directly -- they manage the platform and users instead.
- Admin roles (Super Admin and Org Admin) are required to use two-factor authentication.

---

## 4. For Caregivers

As a Caregiver, your sidebar navigation includes: **Dashboard**, **ASD Training**, **Child Observations**, **Reports**, and **Settings**.

### Training Modules

The ASD Training hub contains structured modules designed to help you become a confident ASD observation practitioner. Topics typically cover areas such as understanding ASD, communication, social skills, sensory processing, and supporting strategies.

How training works:
- Modules must be completed **in order** -- the next module unlocks only after you finish the previous one.
- Each module contains multiple **lessons** (text-based or video-based content).
- At the end of each lesson, there may be a **quiz** to test your understanding.
- Your overall progress (lessons completed out of total) is displayed at the top of the training page.
- You can revisit completed modules at any time.

> **Note:** Completing this training does not qualify you to diagnose ASD. It helps you recognise and document developmental patterns. Always refer concerns to a qualified healthcare professional.

### Child Observations

The Child Observations section is where you manage profiles for children in your care and record behavioural observations over time.

**Adding a child:**
1. Go to **Child Observations** in the sidebar.
2. Click **"Add child"**.
3. Enter the child's name and date of birth.
4. Optionally add any notes.
5. Save the profile.

**Recording an observation:**
1. Click on a child's card to open their profile.
2. Click **"Add observation"**.
3. Fill in the observation details:
   - **Date** -- when the behaviour was observed.
   - **Behaviour type** -- what you observed (chosen from a list).
   - **Domain** -- the developmental area: Social Communication, Behaviour and Play, or Sensory Responses.
   - **Frequency** -- how often this behaviour occurs: Rare, Sometimes, or Often.
   - **Context** -- where it was observed: Home, Nursery, Outdoors, or Other.
   - **Notes** -- any additional details in your own words.
4. Save the observation.

The child's profile page has four tabs:
- **Overview** -- a summary of the child's details and recent observations.
- **Tracker** -- a table of all recorded observations, which you can review and manage.
- **Charts** -- visual graphs showing observation patterns by domain, frequency, and time period.
- **Insights** -- AI-generated analysis (see below).

### AI Insights

The platform uses AI (Google Gemini) to analyse the observations you have recorded for a child and generate a structured report. This report includes:

- A **summary** of observed patterns.
- **Pattern analysis** across developmental domains.
- **Recommendations** for next steps.
- A **disclaimer** reminding you this is not a diagnosis.

To generate an AI insight:
1. Open a child's profile.
2. Go to the **Insights** tab.
3. Click the generate report button.
4. Wait a moment while the AI processes your observations.
5. Review the generated report.

Important points about AI insights:
- The AI never diagnoses or suggests autism. It identifies patterns and offers general guidance.
- Reports are saved and can be viewed again later.
- The quality of insights depends on the number and detail of observations you have recorded -- more observations lead to better analysis.
- Observation data is sent to Google Gemini for processing. No data is retained by Google after processing.

> **Disclaimer:** AI-generated insights are not a substitute for professional medical advice. They are a tool to help you organise your observations. Always share concerns with your GP, health visitor, or another qualified healthcare professional.

### Reports

The Reports page lets you generate printable observation summaries, useful for taking to healthcare appointments.

- Filter reports by **child** and **date range** (e.g. last 7, 14, or 28 days).
- View charts showing observation distribution by domain.
- Click **"Print report"** to open the browser print dialog and save as PDF or print a hard copy.

---

## 5. For Careers Professionals

As a Careers Professional, your sidebar navigation includes: **Dashboard**, **Careers Training**, and **Settings**.

### Careers CPD Training Modules

The Careers Training hub provides professional development modules designed under the Gatsby Benchmarks framework, supporting SEND-inclusive careers education practice.

How training works:
- Modules must be completed **in order** -- the next module unlocks only after the previous one is finished.
- Each module contains multiple lessons with text or video content.
- Lessons may include quizzes to check your understanding.
- Your overall progress is displayed at the top of the page.
- You can review completed modules at any time.

> **Note:** Completion of all modules provides a structured evidence base for SEND-inclusive careers education practice. It does not constitute a formal qualification.

### Progress Tracking

Your progress is tracked automatically:
- Each lesson you complete is recorded.
- The progress bar at the top of the training page shows your overall completion percentage.
- Within each module card, you can see how many lessons you have finished and what remains.

---

## 6. For Organisation Admins

As an Organisation Admin, your sidebar navigation includes: **Users**, **Announcements**, and **Reports**.

You manage users and content within your specific organisation. You do not have access to training modules directly or to other organisations' data.

### Managing Users

The Users page is your main tool for managing people in your organisation.

**Viewing users:**
- See a table of all users in your organisation with their name, email, role, status, join date, and activity summary.
- Use the **search bar** to find users by name or email.
- Use the **role filter** dropdown to show only users of a specific role.
- Role summary cards at the top show how many users you have in each role.

**Creating a new user:**
1. Click **"Create User"**.
2. Fill in the user's details:
   - Full name and email address.
   - Select their role from the roles your organisation allows.
   - Either set a **temporary password** (the user will be prompted to change it on first login) or toggle **"SSO only"** if the user will sign in via Google or Microsoft.
   - Optionally adjust which training modules the user can access.
3. Click **"Create User"** to save.

**Changing a user's role:**
- In the users table, click the role dropdown next to any user (except yourself) and select the new role.

**Activating or deactivating a user:**
- Click the Active/Inactive badge next to a user to toggle their status.
- Deactivated users cannot sign in.

**Deleting a user:**
- Click the delete icon next to a user.
- Confirm the deletion. This permanently removes the user and all their data.
- You cannot delete your own account from this panel.

### Announcements

Create announcements that are shown to users in your organisation.

**Creating an announcement:**
1. Go to **Announcements** in the sidebar.
2. Click **"Create Announcement"**.
3. Enter a title and body text.
4. Optionally set an expiry date.
5. Choose whether it should be active immediately.
6. Save the announcement.

**Managing announcements:**
- Toggle announcements on or off by clicking their Active/Inactive status.
- Delete announcements you no longer need.

### Reports

The Organisation Reports page shows training progress data for users in your organisation, helping you understand how training adoption is going across your team.

---

## 7. For Super Admins

As a Super Admin, your sidebar navigation includes: **Overview**, **Organisations**, **Training Content**, **Announcements**, and **Reports**.

You have full platform-wide access and are responsible for managing organisations, training content, and global settings.

### Overview Dashboard

The overview page shows platform-wide statistics at a glance:
- Total number of **organisations**.
- Total number of **users** (excluding super admins).
- Total number of **completed lessons** across the platform.
- A summary table of all organisations with their user counts, lesson completions, and active/inactive status.

### Managing Organisations

The Organisations page lets you create and manage all organisations on the platform.

**Creating an organisation:**
1. Click **"Create Organisation"**.
2. Fill in the details:
   - **Name** -- the organisation's display name.
   - **Slug** -- a URL-friendly identifier (auto-generated from the name, but editable).
   - **Allowed Roles** -- which user roles this organisation supports (e.g. Caregiver, Careers Professional, Student, Intern, Employee).
   - **Allowed Modules** -- which ASD and/or careers training modules users in this organisation can access.
   - **Active** -- whether the organisation is immediately active.
3. Click **"Create Organisation"**.

**Managing an existing organisation:**
- Click an organisation's name to open its detail page, where you can edit its settings and manage its users.
- Toggle an organisation's Active/Inactive status directly from the table. Deactivating an organisation does not delete it or its users, but may restrict access.

### Managing Training Content

The Training Content page lets you create, edit, and organise training modules and lessons for both ASD and careers training areas.

**Modules:**
- Modules are listed in two sections: **ASD Training Modules** and **Careers Training Modules**.
- Each module shows its title, active/inactive status, and lesson count.
- Use the **up/down arrows** to reorder modules.
- Click **Activate/Deactivate** to toggle a module's visibility.
- Click **"Edit"** to open the module editor.

**Creating a new module:**
1. Click **"Add Module"** in the appropriate section (ASD or Careers).
2. Enter a module ID (e.g. `module-6`), title, and description.
3. Click **"Create Module"**.

**Editing a module:**
- From the module editor, you can change the title and description.
- You can add, reorder, activate/deactivate, and delete lessons within the module.

**Editing a lesson:**
- Click on a lesson to open the lesson editor.
- The lesson editor includes:
  - A **title** field.
  - A **type** selector (Text or Video).
  - A **rich text editor** (WYSIWYG) for writing lesson content with formatting (bold, italic, headings, lists, links).
  - A **video URL** field (shown when type is Video).
  - A **Save Lesson** button.

**Quiz management:**
- Below the lesson editor, the quiz section lets you manage quiz questions for each lesson.
- You can **add questions manually** by filling in the question, answer options, correct answer, and explanation.
- You can **delete questions** you no longer need.
- You can also **generate quiz questions using AI**:
  1. Click the AI generate button in the quiz section.
  2. Choose how many questions to generate (default is 5).
  3. The AI reads the lesson content and generates multiple-choice questions.
  4. Review the generated questions in a preview panel.
  5. Accept the ones you want to keep -- they will be saved to the lesson.

### Global Announcements

The Announcements page lets you create platform-wide announcements visible to all users.

- Create announcements with a title, body, optional expiry date, and active/inactive status.
- Toggle announcements on or off.
- Delete announcements you no longer need.

### Platform Reports

The Reports page shows a training completion matrix across all organisations:
- Each row represents an organisation.
- Columns show completion rates for each training module (both ASD and careers).
- Figures are displayed as completed/total users with a percentage, colour-coded for quick scanning (green for high completion, amber for moderate, grey for low).

---

## 8. Security

### Two-Factor Authentication (2FA)

Two-factor authentication is **mandatory for all admin accounts** (Super Admin and Org Admin). The platform will not let you proceed until 2FA is set up.

**Setting up 2FA:**
1. After logging in for the first time as an admin, you will be redirected to the 2FA setup page.
2. Click **"Get Started"**.
3. You will see a QR code. Open your authenticator app (Google Authenticator, Microsoft Authenticator, Authy, or similar) and scan the QR code.
   - If you cannot scan the QR code, you can manually enter the secret key shown below it. Use the copy button to copy it to your clipboard.
4. Click **"I've scanned the code"**.
5. Enter the 6-digit code from your authenticator app.
6. Click **"Verify & Enable"**.
7. Once verified, you will be redirected to your admin dashboard.

**Signing in with 2FA:**
- After entering your email and password, you will be asked to enter a 6-digit code from your authenticator app.
- Enter the current code and submit to complete sign-in.

### Password Management

- Passwords must be at least 8 characters long.
- The registration form shows a password strength indicator.
- If an Org Admin creates your account with a temporary password, you will be required to change it on first login.
- Use the **"Forgot password?"** link on the login page to reset a forgotten password via email.

### Account Settings and Deletion

- Go to **Settings** in the sidebar to view your account information (name, email, role).
- The Settings page also shows data and privacy information, explaining what data is stored and your rights under UK GDPR.
- **Deleting your account:**
  - In the Danger Zone at the bottom of Settings, type `DELETE` in the confirmation field and click the delete button.
  - This permanently removes your account and all associated data (child profiles, observations, AI insights, training progress). This cannot be undone.
  - Admin accounts cannot self-delete -- another administrator must remove the account.

### Data and Privacy

- Your data is stored securely on a PostgreSQL database hosted in the EU.
- The platform stores your name, email, child profiles, and observations.
- No data is sold or shared with third parties.
- Observation data is sent to Google Gemini only for AI report generation, with no retention by Google.
- Under UK GDPR, you have the right to access, correct, and erase your data. Contact privacy@ambitiousaboutautism.org.uk for data requests.

---

## 9. FAQ and Troubleshooting

### I cannot log in

- **Check your email and password.** Passwords are case-sensitive.
- **Try resetting your password** using the "Forgot password?" link on the login page.
- **Check if your account is active.** If an administrator has deactivated your account, you will not be able to sign in. Contact your organisation admin.
- **If using SSO (Google/Microsoft):** make sure you are signing in with the correct account. If you see an error after SSO redirect, try again or contact your administrator.

### I am stuck on the "Change Password" screen

This means your administrator has created your account with a temporary password. You must set a new password before you can access the platform. Enter a new password that is at least 8 characters long.

### I am stuck on the MFA setup screen

This screen appears for admin accounts that have not yet set up two-factor authentication. You must complete the setup to continue:
1. Download an authenticator app if you do not have one (Google Authenticator, Microsoft Authenticator, or Authy are all free).
2. Follow the steps on screen to scan the QR code and verify with a 6-digit code.
3. If the verification code is not accepted, make sure the time on your phone is correct (authenticator apps are time-based).

### My authenticator code is not working

- Make sure you are entering the **current** code (codes change every 30 seconds).
- Check that the **time and date on your phone** are set correctly. Authenticator codes rely on accurate time synchronisation. Enable automatic time settings on your device.
- If you have multiple entries in your authenticator app, make sure you are using the one for "Ambitious about Autism".

### I cannot see certain training modules

- Your available modules depend on your **role** and your **organisation's settings**.
- If you are a Caregiver, you should see ASD training. If you are a Careers Professional, you should see careers training.
- If you are a Student, Intern, or Employee, your organisation admin controls which modules are available to you. Contact your organisation admin if you believe modules are missing.

### I cannot access the admin or super admin area

- Only users with the **Org Admin** role can access the admin area (`/admin`).
- Only users with the **Super Admin** role can access the super admin area (`/super-admin`).
- If you believe you should have admin access, contact your organisation admin or the platform super admin.

### My AI insight report seems incomplete

- The quality of AI-generated insights depends on the **quantity and detail of observations** you have recorded.
- Try adding more observations across different domains, contexts, and time periods before generating a new report.
- Remember: AI insights are for guidance only and should complement (not replace) professional assessment.

### I accidentally deleted something

- Deleted children, observations, and user accounts **cannot be recovered**. The platform warns you before any permanent deletion.
- If you need to recover data, contact your administrator or the platform support team.

### The page is loading slowly or showing an error

- Try refreshing the page.
- Clear your browser cache and cookies.
- Make sure you are using a modern browser (Chrome, Firefox, Edge, or Safari).
- If the problem persists, it may be a temporary server issue. Try again in a few minutes.

### I have a question not covered here

Contact your organisation administrator or the Ambitious about Autism support team for further assistance.
