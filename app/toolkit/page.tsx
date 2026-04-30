import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ACCENT_CYCLE = [
  '#f5821f',
  '#34b44a',
  '#056bb0',
  '#e13caf',
  '#fcaf17',
  '#44c7ee',
] as const

function TrustItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-3"><span className="mt-0.5 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-aaa-orange/10 text-aaa-orange" aria-hidden="true"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></span><div><p className="text-sm font-semibold text-[#001522]">{title}</p><p className="mt-0.5 text-xs text-[#475569]">{description}</p></div></div>
  )
}

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-aaa-orange">{eyebrow}</p><h2 className="mt-3 text-3xl font-bold leading-tight text-[#001522] sm:text-4xl">{title}</h2>{description ? <p className="mt-3 text-base leading-relaxed text-[#475569]">{description}</p> : null}</div>
}

function ToolkitTile({ collection, accentHex }: { collection: { id: string; title: string; description: string; thumbnailUrl: string | null; _count: { documents: number } }; accentHex: string }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#ffffff] shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="h-2 w-full" style={{ backgroundColor: accentHex }} aria-hidden="true" />
      {collection.thumbnailUrl ? <div className="aspect-[16/9] w-full overflow-hidden bg-[#f8fafc]"><img src={collection.thumbnailUrl} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /></div> : <div className="flex aspect-[16/9] w-full items-center justify-center bg-[#f8fafc]"><div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: accentHex }} aria-hidden="true"><svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg></div></div>}
      <div className="flex flex-1 flex-col p-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#64748b]">Toolkit</p><h3 className="mt-2 text-lg font-bold text-[#001522]">{collection.title}</h3><p className="mt-2 line-clamp-4 text-sm leading-relaxed text-[#475569]">{collection.description}</p><div className="mt-auto pt-6"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wider text-[#64748b]">Included</p><p className="mt-1 text-2xl font-bold text-[#001522]">Free</p></div><Link href={`/toolkit/${collection.id}`} className="inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ backgroundColor: accentHex }}>Open toolkit<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></Link></div><p className="mt-3 text-xs text-[#64748b]">{collection._count.documents} document{collection._count.documents === 1 ? '' : 's'} available</p></div></div>
    </article>
  )
}

