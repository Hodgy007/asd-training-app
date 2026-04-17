'use client'

import { useState } from 'react'
import { Play, Loader2 } from 'lucide-react'

interface Draft {
  tone: string
  requirements: string[]
  exampleOutput: string | null
  model: string
}

interface Props {
  promptId: string
  inputVariables: string[]
  draft: Draft
}

export function AiPromptTestPanel({ promptId, inputVariables, draft }: Props) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(inputVariables.map((v) => [v, ''])),
  )
  const [running, setRunning] = useState(false)
  const [response, setResponse] = useState<string | null>(null)
  const [assembled, setAssembled] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runTest() {
    setRunning(true)
    setError(null)
    setResponse(null)
    try {
      const res = await fetch(`/api/super-admin/ai-prompts/${promptId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft, values }),
      })
      const body = await res.json()
      setAssembled(body.assembledPrompt ?? null)
      if (!res.ok) throw new Error(body.error ?? 'Test failed')
      setResponse(body.response ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Test failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <aside className="card-rail space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Test</h3>
        <p className="text-xs text-slate-500">Fill in sample values and run the unsaved draft against the model.</p>
      </div>

      {inputVariables.map((v) => (
        <div key={v}>
          <label className="block text-xs font-medium mb-1">
            <code>{v}</code>
          </label>
          <textarea
            value={values[v] ?? ''}
            onChange={(e) => setValues((prev) => ({ ...prev, [v]: e.target.value }))}
            rows={2}
            className="input text-sm"
          />
        </div>
      ))}

      <button
        onClick={runTest}
        disabled={running}
        className="btn-primary w-full inline-flex items-center justify-center gap-2"
      >
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        Test
      </button>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">{error}</div>
      )}

      {response !== null && (
        <div>
          <div className="text-xs uppercase text-slate-400 font-semibold mb-1">Response</div>
          <pre className="text-xs bg-slate-50 dark:bg-slate-800 rounded p-2 whitespace-pre-wrap max-h-64 overflow-y-auto">{response}</pre>
        </div>
      )}

      {assembled && (
        <details>
          <summary className="text-xs text-slate-500 cursor-pointer">Show assembled prompt ({assembled.length} chars)</summary>
          <pre className="text-xs bg-slate-50 dark:bg-slate-800 rounded p-2 whitespace-pre-wrap max-h-48 overflow-y-auto mt-2">{assembled}</pre>
        </details>
      )}
    </aside>
  )
}
