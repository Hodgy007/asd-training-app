export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-3xl mx-auto prose prose-slate">
        <h1>Privacy Policy</h1>
        <p><strong>Last updated: 28 March 2026</strong></p>
        <p>
          Ambitious About Autism (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is
          committed to protecting your personal data in accordance with the UK General Data
          Protection Regulation (UK GDPR) and the Data Protection Act 2018.
        </p>

        <h2>What data we collect</h2>
        <ul>
          <li>Your name and email address (account registration)</li>
          <li>Child profiles: first name, date of birth, and optional notes</li>
          <li>Behavioural observations: domain, frequency, context, date, and free-text notes</li>
          <li>Training progress records</li>
          <li>AI-generated observation summaries (created using Google Gemini)</li>
        </ul>

        <h2>Why we collect it</h2>
        <p>
          We process your data on the lawful basis of <strong>consent</strong> (Article 6(1)(a) UK
          GDPR). You consent at registration. Special category data (observations relating to a
          child&rsquo;s developmental health) is processed under Article 9(2)(a) — explicit
          consent.
        </p>

        <h2>How we use your data</h2>
        <ul>
          <li>To provide the observation tracking and training functionality of this application</li>
          <li>To generate AI-powered observation summaries via Google Gemini</li>
          <li>We do not sell, rent, or share your data with third parties for marketing</li>
        </ul>

        <h2>Third-party processors</h2>
        <ul>
          <li><strong>Vercel</strong> — application hosting (US-based, SCCs in place)</li>
          <li><strong>Neon / Azure</strong> — database hosting (Azure East US 2)</li>
          <li>
            <strong>Google Gemini</strong> — AI report generation. Observation text is sent to
            Google&rsquo;s API. Google does not retain this data for model training under the API
            terms of service.
          </li>
        </ul>

        <h2>Data retention</h2>
        <p>
          Your data is retained for as long as your account is active. You may delete your account
          at any time from Settings, which permanently erases all associated data. We recommend
          inactive accounts be reviewed after 2 years.
        </p>

        <h2>Your rights</h2>
        <p>Under UK GDPR you have the right to:</p>
        <ul>
          <li>Access the data we hold about you</li>
          <li>Correct inaccurate data</li>
          <li>Erase your data (delete your account from Settings)</li>
          <li>Withdraw consent at any time</li>
          <li>Lodge a complaint with the ICO (ico.org.uk)</li>
        </ul>

        <h2>Contact</h2>
        <p>
          For data protection queries, contact:{' '}
          <a href="mailto:privacy@ambitiousaboutautism.org.uk">
            privacy@ambitiousaboutautism.org.uk
          </a>
        </p>

        <p className="text-sm text-slate-400">
          This tool does not diagnose autism or any other condition. Observations should always be
          shared with a qualified healthcare professional.
        </p>
      </div>
    </div>
  )
}
