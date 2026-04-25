import { Tip } from '@/components/howto/panel'

export default function MeetingsHowTo() {
  return (
    <>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Configure your organisation&apos;s meeting platform integrations to enable auto-generated
        meeting links when creating virtual classroom sessions.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Zoom Integration</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Navigate to <strong>Meeting Settings</strong> in the sidebar.</li>
        <li>Enter your Zoom <strong>API Key</strong> and <strong>API Secret</strong> from your Zoom Developer account.</li>
        <li>Save the configuration. You can now auto-generate Zoom links when creating sessions.</li>
      </ol>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Microsoft Teams Integration</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Enter your Microsoft <strong>Tenant ID</strong> and the required credentials from Azure Portal.</li>
        <li>Save the configuration. Teams meeting links can then be generated automatically.</li>
      </ol>

      <Tip>
        These settings are <strong>per-organisation</strong> and only affect your org&apos;s sessions.
        If you don&apos;t configure meeting APIs, you can still paste meeting links manually when
        creating sessions.
      </Tip>
    </>
  )
}
