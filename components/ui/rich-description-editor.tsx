'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import 'react-quill-new/dist/quill.snow.css'

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false })

interface RichDescriptionEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
  ariaLabel?: string
}

export function RichDescriptionEditor({
  value,
  onChange,
  placeholder,
  minHeight = 100,
  ariaLabel,
}: RichDescriptionEditorProps) {
  const modules = useMemo(
    () => ({
      toolbar: [
        [{ font: [] }, { size: ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline'],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ align: '' }, { align: 'center' }, { align: 'right' }, { align: 'justify' }],
        ['link'],
        ['clean'],
      ],
    }),
    []
  )

  const formats = useMemo(
    () => ['bold', 'italic', 'underline', 'list', 'link', 'align', 'font', 'size', 'color', 'background'],
    []
  )

  return (
    <div
      aria-label={ariaLabel}
      style={{ ['--rde-min-height' as string]: `${minHeight}px` }}
      className="rounded-xl border border-calm-200 dark:border-slate-600 overflow-hidden [&_.ql-toolbar]:border-calm-200 [&_.ql-toolbar]:dark:border-slate-600 [&_.ql-toolbar]:bg-calm-50 [&_.ql-toolbar]:dark:bg-slate-700 [&_.ql-container]:border-0 [&_.ql-editor]:min-h-[var(--rde-min-height)] [&_.ql-editor]:text-sm [&_.ql-editor]:text-slate-900 [&_.ql-editor]:dark:text-white [&_.ql-editor]:bg-white [&_.ql-editor]:dark:bg-slate-700"
    >
      <ReactQuill
        theme="snow"
        value={value}
        onChange={(next, _delta, source) => {
          // Only forward user-initiated changes. Quill fires text-change with
          // source='api' during mount and prop updates as it normalises HTML;
          // forwarding those causes infinite setState loops when multiple
          // editors are mounted together (e.g. carousel slide bodies).
          if (source !== 'user') return
          onChange(next)
        }}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
      />
    </div>
  )
}
