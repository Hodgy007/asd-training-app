import { FolderOpen } from 'lucide-react'
import { GuideSubpage, Tip } from '@/components/guide/subpage'

export const metadata = { title: 'Document Library | Guide' }

export default function GuideLibraryPage() {
  return (
    <GuideSubpage
      parentHref="/guide"
      parentLabel="Back to Guide"
      icon={FolderOpen}
      title="Document Library"
      accent="primary"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Your organisation (or the charity) may share document collections with you — guides, templates, policies, or reading material.
      </p>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Collections you have access to appear as individual links in the sidebar</li>
        <li>Click a collection to open it, then click any document to preview or download it</li>
        <li>New documents are added regularly — check back periodically for updates</li>
      </ol>
      <Tip>If you expect to see a collection that isn&apos;t showing up, contact your Org Admin — visibility is set per-role and per-organisation.</Tip>
    </GuideSubpage>
  )
}