export default async function ToolkitPage() {
  const collections = await prisma.libraryCollection.findMany({
    where: { active: true, publishedToToolkit: true, documents: { some: { active: true } } },
    select: { id: true, title: true, description: true, thumbnailUrl: true, _count: { select: { documents: { where: { active: true } } } } },
    orderBy: { title: 'asc' },
  })

  return (
    <div className="courses-public min-h-screen bg-[#ffffff] text-[#001522]">
      <style dangerouslySetInnerHTML={{ __html: `.courses-public .text-\\[\\#001522\\] { color: #001522; }.courses-public .text-\\[\\#334155\\] { color: #334155; }.courses-public .text-\\[\\#475569\\] { color: #475569; }.courses-public .text-\\[\\#64748b\\] { color: #64748b; }.courses-public .text-white { color: #ffffff; }.courses-public .text-slate-300 { color: #cbd5e1; }.courses-public .text-slate-400 { color: #94a3b8; }.courses-public .text-aaa-orange { color: #f5821f; }.courses-public .text-aaa-orange-light { color: #fcaf17; }.courses-public .hover\\:text-white:hover { color: #ffffff; }.courses-public .hover\\:text-\\[\\#001522\\]:hover { color: #001522; }` }} />
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-[#ffffff]/95 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4"><Link href="/toolkit" className="flex items-center gap-3" aria-label="Ambitious about Autism — Toolkit"><img src="/logo-aaa.svg" alt="" className="h-12 w-auto" /><span className="hidden text-sm font-semibold text-[#334155] sm:inline">Toolkit</span></Link><nav className="flex items-center gap-1 sm:gap-3"><Link href="/courses" className="hidden px-3 py-2 text-sm font-medium text-[#475569] hover:text-[#001522] md:inline-block">Courses</Link><a href="#toolkits" className="hidden px-3 py-2 text-sm font-medium text-[#475569] hover:text-[#001522] md:inline-block">Toolkits</a><Link href="/login" className="inline-flex items-center justify-center rounded-full bg-[#001522] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a2a3d]">Sign in</Link></nav></div></header>
      <section className="relative overflow-hidden bg-[#001522] text-white"><div className="pointer-events-none absolute -top-32 -right-32 h-[30rem] w-[30rem] rounded-full bg-aaa-orange/30 blur-3xl" aria-hidden="true" /><div className="relative mx-auto max-w-6xl px-6 py-20 lg:py-28"><div className="max-w-3xl"><span className="inline-flex items-center gap-2 rounded-full border border-aaa-orange/40 bg-aaa-orange/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-aaa-orange-light"><span className="h-1.5 w-1.5 rounded-full bg-aaa-orange" />Ambitious about Autism · Toolkit</span><h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">Free practical resources in one accessible <span className="text-aaa-orange">toolkit</span>.</h1><p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">Browse free document-library collections published as toolkit tiles. No checkout, no Stripe connection and no payment step required.</p><div className="mt-9 flex flex-wrap gap-3"><a href="#toolkits" className="inline-flex items-center justify-center gap-2 rounded-full bg-aaa-orange px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-aaa-orange/30 transition hover:brightness-110">Browse toolkits<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></a></div></div></div></section>
      <section className="border-b border-slate-200 bg-[#f8fafc]"><div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-10 sm:grid-cols-2 lg:grid-cols-4"><TrustItem title="Free access" description="Published resources are available without payment." /><TrustItem title="Document led" description="Each tile is powered by a document-library collection." /><TrustItem title="Easy to update" description="Manage content from the existing library admin area." /><TrustItem title="Accessible" description="Clear descriptions, thumbnails and direct downloads." /></div></section>
      <section id="toolkits" className="bg-[#f8fafc]"><div className="mx-auto max-w-6xl px-6 py-20"><SectionHeader eyebrow="Free toolkits" title="Browse document-library toolkits" description="Collections are shown only after they are active and explicitly published to the toolkit." />{collections.length === 0 ? <div className="mt-10 rounded-3xl border-2 border-dashed border-slate-300 bg-[#ffffff] p-12 text-center"><p className="text-base text-[#475569]">No toolkits are currently published. Please check back soon.</p></div> : <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{collections.map((collection, index) => <ToolkitTile key={collection.id} collection={collection} accentHex={ACCENT_CYCLE[index % ACCENT_CYCLE.length]} />)}</div>}</div></section>
      <footer className="bg-[#001522] text-slate-300"><div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-3"><div><div className="inline-flex items-center rounded-xl bg-[#ffffff] p-3"><img src="/logo-aaa.svg" alt="Ambitious about Autism" className="h-12 w-auto" /></div><p className="mt-5 max-w-sm text-sm leading-relaxed text-slate-400">Ambitious about Autism is the national charity for autistic children and young people.</p></div><div><h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white">Toolkit</h3><ul className="mt-4 space-y-2.5 text-sm"><li><a href="#toolkits" className="text-slate-300 transition hover:text-white">Browse toolkits</a></li><li><Link href="/courses" className="text-slate-300 transition hover:text-white">Courses</Link></li></ul></div><div><h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white">Platform</h3><ul className="mt-4 space-y-2.5 text-sm"><li><Link href="/login" className="text-slate-300 transition hover:text-white">Sign in</Link></li><li><Link href="/privacy" className="text-slate-300 transition hover:text-white">Privacy policy</Link></li></ul></div></div><div className="border-t border-white/10"><div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-6 py-6 text-xs text-slate-400 sm:flex-row sm:items-center"><p>© Ambitious about Autism. Registered charity 1063184.</p><p>Free resources. No payment required.</p></div></div></footer>
    </div>
  )
}
