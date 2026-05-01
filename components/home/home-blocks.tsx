import Link from 'next/link'
import type { HomeBlock } from '@/lib/home-blocks'

function HeroBlockView({ block }: { block: Extract<HomeBlock, { kind: 'hero' }> }) {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-primary-50 to-white dark:from-slate-800 dark:to-slate-900 p-8 md:p-12 mb-8">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div>
          {block.title && (
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3">
              {block.title}
            </h1>
          )}
          {block.subtitle && (
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-6">{block.subtitle}</p>
          )}
          {block.ctaLabel && block.ctaHref && (
            <Link
              href={block.ctaHref}
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600"
            >
              {block.ctaLabel}
            </Link>
          )}
        </div>
        {block.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={block.imageUrl} alt="" className="w-full h-auto rounded-2xl" />
        )}
      </div>
    </section>
  )
}

function TilesBlockView({ block }: { block: Extract<HomeBlock, { kind: 'tiles' }> }) {
  const colClass =
    block.columns === 4
      ? 'md:grid-cols-2 lg:grid-cols-4'
      : block.columns === 2
        ? 'md:grid-cols-2'
        : 'md:grid-cols-3'

  return (
    <section className={`grid grid-cols-1 ${colClass} gap-4 mb-8`}>
      {block.tiles.map((tile) => {
        const inner = (
          <>
            {tile.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tile.imageUrl} alt="" className="h-12 w-12 mb-3 rounded-xl object-cover" />
            )}
            {tile.title && (
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">{tile.title}</h3>
            )}
            {tile.description && (
              <p className="text-sm text-slate-600 dark:text-slate-300">{tile.description}</p>
            )}
          </>
        )
        const cardClass =
          'block rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 hover:border-primary-300 dark:hover:border-primary-600 transition-colors'

        return tile.href ? (
          <Link key={tile.id} href={tile.href} className={cardClass}>
            {inner}
          </Link>
        ) : (
          <div key={tile.id} className={cardClass}>
            {inner}
          </div>
        )
      })}
    </section>
  )
}

function RichTextBlockView({ block }: { block: Extract<HomeBlock, { kind: 'richText' }> }) {
  return (
    <section
      className="prose dark:prose-invert max-w-none mb-8 home-content"
      dangerouslySetInnerHTML={{ __html: block.html }}
    />
  )
}

function ImageBlockView({ block }: { block: Extract<HomeBlock, { kind: 'image' }> }) {
  if (!block.src) return null
  // eslint-disable-next-line @next/next/no-img-element
  const img = <img src={block.src} alt={block.alt} className="w-full h-auto rounded-2xl" />
  return (
    <section className="mb-8">
      {block.href ? (
        <Link href={block.href} className="block">
          {img}
        </Link>
      ) : (
        img
      )}
    </section>
  )
}

function VideoBlockView({ block }: { block: Extract<HomeBlock, { kind: 'video' }> }) {
  if (!block.src) return null
  return (
    <section className="mb-8">
      <video
        controls
        className="w-full h-auto rounded-2xl bg-black"
        src={block.src}
        poster={block.poster || undefined}
      />
    </section>
  )
}

export function HomeBlocksRenderer({ blocks }: { blocks: HomeBlock[] }) {
  if (!blocks.length) return null
  return (
    <>
      {blocks.map((block) => {
        switch (block.kind) {
          case 'hero': return <HeroBlockView key={block.id} block={block} />
          case 'tiles': return <TilesBlockView key={block.id} block={block} />
          case 'richText': return <RichTextBlockView key={block.id} block={block} />
          case 'image': return <ImageBlockView key={block.id} block={block} />
          case 'video': return <VideoBlockView key={block.id} block={block} />
        }
      })}
    </>
  )
}
