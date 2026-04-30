import Link from 'next/link'
import { prisma } from '@/lib/prisma'

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

function FunFact({ emoji, title, description }: { emoji: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4 rounded-3xl bg-white px-5 py-4 shadow-sm">
      <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-aaa-orange/15 text-2xl" aria-hidden="true">{emoji}</span>
      <div>
        <p className="text-base font-bold text-[#001522]">{title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-[#475569]">{description}</p>
      </div>
    </div>
  )
}

function ToolkitTile({
  collection,
  theme,
}: {
  collection: { id: string; title: string; description: string; thumbnailUrl: string | null; _count: { documents: number } }
  theme: typeof TILE_THEMES[number]
}) {
  return (
    <Link
      href={`/toolkit/${collection.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-[28px] bg-white shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
      style={{ outlineColor: theme.accent }}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden" style={{ backgroundColor: theme.bg }}>
        {/* Decorative shapes */}
        <div className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full opacity-60" style={{ backgroundColor: theme.shape }} aria-hidden="true" />
        <div className="pointer-events-none absolute -top-6 -left-6 h-20 w-20 rounded-full opacity-40" style={{ backgroundColor: theme.shape }} aria-hidden="true" />

        {collection.thumbnailUrl ? (
          <img
            src={collection.thumbnailUrl}
            alt=""
            className="relative h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="relative flex h-full w-full items-center justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/80 shadow-sm">
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke={theme.accent} strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-6">
        <span
          className="inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
          style={{ backgroundColor: `${theme.accent}1A`, color: theme.accent }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.accent }} />Toolkit
        </span>
        <h3 className="text-2xl font-extrabold leading-tight text-[#001522]">{collection.title}</h3>
        <p className="line-clamp-3 text-sm leading-relaxed text-[#475569]">{collection.description}</p>

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#475569]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {collection._count.documents} {collection._count.documents === 1 ? 'resource' : 'resources'}
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-white shadow-sm transition group-hover:translate-x-1"
            style={{ backgroundColor: theme.accent }}
          >
            Open
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  )
}

export default async function ToolkitPage() {
  const collections = await prisma.libraryCollection.findMany({
    where: { active: true, publishedToToolkit: true, documents: { some: { active: true } } },
    select: { id: true, title: true, description: true, thumbnailUrl: true, _count: { select: { documents: { where: { active: true } } } } },
    orderBy: { title: 'asc' },
  })

  return (
    <div className="min-h-screen bg-[#FFFBF4] text-[#001522]">
      <header className="sticky top-0 z-30 border-b border-[#FFE5C2] bg-[#FFFBF4]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/toolkit" className="flex items-center gap-3" aria-label="Ambitious about Autism — Toolkit">
            <img src="/logo-aaa.svg" alt="" className="h-12 w-auto" />
            <span className="hidden text-base font-bold text-[#001522] sm:inline">Toolkit</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <a href="#toolkits" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[#475569] transition hover:bg-white hover:text-[#001522] md:inline-block">Browse</a>
            <Link href="/courses" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[#475569] transition hover:bg-white hover:text-[#001522] md:inline-block">Courses</Link>
            <Link href="/login" className="inline-flex items-center justify-center rounded-full bg-[#001522] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0a2a3d]">Sign in</Link>
          </nav>
        </div>
      </header>

      {/* Hero — bright, friendly, big */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-aaa-orange/30 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-[#FCAF17]/40 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute top-20 right-1/4 h-12 w-12 rotate-12 rounded-2xl bg-[#34B44A]/30" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-20 left-1/3 h-16 w-16 -rotate-6 rounded-full bg-[#E13CAF]/25" aria-hidden="true" />

        <div className="relative mx-auto max-w-6xl px-6 py-20 lg:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-aaa-orange shadow-sm">
              <span className="h-2 w-2 rounded-full bg-aaa-orange" />Free for everyone
            </span>
            <h1 className="mt-6 text-5xl font-black leading-[1.05] tracking-tight text-[#001522] sm:text-6xl lg:text-7xl">
              Cool stuff to help you <span className="relative inline-block"><span className="relative z-10 text-aaa-orange">explore</span><span className="absolute bottom-1 left-0 z-0 h-3 w-full rounded-full bg-[#FCAF17]/60" aria-hidden="true" /></span>, learn and grow.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#334155]">
              The toolkit is a friendly place full of free guides, activity packs and resources. Pick a tile, peek inside and download anything you like — no sign-in needed.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#toolkits" className="inline-flex items-center justify-center gap-2 rounded-full bg-aaa-orange px-7 py-4 text-base font-bold text-white shadow-lg shadow-aaa-orange/30 transition hover:scale-[1.02]">
                Show me the toolkits
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </a>
              <Link href="/courses" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-base font-bold text-[#001522] shadow-sm transition hover:bg-[#FFEDD2]">
                Or see the courses
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="bg-[#FFFBF4]">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-6 pb-14 sm:grid-cols-2 lg:grid-cols-4">
          <FunFact emoji="🎈" title="100% free" description="No payment, no checkout — open and download." />
          <FunFact emoji="📚" title="Picked for you" description="Each tile is a curated bundle of friendly resources." />
          <FunFact emoji="🌈" title="Easy to read" description="Plain language and clear pictures throughout." />
          <FunFact emoji="🤝" title="Made with care" description="Designed alongside autistic young people." />
        </div>
      </section>

      {/* Toolkit grid */}
      <section id="toolkits" className="bg-gradient-to-b from-[#FFFBF4] to-[#FFF5E1]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-aaa-orange">Free toolkits</p>
            <h2 className="mt-3 text-4xl font-extrabold leading-tight text-[#001522] sm:text-5xl">Pick a tile to begin</h2>
            <p className="mt-4 text-base leading-relaxed text-[#475569]">
              Every tile opens up a set of resources you can read online or save to your device. Take your time — there is no rush.
            </p>
          </div>

          {collections.length === 0 ? (
            <div className="mt-12 rounded-3xl border-2 border-dashed border-[#FFD09A] bg-white p-12 text-center">
              <span className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-aaa-orange/10 text-3xl" aria-hidden="true">🛠️</span>
              <p className="text-lg font-semibold text-[#001522]">New toolkits are on the way!</p>
              <p className="mt-2 text-sm text-[#475569]">Check back soon — we are putting together some lovely things for you.</p>
            </div>
          ) : (
            <div className="mt-12 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {collections.map((collection, index) => (
                <ToolkitTile
                  key={collection.id}
                  collection={collection}
                  theme={TILE_THEMES[index % TILE_THEMES.length]}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="bg-[#001522] text-slate-300">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-3">
          <div>
            <div className="inline-flex items-center rounded-2xl bg-white p-3"><img src="/logo-aaa.svg" alt="Ambitious about Autism" className="h-12 w-auto" /></div>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-slate-400">Ambitious about Autism is the national charity for autistic children and young people.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white">Toolkit</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><a href="#toolkits" className="text-slate-300 transition hover:text-white">Browse toolkits</a></li>
              <li><Link href="/courses" className="text-slate-300 transition hover:text-white">Courses</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white">Platform</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link href="/login" className="text-slate-300 transition hover:text-white">Sign in</Link></li>
              <li><Link href="/privacy" className="text-slate-300 transition hover:text-white">Privacy policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-6 py-6 text-xs text-slate-400 sm:flex-row sm:items-center">
            <p>© Ambitious about Autism. Registered charity 1063184.</p>
            <p>Free resources. No payment required.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
