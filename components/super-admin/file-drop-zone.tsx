'use client'

import { useRef, useState, useCallback } from 'react'
import { FileText, File, X } from 'lucide-react'
import { clsx } from 'clsx'

interface FileDropZoneProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  disabled?: boolean
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIconColor(file: File): string {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return 'text-red-500'
  if (name.endsWith('.docx')) return 'text-blue-500'
  if (name.endsWith('.pptx')) return 'text-orange-500'
  return 'text-slate-400'
}

function getFileIcon(file: File) {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return FileText
  return File
}

export function FileDropZone({ files, onFilesChange, disabled = false }: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.pptx']

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming)
    const filtered = arr.filter((f) => {
      const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase()
      if (!ALLOWED_EXTENSIONS.includes(ext)) return false
      return !files.some((existing) => existing.name === f.name && existing.size === f.size)
    })
    if (filtered.length > 0) {
      onFilesChange([...files, ...filtered])
    }
  }, [files, onFilesChange])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (disabled) return
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }

  const handleClick = () => {
    if (!disabled) inputRef.current?.click()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files)
      // Reset so same file can be re-added after removal
      e.target.value = ''
    }
  }

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index)
    onFilesChange(updated)
  }

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload files"
        onClick={handleClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={clsx(
          'relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          isDragOver && !disabled
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-slate-300 dark:border-slate-600 hover:border-primary-400 dark:hover:border-primary-500 bg-slate-50 dark:bg-slate-800/50',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        )}
      >
        <File className="h-10 w-10 text-slate-400 dark:text-slate-500" />
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Drop files here or{' '}
            <span className="text-primary-600 dark:text-primary-400">click to browse</span>
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            PDF, DOCX, and PPTX files supported
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          className="sr-only"
          onChange={handleInputChange}
          disabled={disabled}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, index) => {
            const IconComponent = getFileIcon(file)
            const iconColor = getFileIconColor(file)
            const truncated = file.name.length > 40 ? file.name.slice(0, 37) + '…' : file.name
            return (
              <li
                key={`${file.name}-${file.size}`}
                className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
              >
                <IconComponent className={clsx('h-5 w-5 flex-shrink-0', iconColor)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200" title={file.name}>
                    {truncated}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{formatFileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  disabled={disabled}
                  className="flex-shrink-0 rounded p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:cursor-not-allowed"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
