import { Tip } from '@/components/howto/panel'

export default function AiPromptsHowTo() {
  return (
    <>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Every AI feature on the platform &mdash; CV writing help, careers reports, quiz generation, survey insights, lesson-content suggestions &mdash; is driven by a named prompt in the <strong>AI Prompts</strong> registry. You can tune the tone, model, requirements, and example output without a deploy.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Editing a prompt</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Open <strong>AI Prompts</strong> from <strong>Products</strong>. Each row is a prompt with a key, purpose, and model.</li>
        <li>Click a prompt to edit its <strong>tone</strong>, <strong>requirements</strong> (bullet-style constraints the model must follow), <strong>example output</strong>, and <strong>response format</strong>.</li>
        <li>Pick the <strong>model</strong> &mdash; Gemini, Claude, or GPT. Everything routes through the Vercel AI Gateway.</li>
        <li>Upload <strong>context files</strong> (PDF, DOCX, TXT) that the prompt should always consider &mdash; e.g. a style guide or safeguarding policy.</li>
        <li>Toggle <strong>enabled</strong> off to temporarily disable a prompt; the feature will surface a &ldquo;temporarily unavailable&rdquo; message instead of calling the AI.</li>
        <li>Save. Changes take effect immediately. Previous values are kept so you can revert.</li>
      </ol>

      <Tip>Keep a prompt&apos;s requirements explicit about what the AI must <em>not</em> say (e.g. &ldquo;never mention autism or disability&rdquo;). Models follow bulleted requirements far more reliably than prose instructions.</Tip>
    </>
  )
}
