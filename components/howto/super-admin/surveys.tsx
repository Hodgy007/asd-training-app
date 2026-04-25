import { Sparkles, Send, XCircle, Eye, Trash2 } from 'lucide-react'
import { Tip } from '@/components/howto/panel'

export default function SurveysHowTo() {
  return (
    <>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Create and manage surveys to collect feedback from users across the platform.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Creating a survey manually</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Navigate to <strong>Surveys</strong> from the sidebar and click <strong>Create Survey</strong>.</li>
        <li>Enter a survey title and optional description.</li>
        <li>Add questions using the survey builder. Five question types are available:
          <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
            <li><strong>Multiple Choice</strong> &mdash; single selection from a list of options.</li>
            <li><strong>Yes/No</strong> &mdash; simple binary question.</li>
            <li><strong>Free Text</strong> &mdash; open-ended text response.</li>
            <li><strong>Rating Scale (1&ndash;5)</strong> &mdash; numeric rating.</li>
            <li><strong>Multi Select</strong> &mdash; multiple selections from a list of options.</li>
          </ul>
        </li>
        <li>Reorder questions by dragging or using the move buttons.</li>
      </ol>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        <span className="inline-flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-purple-500" /> AI Survey Generation</span>
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Generate complete surveys automatically by providing a topic description or uploading files. AI will create relevant questions using an appropriate mix of question types.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Setting up the target audience</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Use the role x organisation picker to define exactly who should receive the survey. You can target specific roles within specific organisations, all roles in certain organisations, or all users platform-wide.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Adding a close date</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Optionally set a close date. After this date, the survey will automatically stop accepting responses.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Publishing and closing surveys</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li><strong>Publishing</strong> <Send className="inline h-3.5 w-3.5 text-slate-400" /> &mdash; makes the survey visible to the targeted users. Users will see it in their dashboard.</li>
        <li><strong>Closing</strong> <XCircle className="inline h-3.5 w-3.5 text-slate-400" /> &mdash; stops the survey from accepting new responses. Existing responses are preserved.</li>
      </ol>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Viewing survey details and results</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Click <strong>View</strong> <Eye className="inline h-3.5 w-3.5 text-slate-400" /> on any survey to see its questions and configuration.</li>
        <li>Click <strong>Results</strong> to see charts and response breakdowns for each question.</li>
      </ol>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        <span className="inline-flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-purple-500" /> Generating AI Insights</span>
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        From the results page, generate AI-powered insights to help interpret the data:
      </p>
      <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li><strong>Summary</strong> &mdash; an overall summary of key findings and themes.</li>
        <li><strong>Comparative</strong> &mdash; cross-role and cross-organisation analysis highlighting differences and patterns.</li>
        <li><strong>Recommendations</strong> &mdash; actionable recommendations based on the survey responses.</li>
      </ul>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Deleting a survey</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Click the <strong>Delete</strong> <Trash2 className="inline h-3.5 w-3.5 text-slate-400" /> button on a survey to permanently remove it and all its responses. This action cannot be undone.
      </p>

      <Tip>Publish a survey only after you have finalised all questions and configured the target audience. Once published, questions cannot be edited to ensure response consistency.</Tip>
    </>
  )
}
