export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white py-12 px-4 animate-page-enter">
      <div className="max-w-3xl mx-auto prose prose-slate">
        <h1>Privacy Policy</h1>
        <p><strong>Last updated: 19 April 2026</strong></p>
        <p>
          Ambitious about Autism (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;, charity
          no. 1063184) is committed to protecting personal data in accordance with the UK General
          Data Protection Regulation (UK GDPR) and the Data Protection Act 2018. This policy
          applies to the Ambitious about Autism Training &amp; Observation Platform.
        </p>
        <p>
          For the Child Observations feature, your organisation (the school, Local Authority or
          nursery) is the <strong>data controller</strong> and Ambitious about Autism is the{' '}
          <strong>data processor</strong>. For everything else (your own account, training
          progress) we act as controller.
        </p>

        <h2>What data we collect</h2>
        <h3>About you (the caregiver)</h3>
        <ul>
          <li>Name, email address, organisation, role</li>
          <li>A hashed password (we never store your real password)</li>
          <li>If enabled, a two-factor authentication secret</li>
          <li>Training progress and quiz scores</li>
        </ul>
        <h3>About a child in your care</h3>
        <ul>
          <li>First name only (no surname)</li>
          <li>Date of birth</li>
          <li>
            Structured behavioural observations — each one records a date, a short behaviour
            label, a domain (social, behaviour &amp; play, sensory), a frequency and a context
            (home / nursery / outdoors / other)
          </li>
          <li>When and by whom parental consent was recorded</li>
          <li>AI-generated insight reports you&rsquo;ve requested</li>
          <li>An immutable audit log of who has opened, changed or exported the record</li>
        </ul>
        <h3>What we deliberately do <em>not</em> collect about a child</h3>
        <ul>
          <li>Surname, address, UPN, NHS number</li>
          <li>Photographs</li>
          <li>Free-text narrative notes (removed from the product 19 April 2026)</li>
          <li>Location data beyond the four-value context enum</li>
          <li>Health diagnoses, ethnicity, religion</li>
        </ul>

        <h2>Lawful basis</h2>
        <p>
          The lawful basis for processing a child&rsquo;s observations is configured per
          organisation by your data controller:
        </p>
        <ul>
          <li>
            <strong>Consent</strong> (Art. 6(1)(a) + Art. 9(2)(a) — explicit consent) — the default.
          </li>
          <li>
            <strong>Public task</strong> (Art. 6(1)(e) + DPA 2018 Sch. 1 Pt 2 para 18 —
            safeguarding) — used by Local Authorities acting under statutory duty.
          </li>
          <li>
            <strong>Legitimate interests</strong> (Art. 6(1)(f)) — available but rare.
          </li>
        </ul>
        <p>
          Your caregiver account data is processed under <strong>contract</strong> (Art. 6(1)(b))
          — performance of the service contract between us and your organisation.
        </p>

        <h2>Pseudonymisation before AI</h2>
        <p>
          When you ask for an AI insight report, we send the observation set to Google Gemini.
          Before we do, we replace the child&rsquo;s real first name with a deterministic pseudonym
          (e.g. <code>child-a3f2c9b1</code>) and the exact date of birth with a six-month age
          bucket (e.g. <code>4y3m</code>). <strong>Google never receives</strong> the
          child&rsquo;s real name, exact date of birth, your name, your email or your
          organisation.
        </p>

        <h2>Retention</h2>
        <ul>
          <li>
            Observations are deleted automatically each night once older than your
            organisation&rsquo;s retention period (default <strong>1 095 days = 3 years</strong>).
          </li>
          <li>
            Your own account data is kept until your organisation removes you or closes your
            account.
          </li>
          <li>
            Audit-log rows are kept for the lifetime of the child record (and are deleted together
            with it).
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
            <strong>Google LLC</strong> (US) — Gemini AI for insight generation. Receives
            pseudonymised observations only. Google&rsquo;s API Terms of Service prohibit use of
            API content for model training. SCC + UK Addendum.
          </li>
          <li>
            <strong>Microsoft Corp.</strong> — Azure AD (optional single sign-on; only if your
            organisation enables it).
          </li>
          <li>
            <strong>Resend Inc.</strong> (EU) — transactional email (password reset only).
          </li>
        </ul>
        <p>
          A full sub-processor register is maintained in our{' '}
          <a href="https://github.com/Hodgy007/asd-training-app/blob/main/docs/compliance/ROPA.md">
            ROPA
          </a>
          . Changes are notified to customer organisations 30 days in advance.
        </p>

        <h2>Your rights</h2>
        <p>Under UK GDPR you (or, for a child under 13, their parent) have the right to:</p>
        <ul>
          <li>
            <strong>Access</strong> the data we hold — caregivers can download a child&rsquo;s full
            record as JSON with one click from the child&rsquo;s page (the ⬇ button).
          </li>
          <li>
            <strong>Rectify</strong> inaccurate data — edit a child&rsquo;s details directly, or
            delete and re-enter an observation.
          </li>
          <li>
            <strong>Erase</strong> your data — caregivers can delete any child record (which
            cascades to all observations and AI reports); admins can delete accounts.
          </li>
          <li>
            <strong>See a log</strong> of everything you&rsquo;ve done on a child&rsquo;s record at
            the <a href="/activity">My Activity</a> page.
          </li>
          <li>
            <strong>Withdraw consent</strong> at any time by deleting the relevant child record.
          </li>
          <li>
            <strong>Lodge a complaint</strong> with the UK Information Commissioner&rsquo;s Office:{' '}
            <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk</a>.
          </li>
        </ul>
        <p>
          Young people aged <strong>13 and over</strong> can exercise these rights themselves. When
          a child on the platform reaches 13, the caregiver sees a reminder banner and is prompted
          to offer the young person a copy of their record.
        </p>

        <h2>Security</h2>
        <ul>
          <li>All traffic is encrypted in transit (HTTPS)</li>
          <li>All data at rest is encrypted (AES-256)</li>
          <li>Passwords are hashed using bcrypt; we never store plaintext passwords</li>
          <li>Two-factor authentication is mandatory for admin roles</li>
          <li>Login attempts are rate-limited</li>
          <li>Every action on a child&rsquo;s record is recorded in an immutable audit log</li>
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

        <p className="text-sm text-slate-400">
          This tool supports observation and pattern recognition only. It does not diagnose autism
          or any other condition. Observations should always be discussed with a qualified GP,
          health visitor or SENCO.
        </p>
      </div>
    </div>
  )
}
