export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white py-12 px-4 animate-page-enter">
      <div className="max-w-3xl mx-auto prose prose-slate">
        <h1>Privacy Policy</h1>
        <p><strong>Last updated: 21 April 2026</strong></p>
        <p>
          Ambitious about Autism (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;, charity
          no. 1063184) is committed to protecting personal data in accordance with the UK General
          Data Protection Regulation (UK GDPR) and the Data Protection Act 2018. This policy
          applies to the Ambitious about Autism Training Platform.
        </p>

        <h2>What data we collect</h2>
        <h3>About you</h3>
        <ul>
          <li>Name, email address, organisation, role</li>
          <li>A hashed password (we never store your real password)</li>
          <li>If enabled, a two-factor authentication secret</li>
          <li>Training progress and quiz scores</li>
        </ul>

        <h2>Lawful basis</h2>
        <p>
          Your account data is processed under <strong>contract</strong> (UK GDPR Art. 6(1)(b))
          — performance of the service contract between us and your organisation.
        </p>

        <h2>Pseudonymisation before AI</h2>
        <p>
          Where AI features are used, we only send the content you submit. Google never receives
          your email address or organisation in AI payloads.
        </p>

        <h2>Retention</h2>
        <ul>
          <li>
            Your account data is kept until your organisation removes you or closes your account.
          </li>
        </ul>

        <h2>Third-party processors</h2>
        <ul>
          <li><strong>Vercel Inc.</strong> (US) — application hosting. SCC + UK Addendum.</li>
          <li>
            <strong>Neon Inc.</strong> (US, Azure East US 2) — PostgreSQL hosting. SCC + UK
            Addendum. Encrypted at rest (AES-256).
          </li>
          <li>
            <strong>Google LLC</strong> (US) — Gemini AI for training content and document
            generation. Google&rsquo;s API Terms of Service prohibit use of API content for model
            training. SCC + UK Addendum.
          </li>
          <li>
            <strong>Microsoft Corp.</strong> — Azure AD (optional single sign-on; only if your
            organisation enables it).
          </li>
          <li>
            <strong>Resend Inc.</strong> (EU) — transactional email (password reset only).
          </li>
        </ul>

        <h2>Your rights</h2>
        <p>Under UK GDPR you have the right to:</p>
        <ul>
          <li><strong>Access</strong> the data we hold about you.</li>
          <li><strong>Rectify</strong> inaccurate data.</li>
          <li><strong>Erase</strong> your data — admins can delete accounts on request.</li>
          <li>
            <strong>Lodge a complaint</strong> with the UK Information Commissioner&rsquo;s Office:{' '}
            <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk</a>.
          </li>
        </ul>

        <h2>Security</h2>
        <ul>
          <li>All traffic is encrypted in transit (HTTPS)</li>
          <li>All data at rest is encrypted (AES-256)</li>
          <li>Passwords are hashed using bcrypt; we never store plaintext passwords</li>
          <li>Two-factor authentication is mandatory for admin roles</li>
          <li>Login attempts are rate-limited</li>
        </ul>

        <h2>Breach notification</h2>
        <p>
          Any confirmed personal-data breach is reported to the ICO within 72 hours in accordance
          with UK GDPR Art. 33. Affected organisations and data subjects are notified immediately.
        </p>

        <h2>Contact</h2>
        <p>
          For data-protection queries, to exercise a right, or to raise a concern, contact our
          Data Protection Officer:{' '}
          <a href="mailto:privacy@ambitiousaboutautism.org.uk">
            privacy@ambitiousaboutautism.org.uk
          </a>
          . We respond to subject-access requests within the 30-day UK GDPR window, and usually
          sooner.
        </p>
      </div>
    </div>
  )
}
