# Handover documentation

This folder is the deliverable bundle for handover to Ambitious About Autism. It contains
nine PDFs — two role-facing user/admin guides, one platform administration model guide,
five technical / process documents, and one integration partner guide.

## Working principles

1. **Markdown is the source of truth.** The PDFs are *generated artefacts*. Never edit the
   PDFs directly — edits will be overwritten on the next build.
2. **The CHANGELOG.md log carries the running history** of platform changes since each PDF
   was last regenerated. Add an entry when a feature ships, then regenerate the PDF the
   next time it's convenient.
3. **Every PDF maps to one or more markdown sources** (see table below). Two PDFs are
   composites of two role guides each; the build script handles concatenation with a page
   break.

## Source ↔ PDF mapping

| PDF | Source markdown |
|---|---|
| `AAA_Admin_Guide.pdf` | `docs/guides/super-admin-guide.md` + `docs/guides/org-admin-guide.md` |
| `AAA_Platform_Administration.pdf` | `docs/handover/platform-administration.md` |
| `AAA_User_Guide.pdf` | `docs/guides/learner-guide.md` |
| `AAA_Data_Dictionary.pdf` | `docs/handover/data-dictionary.md` |
| `AAA_Technical_Setup_Guide.pdf` | `docs/handover/technical-setup-guide.md` |
| `AAA_Self_Registration_Flow.pdf` | `docs/handover/self-registration-flow.md` |
| `AAA_Digital_Platform_Handover_Plan.pdf` | `docs/handover/handover-plan.md` |
| `AAA_Training_Materials.pdf` | `docs/handover/training-materials.md` |
| `AAA_Integration_Reports_Guide.pdf` | `docs/guides/integration-reports-guide.md` |

The role-facing guides and the integration partner guide live in `docs/guides/`
because they're also the canonical in-repo user documentation. The five
handover-only sources live here in `docs/handover/` because they have no
purpose outside the PDF bundle.

`platform-administration.md` covers the administration *model* — who can administer
what, and where the boundary between the charity and an external organisation sits.
`AAA_Admin_Guide.pdf` covers the screen-by-screen *procedures*. Keep them distinct:
when a permission or a role boundary changes, update the former; when a screen
changes, update the latter.

## Regenerating the PDFs

```bash
npm run handover:build
```

The build script (`scripts/build-handover-pdfs.mjs`) reads each markdown source,
concatenates composite sources, and runs them through `md-to-pdf`. Styling lives in
`docs/handover/_pdf-style.css` — edit that to change the look of every PDF at once.

The output is nine `.pdf` files in this folder. Re-commit them whenever you regenerate.

## When to regenerate

Trigger a rebuild after any of the following:

- A user-facing feature ships that affects one of the role guides.
- A schema change adds, removes, or significantly modifies a Prisma model
  (update `data-dictionary.md`, then rebuild).
- An env var, deployment process, or external service is added/removed
  (update `technical-setup-guide.md` or `handover-plan.md`, then rebuild).
- The self-registration / auth flow changes (update `self-registration-flow.md`).
- A CHANGELOG entry is added that mentions one of the affected docs.

If the platform is moving fast and rebuilds happen often, you can skip rebuilding for
purely cosmetic markdown changes (typos, wording polish) and batch them at the next
substantive update.

## CHANGELOG.md

`CHANGELOG.md` is the human-readable log of what's drifted since the last regeneration.
Add an entry whenever a user-visible change ships, and clear entries once the relevant
PDFs have been rebuilt. The CHANGELOG is intentionally redundant with git history — it
exists for non-developer readers (DPO, charity staff, auditors) who don't read git log.
