'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2, Plus, Upload, Undo2, RotateCcw, Save, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import type { AiModel } from '@/lib/ai-models'
import { AiPromptTestPanel } from './ai-prompt-test-panel'

interface ContextFile {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  parsedText: string
  uploadedAt: string
}

interface PromptData {
  id: string
  key: string
  name: string
  purpose: string
  category: string
  tone: string
  requirements: string[]
  exampleOutput: string | null
  inputVariables: string[]
  responseFormat: string
  model: string
  enabled: boolean
  contextFiles: ContextFile[]
  updatedByUser: { name: string | null; email: string } | null
  updatedAt: string
}

interface Props {
  prompt: PromptData
  models: AiModel[]
}

export function AiPromptEditor({ prompt, models }: Props) {
  const router = useRouter()
  const [tone, setTone] = useState(prompt.tone)
  const [requirements, setRequirements] = useState<string[]>(prompt.requirements)
  const [exampleOutput, setExampleOutput] = useState<string>(prompt.exampleOutput ?? '')
  const [model, setModel] = useState(prompt.model)
  const [enabled, setEnabled] = useState(prompt.enabled)
  const [contextFiles, setContextFiles] = useState<ContextFile[]>(prompt.contextFiles)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState<'undo' | 'reset' | null>(null)
  const [error, setError] = useState<string | null>(null)

  function updateReq(i: number, v: string) {
    setRequirements((prev) => prev.map((r, j) => (i === j ? v : r)))
  }
  function removeReq(i: number) {
    setRequirements((prev) => prev.filter((_, j) => j !== i))
  }
  function addReq() {
    setRequirements((prev) => [...prev, ''])
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/super-admin/ai-prompts/${prompt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tone,
          requirements: requirements.filter((r) => r.trim() !== ''),
          exampleOutput: exampleOutput.trim() || null,
          model,
          enabled,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Save failed')
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleUndo() {
    setBusy('undo')
    setError(null)
    try {
      const res = await fetch(`/api/super-admin/ai-prompts/${prompt.id}/undo`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Undo failed')
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Undo failed')
    } finally {
      setBusy(null)
    }
  }

  async function handleReset() {
    if (!confirm('Reset this prompt to its original defaults?')) return
    setBusy('reset')
    setError(null)
    try {
      const res = await fetch(`/api/super-admin/ai-prompts/${prompt.id}/reset`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Reset failed')
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed')
    } finally {
      setBusy(null)
    }
  }

  async function handleFileUpload(file: File) {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`/api/super-admin/ai-prompts/${prompt.id}/context-files`, {
      method: 'POST',
      body: fd,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Upload failed')
      return
    }
    const created = (await res.json()) as ContextFile
    setContextFiles((prev) => [...prev, created])
  }

  async function handleFileDelete(fileId: string) {
    const res = await fetch(
      `/api/super-admin/ai-prompts/${prompt.id}/context-files/${fileId}`,
      { method: 'DELETE' },
    )
    if (!res.ok) {
      setError('Delete failed')
      return
    }
    setContextFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const contextCharCount = contextFiles.reduce((acc, f) => acc + f.parsedText.length, 0)

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-page-enter">
      <Link
        href="/super-admin/ai-prompts"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> All prompts
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{prompt.name}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{prompt.purpose}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6">
        <div className="space-y-6 min-w-0">
          <div className="card space-y-3">
            <div>
              <div className="text-xs uppercase text-slate-400 font-semibold">Input variables</div>
              <div className="flex flex-wrap gap-2 mt-1">
                {prompt.inputVariables.map((v) => (
                  <code key={v} className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{v}</code>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-slate-400 font-semibold">Response format</div>
              <pre className="text-xs bg-slate-100 dark:bg-slate-800 rounded p-2 mt-1 whitespace-pre-wrap">{prompt.responseFormat}</pre>
            </div>
          </div>

          <div className="card space-y-4">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
              <span className="text-sm font-medium">Enabled</span>
              <span className="text-xs text-slate-500">If off, this feature returns a static fallback message.</span>
            </label>
            <div>
              <label className="block text-sm font-medium mb-1">Model</label>
              <select value={model} onChange={(e) => setModel(e.target.value)} className="input">
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.label} — {m.description}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="card">
            <label className="block text-sm font-medium mb-1">Tone / style</label>
            <textarea
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              rows={4}
              className="input"
            />
          </div>

          <div className="card">
            <label className="block text-sm font-medium mb-2">Requirements</label>
            <div className="space-y-2">
              {requirements.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <input value={r} onChange={(e) => updateReq(i, e.target.value)} className="input flex-1" />
                  <button onClick={() => removeReq(i)} className="p-2 text-slate-400 hover:text-red-600" aria-label="Remove">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button onClick={addReq} className="text-sm text-primary-600 font-medium inline-flex items-center gap-1">
                <Plus className="h-4 w-4" /> Add requirement
              </button>
            </div>
          </div>

          <div className="card">
            <label className="block text-sm font-medium mb-1">Example output (optional)</label>
            <textarea
              value={exampleOutput}
              onChange={(e) => setExampleOutput(e.target.value)}
              rows={4}
              className="input"
            />
          </div>

          <div className="card">
            <label className="block text-sm font-medium mb-2">Context files</label>
            <div
              className={clsx(
                'text-xs mb-2',
                contextCharCount > 30000 ? 'text-amber-600 font-semibold' : 'text-slate-500',
              )}
            >
              {contextCharCount.toLocaleString()} chars total
              {contextCharCount > 30000 && ' — large context may increase API cost'}
            </div>
            <ul className="space-y-2 mb-3">
              {contextFiles.map((f) => (
                <li key={f.id} className="flex items-center gap-3 p-2 rounded border border-slate-200 dark:border-slate-800">
                  <span className="flex-1 text-sm truncate">{f.fileName}</span>
                  <span className="text-xs text-slate-400">{(f.fileSize / 1024).toFixed(0)} KB</span>
                  <button onClick={() => handleFileDelete(f.id)} className="p-1 text-slate-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            {contextFiles.length < 3 && (
              <label className="btn-secondary inline-flex items-center gap-2 cursor-pointer">
                <Upload className="h-4 w-4" />
                Upload file
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void handleFileUpload(file)
                    e.target.value = ''
                  }}
                />
              </label>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>
          )}

          <div className="flex flex-wrap gap-3">
            <button onClick={handleSave} disabled={saving} className="btn-primary inline-flex items-center gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </button>
            <button onClick={handleUndo} disabled={busy !== null} className="btn-secondary inline-flex items-center gap-2">
              {busy === 'undo' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
              Undo last save
            </button>
            <button onClick={handleReset} disabled={busy !== null} className="btn-secondary inline-flex items-center gap-2">
              {busy === 'reset' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Reset to default
            </button>
          </div>
        </div>

        <AiPromptTestPanel
          promptId={prompt.id}
          inputVariables={prompt.inputVariables}
          draft={{
            tone,
            requirements: requirements.filter((r) => r.trim() !== ''),
            exampleOutput: exampleOutput.trim() || null,
            model,
          }}
        />
      </div>
    </div>
  )
}
