'use client'

import { useState } from 'react'
import { Loader2, Upload, Video, CheckCircle } from 'lucide-react'
import { InteractiveBlock, VideoData } from '@/types/interactive'
import { clsx } from 'clsx'
import { VideoPlayer } from '@/components/training/video-player'

interface VideoBuilderProps {
  block: InteractiveBlock
  onChange: (block: InteractiveBlock) => void
}

const VIDEO_MAX_BYTES = 500 * 1024 * 1024

export function VideoBuilder({ block, onChange }: VideoBuilderProps) {
  const data = block.data as VideoData
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  function update(next: Partial<VideoData>) {
    onChange({ ...block, data: { ...data, ...next } })
  }

  async function handleUpload(file: File) {
    if (file.size > VIDEO_MAX_BYTES) {
      setError('File too large — maximum 500 MB.')
      return
    }
    setError('')
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'training-videos')
      formData.append('skipSizeCheck', 'true')
      const res = await fetch('/api/super-admin/training/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Upload failed')
      }
      const { url } = await res.json()
      update({ url })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Title</label>
        <input
          type="text"
          value={block.title}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
          placeholder="Video title shown to learners"
          className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Caption (optional)</label>
        <input
          type="text"
          value={data.caption ?? ''}
          onChange={(e) => update({ caption: e.target.value })}
          placeholder="Short description shown under the video"
          className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Video URL
        </label>
        <input
          type="url"
          value={data.url}
          onChange={(e) => { update({ url: e.target.value }); setError('') }}
          placeholder="Paste a YouTube, Vimeo, or direct video URL…"
          className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder-slate-400"
        />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <label className={clsx(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-calm-200 dark:border-slate-600 text-xs font-medium cursor-pointer hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors',
          uploading && 'opacity-50 pointer-events-none'
        )}>
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? 'Uploading…' : 'Upload video file (MP4 / WebM, max 500 MB)'}
          <input
            type="file"
            accept="video/mp4,video/webm,.mp4,.webm"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUpload(file)
              e.target.value = ''
            }}
          />
        </label>
        {data.url && data.url.includes('blob.vercel-storage.com') && (
          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <CheckCircle className="h-3.5 w-3.5" /> Hosted
          </span>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {data.url && (
        <div className="rounded-xl overflow-hidden border border-calm-200 dark:border-slate-600">
          <VideoPlayer title={block.title || 'Preview'} videoUrl={data.url} />
        </div>
      )}

      {!data.url && (
        <div className="rounded-xl border border-dashed border-calm-300 dark:border-slate-600 p-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Video className="h-4 w-4" />
          Paste a URL or upload a file to add a video.
        </div>
      )}
    </div>
  )
}
