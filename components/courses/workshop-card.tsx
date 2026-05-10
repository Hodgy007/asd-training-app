interface WorkshopCardProps {
  name: string
  description: string | null
  imageUrl: string | null
  startsAt: Date
  venue: string | null
  ticketUrl: string
  priceText: string | null
  soldOut: boolean
  accentHex?: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function WorkshopCard({
  name,
  description,
  imageUrl,
  startsAt,
  venue,
  ticketUrl,
  priceText,
  soldOut,
  accentHex = '#f5821f',
}: WorkshopCardProps) {
  const day = startsAt.getDate()
  const month = MONTHS[startsAt.getMonth()]
  const year = startsAt.getFullYear()
  const time = startsAt.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#ffffff] shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      {imageUrl ? (
        <div className="relative h-40 w-full overflow-hidden bg-slate-100">
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div
            className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-xl bg-[#ffffff]/95 px-3 py-2 shadow-sm"
            style={{ borderLeft: `3px solid ${accentHex}` }}
          >
            <div className="leading-none">
              <p className="text-2xl font-bold text-[#001522]">{day}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#475569]">
                {month} {year}
              </p>
            </div>
          </div>
          {soldOut ? (
            <span className="absolute top-3 right-3 inline-flex items-center rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
              Sold out
            </span>
          ) : null}
        </div>
      ) : (
        <div
          className="relative flex h-40 items-center justify-center overflow-hidden text-white"
          style={{ backgroundColor: accentHex }}
        >
          <div className="text-center leading-none">
            <p className="text-5xl font-bold">{day}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em]">
              {month} {year}
            </p>
          </div>
          {soldOut ? (
            <span className="absolute top-3 right-3 inline-flex items-center rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
              Sold out
            </span>
          ) : null}
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
        <div
          className="mb-3 inline-flex items-center self-start gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ backgroundColor: `${accentHex}1a`, color: accentHex }}
        >
          Live workshop
        </div>
        <h3 className="text-lg font-bold text-[#001522]">{name}</h3>
        <div className="mt-2 space-y-1 text-xs text-[#475569]">
          <p>
            <span className="font-semibold text-[#334155]">When</span> · {time}
          </p>
          {venue ? (
            <p className="line-clamp-1">
              <span className="font-semibold text-[#334155]">Where</span> · {venue}
            </p>
          ) : null}
        </div>
        {description ? (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[#475569]">
            {description}
          </p>
        ) : null}
        <div className="mt-auto pt-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#64748b]">
                Booked on Eventbrite
              </p>
              <p className="mt-1 text-2xl font-bold text-[#001522]">
                {priceText ?? 'Free'}
              </p>
            </div>
            <a
              href={ticketUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ backgroundColor: accentHex }}
            >
              {soldOut ? 'View on Eventbrite' : 'Book on Eventbrite'}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </article>
  )
}
