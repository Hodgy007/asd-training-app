import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileLabel(fileType: string, fileName: string): string {
  if (fileType) return fileType.split('/').pop()?.toUpperCase() || fileType
  const ext = fileName.split('.').pop()
  return ext ? ext.toUpperCase() : 'FILE'
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
    <div className="courses-public min-h-screen bg-[#ffffff] text-[#001522]">
      <style
        dangerouslySetInnerHTML={{
          __html: `
.courses-public .text-\\[\\#001522\\] { color: #001522; }
.courses-public .text-\\[\\#334155\\] { color: #334155; }
.courses-public .text-\\[\\#475569\\] { color: #475569; }
.courses-public .text-\\[\\#64748b\\] { color: #64748b; }
.courses-public .text-white { color: #ffffff; }
.courses-public .text-slate-300 { color: #cbd5e1; }
.courses-public .text-slate-400 { color: #94a3b8; }
.courses-public .text-aaa-orange { color: #f5821f; }
.courses-public .text-aaa-orange-light { color: #fcaf17; }
.courses-public .hover\\:text-white:hover { color: #ffffff; }
.courses-public .hover\\:text-\\[\\#001522\\]:hover { color: #001522; }
        `,
        }}
      />

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-[#ffffff]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/toolkit" className="flex items-center gap-3" aria-label="Ambitious about Autism — Toolkit">
            <img src="/logo-aaa.svg" alt="" className="h-12 w-auto" />
            <span className="hidden text-sm font-semibold text-[#334155] sm:inline">Toolkit</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-3">
            <Link href="/toolkit" className="hidden px-3 py-2 text-sm font-medium text-[#475569] hover:text-[#001522] md:inline-block">
              All toolkits
            </Link>
            <Link href="/courses" className="hidden px-3 py-2 text-sm font-medium text-[#475569] hover:text-[#001522] md:inline-block">
              Courses
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center rounded-full bg-[#001522] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a2a3d]">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#001522] text-white">
        <div className="pointer-events-none absolute -top-32 -right-32 h-[30rem] w-[30rem] rounded-full bg-aaa-orange/30 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:py-24">
          <div>
            <Link href="/toolkit" className="inline-flex items-center gap-2 text-sm font-semibold text-aaa-orange-light transition hover:text-white">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              Back to all toolkits
            </Link>
            <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-aaa-orange/40 bg-aaa-orange/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-aaa-orange-light">
              <span className="h-1.5 w-1.5 rounded-full bg-aaa-orange" />
              Free toolkit
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              {collection.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
              {collection.description}
            </p>
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-aaa-orange-light">
              {collection.documents.length} free document{collection.documents.length === 1 ? '' : 's'}
            </p>
          </div>
          {collection.thumbnailUrl ? (
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl">
              <img src={collection.thumbnailUrl} alt="" className="aspect-[4/3] h-full w-full object-cover" />
            </div>
          ) : null}
        </div>
      </section>

      <section className="bg-[#f8fafc]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-aaa-orange">Documents</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight text-[#001522] sm:text-4xl">Open or download resources</h2>
            <p className="mt-3 text-base leading-relaxed text-[#475569]">
              These resources are free to access. No checkout or payment is required.
            </p>
          </div>

          <div className="grid gap-5">
            {collection.documents.map((doc) => (
              <article key={doc.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-[#ffffff] shadow-sm transition hover:shadow-md">
                <div className="flex flex-col gap-0 sm:flex-row">
                  {doc.thumbnailUrl ? (
                    <div className="h-48 w-full flex-shrink-0 overflow-hidden bg-[#f8fafc] sm:h-auto sm:w-48">
                      <img src={doc.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-48 w-full flex-shrink-0 items-center justify-center bg-[#f8fafc] sm:h-auto sm:w-48">
                      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-aaa-orange text-white" aria-hidden="true">
                        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#64748b]">
                      <span>{fileLabel(doc.fileType, doc.fileName)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatFileSize(doc.fileSize)}</span>
                    </div>
                    <h3 className="mt-2 text-xl font-bold text-[#001522]">{doc.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#475569]">{doc.description}</p>
                    <p className="mt-3 text-xs text-[#64748b]">{doc.fileName}</p>
                    <div className="mt-auto flex flex-wrap gap-3 pt-6">
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-full bg-aaa-orange px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
                      >
                        Open document
                      </a>
                      <a
                        href={doc.fileUrl}
                        download
                        className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-[#ffffff] px-5 py-2.5 text-sm font-semibold text-[#001522] transition hover:bg-[#f8fafc]"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-[#001522] text-slate-300">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-10 sm:flex-row sm:items-center">
          <div>
            <img src="/logo-aaa.svg" alt="Ambitious about Autism" className="h-12 w-auto rounded-xl bg-white p-2" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              Free document-library toolkit resources from Ambitious about Autism.
            </p>
          </div>
          <Link href="/toolkit" className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
            Browse all toolkits
          </Link>
        </div>
      </footer>
    </div>
  )
}
