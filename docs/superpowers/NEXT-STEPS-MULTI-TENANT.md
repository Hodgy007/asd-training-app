# Multi-Tenant Organisations — Next Steps

**Branch:** `feat/multi-tenant-organisations`
**Worktree:** `.claude/worktrees/multi-tenant`
**Status:** Implementation complete, code reviewed, all fixes applied, `tsc --noEmit` clean

---

## 1. Merge to main

```bash
cd C:/Users/Simon/OneDrive/Documents/asd-training-app
git stash pop                # restore any stashed changes from before
git merge feat/multi-tenant-organisations
```

## 2. Run the production migration (IN THIS ORDER)

### Step 1: Rename ADMIN rows (BEFORE schema push)

Open Neon SQL Editor and run:

```sql
UPDATE "User" SET role = 'SUPER_ADMIN' WHERE role = 'ADMIN';
```

### Step 2: Push the new schema

```bash
npx prisma db push
```

### Step 3: Run the migration script (creates Legacy org, assigns users)

```bash
npx tsx prisma/migrate-to-multi-tenant.ts
```

### Step 4: Regenerate Prisma client

```bash
npx prisma generate
```

## 3. Deploy to Vercel

```bash
npx vercel deploy --prod
```

Or just push to main and let Vercel auto-deploy.

## 4. Post-deploy verification

- [ ] Login as a former ADMIN user — should land on `/super-admin`
- [ ] Create a new organisation from the super admin portal
- [ ] Create an org admin for that organisation (should get mustChangePassword)
- [ ] Login as the new org admin — should be forced to `/change-password`
- [ ] After password change — should land on `/admin`
- [ ] Create a user from the org admin portal (test SSO-only toggle)
- [ ] Login as a leaf role user — should see announcements on dashboard
- [ ] Verify training/careers pages only show assigned modules
- [ ] Verify SSO login for a non-registered email shows error message
- [ ] Verify `/api/children` returns 403 for non-CAREGIVER roles

## 5. Optional improvements (from code review, not blocking)

- Sidebar for STUDENT/INTERN/EMPLOYEE shows both Training + Careers links even if user only has access to one — could be made module-aware
- Announcement body renders as plain text, not markdown — could add a markdown renderer
- Dashboard fetches children data for non-CAREGIVER roles (wasted queries) — could skip conditionally
- Super admin overview page could consolidate DB queries for better performance

## 6. Clean up worktree (after merge)

```bash
cd C:/Users/Simon/OneDrive/Documents/asd-training-app
git worktree remove .claude/worktrees/multi-tenant
git branch -d feat/multi-tenant-organisations
```
