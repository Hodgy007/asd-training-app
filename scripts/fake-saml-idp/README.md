# Fake SAML IdP (local SSO testing)

A throwaway SAML 2.0 IdP for end-to-end testing of the charity SSO flow without
needing Okta / Azure / Google. Spawns [`saml-idp`](https://www.npmjs.com/package/saml-idp)
with a self-signed cert generated on first run.

## Quick start

```bash
# Terminal 1 — start the app
npm run dev

# Terminal 2 — start the fake IdP
npm run idp
```

The launcher prints the exact values to paste into
`/super-admin/settings/sso`:

- **Entity ID** — the IdP issuer (`http://localhost:7000/metadata`)
- **SSO URL** — `http://localhost:7000/saml/sso`
- **Certificate** — the PEM block from `scripts/fake-saml-idp/cert.pem`

## Doing it as the admin

1. Log in to the app as a `SUPER_ADMIN`.
2. Go to **Settings → SSO** (`/super-admin/settings/sso`).
3. Paste the three values from the launcher banner. Leave the
   **Auto-configure** button alone — it requires HTTPS and a public
   address, neither of which apply to localhost.
4. **Leave the "Enforce SSO for charity users" toggle OFF** for the first
   run-through. Otherwise password login for charity users gets disabled,
   and a flaky IdP setup can lock you out.
5. Click **Save**. The status pill should flip to "Configured".
6. Click **Test SSO** — it sanity-checks the cert and SSO URL format.
7. Sign out → back to `/login` → switch to the **Single Sign-On** tab →
   enter the email you want to sign in as.
8. The browser redirects to the fake IdP. On the IdP page you can edit
   the email/attributes if you want, then click **Sign in**.
9. The IdP POSTs the signed assertion back to
   `/api/auth/saml/callback` and you land back on the app, signed in.

## Test user

By default the IdP issues assertions with NameID
`charity-admin@example.com`. The callback only mints a session if a user
with that email already exists as `SUPER_ADMIN` or `CHARITY_EMPLOYEE`.

Easiest options:

- **Reuse your super-admin account** — on the IdP login form, edit the
  username field to your real super-admin email before clicking Sign in.
- **Override the default**:

  ```bash
  IDP_TEST_EMAIL=you@example.com npm run idp
  ```

- **Pre-seed a dedicated charity admin** via Prisma Studio or a quick
  SQL insert.

## Files

| Path | Purpose |
| --- | --- |
| `start.mjs` | Launcher — generates cert, spawns saml-idp |
| `cert.pem` / `key.pem` | Self-signed cert + key (gitignored, regenerated if missing) |
| `idp-user.json` | Default user attributes the IdP form is pre-populated with |

## Troubleshooting

- **`Signature verification failed`** — the cert in the SSO admin page
  doesn't match the IdP's actual signing key. Re-copy the cert PEM from
  the launcher banner; if you regenerated `cert.pem` you'll need to
  re-paste.
- **`Audience does not match this application`** — `APP_URL` env var on
  the IdP doesn't match `NEXTAUTH_URL` in the app. Both should be
  `http://localhost:3000`.
- **`Recipient does not match ACS URL`** — same fix as above; the IdP
  bakes the ACS URL into the assertion at sign time.
- **`No charity account found for this email`** — the email returned by
  the IdP isn't a `SUPER_ADMIN` / `CHARITY_EMPLOYEE` user in the DB.
- **`InResponseTo does not match a pending request`** — you replayed an
  old assertion. Start a fresh login from the app.

## Limitations vs a real IdP

- HTTP only (real IdPs are HTTPS) — this is why the **Auto-configure**
  metadata fetch in the SSO admin form won't work; it requires HTTPS and
  blocks loopback addresses for SSRF reasons. Manual paste is fine.
- No SLO (single logout) — sign-out is purely local.
- Self-signed cert — fine for testing the assertion-signature path; in
  prod the cert comes from your IdP.
