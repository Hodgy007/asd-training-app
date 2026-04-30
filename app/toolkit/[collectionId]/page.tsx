import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ToolkitDocumentActions } from '@/components/toolkit/toolkit-document-actions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TILE_THEMES = [
  { bg: '#FFEDD2', accent: '#F5821F', shape: '#FCAF17' },
  { bg: '#E0F6E5', accent: '#34B44A', shape: '#7DD8A0' },
  { bg: '#DDEEF8', accent: '#056BB0', shape: '#44C7EE' },
  { bg: '#FCE3F2', accent: '#E13CAF', shape: '#F7A8DA' },
  { bg: '#FFF3CC', accent: '#FCAF17', shape: '#FFD84D' },
  { bg: '#E0F4FB', accent: '#44C7EE', shape: '#7BDBF1' },
] as const

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileTypeLabel(fileType: string, fileName: string): string {
  if (fileType.includes('pdf')) return 'PDF'
  if (fileType.includes('word') || fileName.toLowerCase().endsWith('.docx') || fileName.toLowerCase().endsWith('.doc')) return 'Word'
  if (fileType.includes('image')) return 'Image'
  if (fileType.includes('video')) return 'Video'
  if (fileType.includes('spreadsheet') || fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.csv')) return 'Spreadsheet'
  if (fileType.includes('presentation') || fileName.toLowerCase().endsWith('.pptx')) return 'Slides'
  const ext = fileName.split('.').pop()?.toUpperCase()
  return ext || 'File'
}

export default async function ToolkitCollectionPage({
  params,
}: {
  params: { collectionId: string }
}) {
  const collection = await prisma.libraryCollection.findFirst({
    where: {
      id: params.collectionId,
      active: true,
      publishedToToolkit: true,
    },
    select: {
      id: true,
      title: true,
      description: true,
      thumbnailUrl: true,
      documents: {
        where: { active: true },
        select: {
          id: true,
          title: true,
          description: true,
          fileUrl: true,
          fileName: true,
          fileSize: true,
          fileType: true,
          thumbnailUrl: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!collection || collection.documents.length === 0) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-[#FFFBF4] text-[#001522]">
      <header className="sticky top-0 z-30 border-b border-[#FFE5C2] bg-[#FFFBF4]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/toolkit" className="flex items-center gap-3" aria-label="Back to all toolkits">
            <img src="/logo-aaa.svg" alt="" className="h-12 w-auto" />
            <span className="hidden text-base font-bold text-[#001522] sm:inline">Toolkit</span>
          </Link>
          <Link href="/login" className="rounded-full bg-[#001522] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0a2a3d]">Sign in</Link>
        </div>
      </header>

      {/* Hero — colourful, with thumbnail */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-aaa-orange/30 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-[#FCAF17]/40 blur-3xl" aria-hidden="true" />

        <div className="relative mx-auto max-w-6xl px-6 py-14 lg:py-20">
          <Link
            href="/toolkit"
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#475569] shadow-sm transition hover:text-[#001522]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            All toolkits
          </Link>

          <div className="mt-8 grid gap-10 lg:grid-cols-[1.4fr,1fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-aaa-orange/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-aaa-orange">
                <span className="h-2 w-2 rounded-full bg-aaa-orange" />Toolkit
              </span>
              <h1 className="mt-5 text-5xl font-black leading-[1.05] tracking-tight text-[#001522] sm:text-6xl">
                {collection.title}
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#334155]">{collection.description}</p>
              <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#475569] shadow-sm">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {collection.documents.length} {collection.documents.length === 1 ? 'resource' : 'resources'} ready to explore
              </p>
            </div>

            {collection.thumbnailUrl ? (
              <div className="relative">
                <div className="absolute -inset-4 rounded-[36px] bg-gradient-to-br from-aaa-orange/40 to-[#FCAF17]/30 blur-2xl" aria-hidden="true" />
                <div className="relative overflow-hidden rounded-[28px] bg-white shadow-xl">
                  <img src={collection.thumbnailUrl} alt="" className="aspect-[4/3] w-full object-cover" />
                </div>
              </div>
            ) : (
              <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-gradient-to-br from-[#FFEDD2] to-[#FFD09A] shadow-md">
                <div className="absolute -bottom-12 -right-12 h-44 w-44 rounded-full bg-aaa-orange/30" aria-hidden="true" />
                <div className="absolute -top-8 -left-8 h-28 w-28 rounded-full bg-[#FCAF17]/40" aria-hidden="true" />
                <div className="relative flex h-full w-full items-center justify-center">
                  <span className="text-7xl" aria-hidden="true">📦</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Documents grid */}
      <section className="bg-gradient-to-b from-[#FFFBF4] to-[#FFF5E1]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-aaa-orange">Resources</p>
            <h2 className="mt-3 text-3xl font-extrabold text-[#001522] sm:text-4xl">Have a look around</h2>
            <p className="mt-3 text-base leading-relaxed text-[#475569]">
              Pick anything that looks interesting. You can read it here or save it to your device.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {collection.documents.map((doc, index) => {
              const theme = TILE_THEMES[index % TILE_THEMES.length]
              const typeLabel = fileTypeLabel(doc.fileType, doc.fileName)
              return (
                <article
                  key={doc.id}
                  className="group relative flex h-full flex-col overflow-hidden rounded-[24px] bg-white shadow-md transition hover:-translate-y-1 hover:shadow-xl"
                >
                  {/* Cover */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden" style={{ backgroundColor: theme.bg }}>
                    <div className="pointer-events-none absolute -bottom-8 -right-8 h-28 w-28 rounded-full opacity-60" style={{ backgroundColor: theme.shape }} aria-hidden="true" />
                    <div className="pointer-events-none absolute -top-6 -left-6 h-16 w-16 rounded-full opacity-40" style={{ backgroundColor: theme.shape }} aria-hidden="true" />

                    {doc.thumbnailUrl ? (
                      <img
                        src={doc.thumbnailUrl}
                        alt=""
                        className="relative h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="relative flex h-full w-full items-center justify-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/85 shadow-sm">
                          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke={theme.accent} strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      </div>
                    )}

                    {/* File-type badge */}
                    <span
                      className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur"
                      style={{ color: theme.accent }}
                    >
                      {typeLabel}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <h3 className="text-lg font-extrabold leading-snug text-[#001522]">{doc.title}</h3>
                    {doc.description ? (
                      <p className="line-clamp-3 text-sm leading-relaxed text-[#475569]">{doc.description}</p>
                    ) : null}

                    <p className="text-xs font-medium text-[#64748b]">
                      {doc.fileName} · {formatFileSize(doc.fileSize)}
                    </p>

                    <div className="mt-auto pt-2">
                      <ToolkitDocumentActions documentId={doc.id} fileUrl={doc.fileUrl} fileName={doc.fileName} />
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <footer className="bg-[#001522] text-slate-300">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-6 py-10 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center rounded-2xl bg-white p-2"><img src="/logo-aaa.svg" alt="Ambitious about Autism" className="h-10 w-auto" /></div>
            <p className="text-xs text-slate-400">© Ambitious about Autism. Registered charity 1063184.</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/toolkit" className="text-slate-300 transition hover:text-white">All toolkits</Link>
            <Link href="/privacy" className="text-slate-300 transition hover:text-white">Privacy policy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
