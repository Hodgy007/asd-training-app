import { Shield } from 'lucide-react'
import { SettingsSubpage } from '@/components/settings/subpage'

export const metadata = { title: 'Data & Privacy | Settings' }

export default function SettingsPrivacyPage() {
  return (
    <SettingsSubpage
      title="Data & Privacy"
      description="How we store your data and your rights under UK GDPR."
      icon={Shield}
      iconColor="text-slate-600 dark:text-slate-300"
      iconBg="bg-slate-100 dark:bg-slate-700"
    >
      <div className="card space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Your data is stored securely on Neon PostgreSQL (hosted on Azure, EU). We store your name,
          email, and training progress. No data is sold or shared with third parties.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Under UK GDPR you have the right to access, correct, and erase your data. To request a
          copy of your data, contact{' '}
          <a href="mailto:privacy@ambitiousaboutautism.org.uk" className="text-primary-600 underline">
            privacy@ambitiousaboutautism.org.uk
          </a>
          .
        </p>
      </div>
    </SettingsSubpage>
  )
}
