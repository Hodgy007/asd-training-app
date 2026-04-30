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

async function trackEvent(documentId: string, action: 'view' | 'download') {
  try {
    await fetch(`/api/toolkit/documents/${documentId}/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
  } catch {
    // non-blocking
  }
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
    <div className="courses-public min-h-screen bg-[#ffffff] text-[#001522]">
      <style dangerouslySetInnerHTML={{ __html: `.courses-public .text-white { color: #ffffff; }` }} />

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-[#ffffff]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/toolkit" className="flex items-center gap-3">
            <img src="/logo-aaa.svg" alt="" className="h-12 w-auto" />
          </Link>
          <Link href="/login" className="rounded-full bg-[#001522] px-5 py-2.5 text-sm font-semibold text-white">Sign in</Link>
        </div>
      </header>

      <section className="bg-[#001522] text-white p-10">
        <h1 className="text-4xl font-bold">{collection.title}</h1>
        <p className="mt-4 text-slate-300">{collection.description}</p>
      </section>

      <section className="bg-[#f8fafc] p-10">
        <div className="grid gap-5">
          {collection.documents.map((doc) => (
            <article key={doc.id} className="bg-white p-6 rounded-xl">
              <h3 className="text-xl font-bold">{doc.title}</h3>
              <p className="text-sm text-slate-500">{doc.description}</p>

              <div className="mt-4 flex gap-3">
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent(doc.id, 'view')}
                  className="bg-orange-500 text-white px-4 py-2 rounded"
                >
                  Open
                </a>
                <a
                  href={doc.fileUrl}
                  download
                  onClick={() => trackEvent(doc.id, 'download')}
                  className="border px-4 py-2 rounded"
                >
                  Download
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
