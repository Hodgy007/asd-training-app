# Organisation Admin Guide

**Ambitious about Autism — Caregiver Training Platform**

This guide is for Organisation Admins. It covers everything you need to manage your organisation's users and training programme.

---

## Contents

1. [Welcome](#1-welcome)
2. [First Login](#2-first-login)
3. [Your Admin Dashboard](#3-your-admin-dashboard)
4. [Managing Users](#4-managing-users)
5. [Announcements](#5-announcements)
6. [Reports](#6-reports)
7. [Security and MFA](#7-security-and-mfa)

---

## 1. Welcome

As an Organisation Admin you are responsible for managing training within your organisation. Your admin panel lets you:

- Add and manage the people in your organisation who use the training platform
- Assign the right role to each person so they see the right training content
- Activate or deactivate accounts
- Post announcements to your organisation's members
- Monitor how your organisation is progressing through its assigned training modules

You have access to your own organisation only. You cannot view or manage users from other organisations.

---

## 2. First Login

### Setting up two-factor authentication (mandatory)

The Organisation Admin role requires two-factor authentication (2FA) for security. You will be redirected to the 2FA setup screen the first time you sign in. You cannot access the admin panel until this step is complete.

**What you need before you start:**

- A smartphone or tablet
- An authenticator app installed on it — for example:
  - Google Authenticator (iOS / Android)
  - Microsoft Authenticator (iOS / Android)
  - Authy (iOS / Android)

**Signing in:**

The login page has a toggle at the top to switch between **Email & Password** and **Single Sign-On** (Google / Microsoft). Org Admins typically sign in with email and password, since MFA is required after login.

**Steps to set up 2FA:**

1. Sign in with your email and password.
2. You will be taken to the **Set Up Two-Factor Authentication** screen automatically.
3. Click **Get Started**.
4. A QR code will appear on screen. Open your authenticator app and scan it.
   - If your app does not support QR scanning, tap the copy icon next to the text code and enter it manually in your app.
5. Once your app shows a 6-digit code, click **I've scanned the code**.
6. Type the 6-digit code from your app into the box and click **Verify & Enable**.
7. You will be taken to your admin dashboard once the code is confirmed.

From this point on, every time you sign in you will be asked for a 6-digit code from your authenticator app after entering your password.

### Changing a temporary password

If a super admin created your account and set a temporary password, you will be redirected to a **Change Password** screen before you can do anything else. Enter your new password (minimum 8 characters) and confirm it. You will only see this screen once.

---

## 3. Your Admin Dashboard

After signing in and completing 2FA, you land on the **Users** page — the main hub of your admin panel.

The left-hand sidebar has three sections:

| Section | What it does |
|---|---|
| **Users** | View, create, and manage all users in your organisation |
| **Announcements** | Post messages that appear on your members' dashboards |
| **Reports** | See training progress across your organisation |

At the top of the Users page you will see:

- The total number of users in your organisation
- A breakdown of users by role (e.g. how many Caregivers, how many Students)
- A search bar and role filter to find specific people quickly

---

## 4. Managing Users

### Viewing your users

The Users page lists everyone in your organisation. Each row shows:

- The person's name and email address
- Their role
- Whether their account is active or inactive
- The date they joined
- **Activity** — for Caregiver users this shows both the number of children they have added and lessons completed; for all other roles it shows only the lesson count
- **Actions** — a bin icon to delete the user, and a book icon to edit their training plan access (toggle ASD Awareness Training / Careers CPD Training per user)

You can search by name or email using the search bar. You can also filter by role using the dropdown next to the search bar.

### User roles explained

Your organisation is configured to use a specific set of roles. The roles available on the platform are:

| Role | Who it is for | Training access |
|---|---|---|
| **Caregiver** | People caring for a child with autism | ASD awareness training modules; can add child profiles and log observations |
| **Careers Professional** | Careers advisers and employment support staff | Careers training modules only |
| **Student** | Learners undertaking training as part of their studies | ASD and/or careers training (depending on what your organisation is assigned) |
| **Intern** | Interns undertaking the training programme | ASD and/or careers training |
| **Employee** | Employed staff undertaking training | ASD and/or careers training |

Not all roles may be available in your organisation. The roles shown in your panel are the ones your platform administrator has enabled for you.

### Creating a new user

1. Click the **Create User** button in the top-right corner of the Users page.
2. A form will appear. Fill in:
   - **Full Name** — the person's name as it should appear on the platform
   - **Email Address** — this is what they will use to sign in
   - **Role** — choose the appropriate role from the list (see the table above)
3. Choose how the person will sign in:
   - **Standard login (email + password):** Leave the "SSO only" checkbox unticked and set a temporary password (minimum 8 characters). The person will be asked to change this when they first sign in.
   - **SSO only (no password):** Tick the "SSO only" checkbox if your organisation uses Google or Microsoft sign-in. The person will sign in with their existing Google or Microsoft account — no password is needed.
4. Under **Training Plan Access**, use the **ASD Awareness Training** and **Careers CPD Training** toggles to control which training plans this person can access.
5. Click **Create User**.

The new account is active immediately. If you set a temporary password, the user will be prompted to change it on first login.

### Changing a user's role

On the Users page, find the user in the table. Click the coloured role badge in their row — it becomes a dropdown. Select the new role and it saves automatically. A green confirmation message will appear at the top of the screen.

You cannot change your own role.

### Activating and deactivating accounts

Each user has an **Active / Inactive** status shown in their row. To toggle it:

1. Click the green **Active** badge (or red **Inactive** badge) on the user's row.
2. The status flips immediately and a confirmation message appears.

A deactivated user cannot sign in. Their data is kept. You can reactivate them at any time by clicking the badge again.

You cannot deactivate your own account.

### Deleting a user

To permanently delete a user, click the bin icon at the right end of their row. You will be asked to confirm. Deletion is permanent and cannot be undone — all the user's data (including any child profiles and training progress) is removed.

You cannot delete your own account.

---

## 5. Announcements

Announcements appear on the dashboards of everyone in your organisation. Use them to share news, reminders, or important updates.

### Creating an announcement

1. In the sidebar, click **Announcements**.
2. Click **Create Announcement**.
3. Fill in the form:
   - **Title** — a short heading (e.g. "Welcome to the training programme")
   - **Body** — the full message text
   - **Expires at** — optional. Set a date and time if you want the announcement to disappear automatically (e.g. for a time-limited event). Leave blank for a permanent announcement.
   - **Active** — tick this to make the announcement visible to members straight away. Untick it to save it as a draft.
4. Click **Create Announcement**.

### Managing existing announcements

The Announcements page lists all announcements you have created. For each one you can:

- **Toggle active/inactive** — click the green Active or red Inactive badge to show or hide it from members without deleting it.
- **Delete** — click the bin icon to permanently remove it. You will be asked to confirm.

The table also shows when each announcement was created and who created it.

---

## 6. Reports

The Reports page gives you an overview of how your organisation is progressing through its assigned training modules.

### Summary cards

At the top of the page you will see three summary figures:

- **Total members** — how many users are in your organisation
- **Assigned modules** — how many training modules your organisation has access to
- **Average completion** — the average percentage completion across all modules and all users

### Module completion table

The main table shows each training module by its full name (e.g. "Understanding ASD: An Introduction") with a subtitle indicating the training plan (ASD Awareness Training or Careers CPD Training). Each module has a progress bar. The bar colour indicates:

- **Green** — 80% or more of your members have completed this module
- **Amber** — between 40% and 79% have completed it
- **Grey** — fewer than 40% have completed it

The figure to the right of the bar shows the exact count (e.g. "7/10 (70%)").

To see which specific members have completed a module, click **Show who** on that row. A list of names will expand below. Click **Hide** to collapse it.

### Per-member summary

Below the module table is a breakdown by individual member, showing how many modules each person has completed out of the total available.

- **Green badge** — the person has completed all modules
- **Amber badge** — the person is partway through
- **Grey badge** — the person has not started yet

Click the refresh button (circular arrow) in the top-right corner of the page at any time to reload the latest data.

---

## 7. Security and MFA

### Two-factor authentication

Your admin account requires 2FA at all times. This is enforced by the platform and cannot be turned off for admin accounts.

- Each time you sign in, you will enter your password first, then a 6-digit code from your authenticator app.
- If you lose access to your authenticator app, contact your platform super admin to reset your MFA.

### Your access level

As an Organisation Admin you can:

- Manage users only within your own organisation
- Create and delete announcements for your organisation
- View training reports for your organisation

You cannot:

- Access or modify users in other organisations
- Create or edit training module content (this is managed by the platform super admin)
- Change platform-wide settings

### Dark mode

The platform fully supports dark mode. All interface elements — including role badges, status indicators, and form controls — remain clearly readable in both light and dark themes. Dark mode follows the user's system preference automatically.

### Signing out

Click **Sign out** at the bottom of the left-hand sidebar to end your session securely. Always sign out if you are using a shared or public computer.

---

*Ambitious about Autism — Registered Charity. This platform is not a diagnostic tool.*
