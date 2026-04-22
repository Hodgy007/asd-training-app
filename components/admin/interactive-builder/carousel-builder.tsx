'use client'

import { useRef, useState } from 'react'
import { Plus, Trash2, Upload, Loader2, ChevronUp, ChevronDown } from 'lucide-react'
import { InteractiveBlock, CarouselData, CarouselSlide } from '@/types/interactive'
import { RichDescriptionEditor } from '@/components/ui/rich-description-editor'

interface CarouselBuilderProps {
  block: InteractiveBlock
  onChange: (updated: InteractiveBlock) => void
}

function generateId() {
  return 'slide-' + Math.random().toString(36).slice(2, 7)
}

// Legacy slide bodies were stored as plain text. ReactQuill auto-wraps them in <p>
// and fires onChange on mount — with multiple editors doing this simultaneously,
// stale-closure races cause an infinite setState loop. Pre-normalising to HTML here
// means Quill's first render roundtrips cleanly and no onChange cascade fires.
function normaliseBody(body: string): string {
  if (!body) return ''
  if (/<[a-z!/][\s\S]*>/i.test(body)) return body
  // Split on any run of newlines; each non-empty line becomes its own <p>.
  // This matches Quill's canonical output, so the prop value roundtrips cleanly
  // and no onChange cascade fires on mount.
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const paragraphs = body
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (paragraphs.length === 0) return ''
  return paragraphs.map((p) => `<p>${escape(p)}</p>`).join('')
}

export function CarouselBuilder({ block, onChange }: CarouselBuilderProps) {
  const data = block.data as CarouselData
  const slides = data.slides ?? []
  const [uploadingSlideId, setUploadingSlideId] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  function updateData(next: CarouselData) {
    onChange({ ...block, data: next })
  }

  function updateSlide(id: string, updates: Partial<CarouselSlide>) {
    updateData({ slides: slides.map((s) => (s.id === id ? { ...s, ...updates } : s)) })
  }

  function addSlide() {
    const slide: CarouselSlide = { id: generateId(), title: '', imageUrl: '', body: '' }
    updateData({ slides: [...slides, slide] })
  }

  function deleteSlide(id: string) {
    updateData({ slides: slides.filter((s) => s.id !== id) })
  }

  function moveSlide(idx: number, direction: -1 | 1) {
    const target = idx + direction
    if (target < 0 || target >= slides.length) return
    const next = [...slides]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    updateData({ slides: next })
  }

  async function handleImageUpload(slideId: string, file: File) {
    setUploadingSlideId(slideId)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'carousel-images')
      const res = await fetch('/api/super-admin/training/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const { url } = await res.json()
        updateSlide(slideId, { imageUrl: url })
      }
    } finally {
      setUploadingSlideId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Block metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Title</label>
          <input
            type="text"
            value={block.title}
            onChange={(e) => onChange({ ...block, title: e.target.value })}
            className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-calm-50 dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
            placeholder="e.g. Four areas of autistic difference"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Instructions</label>
          <input
            type="text"
            value={block.instructions}
            onChange={(e) => onChange({ ...block, instructions: e.target.value })}
            className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-calm-50 dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
            placeholder="Swipe or use the arrows to move between slides."
          />
        </div>
      </div>

      {/* Read aloud toggle */}
      <label className="flex items-start gap-2 cursor-pointer bg-calm-50 dark:bg-slate-700/40 border border-calm-200 dark:border-slate-700 rounded-lg p-3">
        <input
          type="checkbox"
          checked={data.readAloud ?? false}
          onChange={(e) => updateData({ ...data, readAloud: e.target.checked })}
          className="accent-primary-600 mt-0.5"
        />
        <span className="text-sm text-slate-700 dark:text-slate-200">
          <span className="font-semibold">Add &ldquo;read aloud&rdquo; button</span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">
            Shows a TTS player under the carousel that reads every slide in order.
          </span>
        </span>
      </label>

      {/* Slides */}
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">
          Slides ({slides.length})
        </label>
        <div className="space-y-3">
          {slides.map((slide, idx) => (
            <div
              key={slide.id}
              className="rounded-lg border border-calm-200 dark:border-slate-600 bg-calm-50/50 dark:bg-slate-700/50 p-3 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">Slide {idx + 1}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveSlide(idx, -1)}
                    disabled={idx === 0}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => moveSlide(idx, 1)}
                    disabled={idx === slides.length - 1}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteSlide(slide.id)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded"
                    aria-label="Delete slide"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-0.5">Slide title</label>
                <input
                  type="text"
                  value={slide.title}
                  onChange={(e) => updateSlide(slide.id, { title: e.target.value })}
                  className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-900 dark:text-white"
                  placeholder="e.g. Predictability"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-0.5">Image</label>
                {slide.imageUrl ? (
                  <div className="flex items-center gap-2">
                    <img
                      src={slide.imageUrl}
                      alt=""
                      className="h-16 w-28 object-cover rounded border border-calm-200 dark:border-slate-600"
                    />
                    <button
                      onClick={() => updateSlide(slide.id, { imageUrl: '' })}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      ref={(el) => { fileInputRefs.current[slide.id] = el }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleImageUpload(slide.id, file)
                        e.target.value = ''
                      }}
                    />
                    <button
                      onClick={() => fileInputRefs.current[slide.id]?.click()}
                      disabled={uploadingSlideId === slide.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-calm-300 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-primary-400 dark:hover:border-primary-500 transition-colors disabled:opacity-50"
                    >
                      {uploadingSlideId === slide.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {uploadingSlideId === slide.id ? 'Uploading...' : 'Upload image'}
                    </button>
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-0.5">Body text</label>
                <RichDescriptionEditor
                  value={normaliseBody(slide.body)}
                  onChange={(value) => updateSlide(slide.id, { body: value })}
                  placeholder="What the learner reads on this slide."
                  minHeight={120}
                  ariaLabel={`Slide ${idx + 1} body text`}
                />
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={addSlide}
          className="flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 font-medium mt-2 hover:underline"
        >
          <Plus className="h-4 w-4" /> Add slide
        </button>
      </div>
    </div>
  )
}
