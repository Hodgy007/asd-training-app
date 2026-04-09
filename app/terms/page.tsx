export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white py-12 px-4 animate-page-enter">
      <div className="max-w-3xl mx-auto prose prose-slate">
        <h1>Terms of Service</h1>
        <p><strong>Last updated: 1 April 2026</strong></p>
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the ASD Training &amp;
          Observation Platform (&ldquo;the Platform&rdquo;) operated by Ambitious About Autism
          (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;). By accessing or using the
          Platform, you agree to be bound by these Terms.
        </p>

        <h2>1. Eligibility</h2>
        <p>
          You must be at least 18 years old and authorised by your employer or organisation to use
          the Platform. Accounts are created by organisation administrators or charity staff.
        </p>

        <h2>2. Account Responsibilities</h2>
        <ul>
          <li>You are responsible for maintaining the security of your account credentials.</li>
          <li>You must not share your login details with others.</li>
          <li>
            You must notify your organisation administrator immediately if you suspect unauthorised
            access to your account.
          </li>
          <li>
            Where multi-factor authentication (MFA) is required for your role, you must keep it
            enabled at all times.
          </li>
        </ul>

        <h2>3. Acceptable Use</h2>
        <p>You agree to use the Platform only for its intended purpose: ASD awareness training,
          child observation tracking, and related professional development. You must not:</p>
        <ul>
          <li>Use the Platform for any unlawful purpose</li>
          <li>Attempt to gain unauthorised access to other accounts or system resources</li>
          <li>Upload malicious files or content</li>
          <li>Misrepresent observations or data</li>
          <li>Use automated tools or bots to access the Platform</li>
        </ul>

        <h2>4. Child Data</h2>
        <p>
          If you record child observation data, you confirm that you have the necessary consent or
          lawful basis to do so in accordance with your organisation&rsquo;s data protection policies
          and UK GDPR. You must ensure child data is accurate and used only for its intended
          educational and developmental purpose.
        </p>

        <h2>5. AI-Generated Content</h2>
        <p>
          The Platform uses artificial intelligence (Google Gemini) to generate observation summaries
          and insights. These are <strong>not medical diagnoses</strong> and must not be treated as
          such. AI-generated content is provided to support observation and pattern recognition only.
          Always consult a qualified healthcare professional for clinical assessments.
        </p>

        <h2>6. Training Content</h2>
        <p>
          Training materials provided through the Platform are for professional development purposes.
          All training content is the intellectual property of Ambitious About Autism and must not be
          reproduced, distributed, or shared outside the Platform without written permission.
        </p>

        <h2>7. Availability</h2>
        <p>
          We aim to keep the Platform available at all times but do not guarantee uninterrupted
          access. We may perform maintenance or updates that temporarily affect availability. We will
          endeavour to provide advance notice of planned downtime.
        </p>

        <h2>8. Data Protection</h2>
        <p>
          Your use of the Platform is also governed by our{' '}
          <a href="/privacy">Privacy Policy</a>. We process personal data in accordance with UK GDPR
          and the Data Protection Act 2018.
        </p>

        <h2>9. Termination</h2>
        <p>
          We may suspend or terminate your account if you breach these Terms or if your organisation
          is deactivated. Your organisation administrator may also deactivate your account at any
          time.
        </p>

        <h2>10. Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, Ambitious About Autism shall not be liable for any
          indirect, incidental, or consequential damages arising from your use of the Platform. The
          Platform is provided &ldquo;as is&rdquo; without warranties of any kind, except as required
          by law.
        </p>

        <h2>11. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. We will notify users of material changes via
          the Platform. Continued use after changes constitutes acceptance of the revised Terms.
        </p>

        <h2>12. Governing Law</h2>
        <p>
          These Terms are governed by the laws of England and Wales. Any disputes shall be subject to
          the exclusive jurisdiction of the courts of England and Wales.
        </p>

        <h2>Contact</h2>
        <p>
          For questions about these Terms, contact:{' '}
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
