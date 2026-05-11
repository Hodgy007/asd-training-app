/**
 * Thin REST client for the Eventbrite v3 API.
 *
 * Auth: Bearer token = the charity's Private Token from Eventbrite Account
 * Settings → Developer Links → API Keys. One token per charity, account-wide.
 * Stored on CharityEventbriteConfig.privateToken.
 *
 * Endpoints used:
 *   GET    /v3/users/me/                              — token verification
 *   GET    /v3/events/{id}/?expand=...                — single event detail
 *   GET    /v3/events/{id}/attendees/?page=N          — paginated attendees
 *   POST   /v3/webhooks/                              — register account webhook
 *   DELETE /v3/webhooks/{id}/                         — revoke webhook
 *
 * Higher-level "sync to DB" operations live in lib/eventbrite-sync.ts.
 */

import { prisma } from '@/lib/prisma'

export const EVENTBRITE_API_BASE = 'https://www.eventbriteapi.com/v3'

// ─── Types — only the fields we read ────────────────────────────────────────

export interface EventbriteEvent {
  id: string
  name: { text: string; html?: string }
  description?: { text: string | null; html?: string | null }
  url: string
  start: { utc: string; timezone: string }
  end?: { utc: string; timezone: string }
  capacity?: number | null
  status: 'draft' | 'live' | 'started' | 'ended' | 'completed' | 'canceled'
  venue?: {
    name?: string | null
    address?: {
      localized_address_display?: string | null
    } | null
  } | null
  logo?: { url: string | null; original?: { url: string | null } | null } | null
  ticket_classes?: Array<{
    id: string
    name: string
    free: boolean
    cost?: { display: string } | null
    quantity_total?: number | null
    quantity_sold?: number | null
    on_sale_status?: string | null
  }>
}

export interface EventbriteAttendee {
  id: string
  order_id: string
  status: string // 'Attending' | 'Not Attending' | 'Deleted' | 'Checked In' ...
  cancelled: boolean
  refunded: boolean
  checked_in: boolean
  profile: {
    name?: string | null
    email: string
    first_name?: string | null
    last_name?: string | null
  }
  event_id: string
  ticket_class_id?: string | null
  created: string
  changed: string
}

interface AttendeesResponse {
  pagination: {
    object_count: number
    page_number: number
    page_size: number
    page_count: number
    has_more_items: boolean
    continuation?: string
  }
  attendees: EventbriteAttendee[]
}

export interface EventbriteOrder {
  id: string
  event_id: string
  status: string // 'placed' | 'refunded' | 'transferred' | 'deleted' | 'pending'
  email: string
  name?: string | null
  first_name?: string | null
  last_name?: string | null
  created: string
  changed: string
  attendees?: EventbriteAttendee[]
}

export interface EventbriteWebhook {
  id: string
  endpoint_url: string
  actions: string[]
  resource_uri: string
}

export interface EventbriteWebhookPayload {
  api_url: string
  config: {
    action: string
    endpoint_url: string
    user_id?: string
    webhook_id: string
  }
}

// ─── Errors ─────────────────────────────────────────────────────────────────

export class EventbriteError extends Error {
  status: number
  body: unknown
  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'EventbriteError'
    this.status = status
    this.body = body
  }
}

// ─── Config + token loading ─────────────────────────────────────────────────

export async function getEventbriteConfig() {
  return prisma.charityEventbriteConfig.findFirst()
}

/** Returns the configured Private Token or throws if integration not set up. */
export async function requireEventbriteToken(): Promise<string> {
  const config = await getEventbriteConfig()
  if (!config?.privateToken) {
    throw new EventbriteError(
      'Eventbrite integration is not configured.',
      503,
      null,
    )
  }
  return config.privateToken
}

// ─── URL parsing ────────────────────────────────────────────────────────────

/**
 * Extract the numeric event id from any Eventbrite event URL.
 * Eventbrite URL format: ".../e/<slug>-tickets-<eventId>?..."
 * Returns null if no id can be parsed.
 */
export function parseEventbriteUrl(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Plain numeric id
  if (/^\d{6,}$/.test(trimmed)) return trimmed

  // URL form
  try {
    const url = new URL(trimmed)
    if (!/eventbrite\.[a-z.]+$/i.test(url.hostname)) return null
    // Match the trailing numeric id in the path: /e/...-tickets-1014447087547
    const match = url.pathname.match(/-(\d{6,})\/?$/)
    if (match) return match[1]
    // Some URLs use /e/<id>
    const direct = url.pathname.match(/\/e\/(\d{6,})/)
    if (direct) return direct[1]
    return null
  } catch {
    return null
  }
}

// ─── Core HTTP ──────────────────────────────────────────────────────────────

interface RequestOpts {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | undefined>
}

async function request<T>(
  path: string,
  token: string,
  opts: RequestOpts = {},
): Promise<T> {
  const url = new URL(`${EVENTBRITE_API_BASE}${path}`)
  if (opts.query) {
    for (const [key, value] of Object.entries(opts.query)) {
      if (value === undefined) continue
      url.searchParams.set(key, String(value))
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  }
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  })

  if (!res.ok) {
    let body: unknown = null
    try {
      body = await res.json()
    } catch {
      body = await res.text().catch(() => null)
    }
    throw new EventbriteError(
      `Eventbrite API ${res.status} on ${opts.method ?? 'GET'} ${path}`,
      res.status,
      body,
    )
  }

  // 204 No Content (e.g. DELETE)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

// ─── Operations ─────────────────────────────────────────────────────────────

/** Fetches the authenticated user — cheap call to verify the token works. */
export async function verifyToken(token: string): Promise<{ id: string; name?: string; email?: string }> {
  return request('/users/me/', token)
}

export async function fetchEvent(eventId: string, token: string): Promise<EventbriteEvent> {
  return request<EventbriteEvent>(`/events/${eventId}/`, token, {
    query: { expand: 'venue,ticket_classes,logo' },
  })
}

interface UserEventsResponse {
  pagination: {
    object_count: number
    page_number: number
    page_size: number
    page_count: number
    has_more_items: boolean
    continuation?: string
  }
  events: EventbriteEvent[]
}

/**
 * List events owned by the authenticated Eventbrite user. Pages through
 * Eventbrite's `continuation` cursor; capped at 200 events as a safety net.
 * Defaults to `status=live` ordered ascending by start date.
 */
export async function listOwnEvents(
  token: string,
  opts: { status?: 'live' | 'draft' | 'started' | 'ended' | 'all'; orderBy?: 'start_asc' | 'start_desc' } = {},
): Promise<EventbriteEvent[]> {
  const status = opts.status ?? 'live'
  const orderBy = opts.orderBy ?? 'start_asc'
  const out: EventbriteEvent[] = []
  let continuation: string | undefined
  for (let safetyHops = 0; safetyHops < 5; safetyHops++) {
    const page: UserEventsResponse = await request('/users/me/events/', token, {
      query: {
        status,
        order_by: orderBy,
        expand: 'venue,logo,ticket_classes',
        page_size: 50,
        continuation,
      },
    })
    out.push(...page.events)
    if (out.length >= 200) break
    if (!page.pagination.has_more_items || !page.pagination.continuation) break
    continuation = page.pagination.continuation
  }
  return out.slice(0, 200)
}

/** Fetch ALL attendees for an event, paginating through Eventbrite continuations. */
export async function fetchAllAttendees(
  eventId: string,
  token: string,
  opts: { changedSince?: string } = {},
): Promise<EventbriteAttendee[]> {
  const out: EventbriteAttendee[] = []
  let continuation: string | undefined
  // Hard cap to prevent runaway loops on malformed responses.
  for (let safetyHops = 0; safetyHops < 50; safetyHops++) {
    const page: AttendeesResponse = await request(
      `/events/${eventId}/attendees/`,
      token,
      {
        query: {
          page_size: 100,
          continuation,
          changed_since: opts.changedSince,
        },
      },
    )
    out.push(...page.attendees)
    if (!page.pagination.has_more_items || !page.pagination.continuation) break
    continuation = page.pagination.continuation
  }
  return out
}

export async function fetchOrder(orderId: string, token: string): Promise<EventbriteOrder> {
  return request<EventbriteOrder>(`/orders/${orderId}/`, token, {
    query: { expand: 'attendees' },
  })
}

export async function fetchAttendee(
  eventId: string,
  attendeeId: string,
  token: string,
): Promise<EventbriteAttendee> {
  return request<EventbriteAttendee>(
    `/events/${eventId}/attendees/${attendeeId}/`,
    token,
  )
}

/**
 * Fetch an arbitrary Eventbrite resource by its api_url (as returned in
 * webhook payloads). We validate the host before calling.
 */
export async function fetchByApiUrl<T>(apiUrl: string, token: string): Promise<T> {
  const url = new URL(apiUrl)
  if (url.host !== 'www.eventbriteapi.com') {
    throw new EventbriteError(
      `Refusing to fetch non-Eventbrite host: ${url.host}`,
      400,
      null,
    )
  }
  // Append expand=attendees for orders so attendee details come along.
  if (url.pathname.includes('/orders/') && !url.searchParams.has('expand')) {
    url.searchParams.set('expand', 'attendees')
  }
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    let body: unknown = null
    try {
      body = await res.json()
    } catch {
      body = await res.text().catch(() => null)
    }
    throw new EventbriteError(
      `Eventbrite API ${res.status} on api_url ${url.pathname}`,
      res.status,
      body,
    )
  }
  return (await res.json()) as T
}

export async function registerWebhook(
  endpointUrl: string,
  actions: string[],
  token: string,
  eventId?: string,
): Promise<EventbriteWebhook> {
  return request<EventbriteWebhook>('/webhooks/', token, {
    method: 'POST',
    body: {
      endpoint_url: endpointUrl,
      actions: actions.join(','),
      ...(eventId ? { event_id: eventId } : {}),
    },
  })
}

export async function deleteWebhook(webhookId: string, token: string): Promise<void> {
  await request<void>(`/webhooks/${webhookId}/`, token, { method: 'DELETE' })
}

/** Default set of webhook actions our integration cares about. */
export const DEFAULT_WEBHOOK_ACTIONS = [
  'order.placed',
  'order.refunded',
  'order.updated',
  'attendee.updated',
  'attendee.checked_in',
  'event.updated',
  'event.unpublished',
] as const

// ─── Helpers for mapping Eventbrite → ExternalWorkshop fields ───────────────

/** Map Eventbrite event status (lowercase) to our string status. */
export function mapEventStatus(
  eventbriteStatus: EventbriteEvent['status'],
): 'LIVE' | 'DRAFT' | 'CANCELLED' | 'COMPLETED' {
  switch (eventbriteStatus) {
    case 'live':
    case 'started':
      return 'LIVE'
    case 'draft':
      return 'DRAFT'
    case 'canceled':
      return 'CANCELLED'
    case 'ended':
    case 'completed':
      return 'COMPLETED'
    default:
      return 'LIVE'
  }
}

/** Build a free-form display string from ticket_classes. */
export function formatPriceText(event: EventbriteEvent): string | null {
  const tickets = event.ticket_classes ?? []
  if (tickets.length === 0) return null
  if (tickets.every((t) => t.free)) return 'Free'

  const paid = tickets.filter((t) => !t.free && t.cost?.display)
  if (paid.length === 0) return null
  if (paid.length === 1) return paid[0].cost!.display

  const displays = paid.map((t) => t.cost!.display)
  const unique = Array.from(new Set(displays))
  if (unique.length === 1) return unique[0]
  // Eventbrite display strings already include the currency symbol —
  // join the lowest and highest with an en-dash.
  return `${unique[0]} – ${unique[unique.length - 1]}`
}

/** Are total tickets sold == total tickets available? */
export function isSoldOut(event: EventbriteEvent): boolean {
  const tickets = event.ticket_classes ?? []
  if (tickets.length === 0) return false
  const totalAvail = tickets.reduce((acc, t) => acc + (t.quantity_total ?? 0), 0)
  const totalSold = tickets.reduce((acc, t) => acc + (t.quantity_sold ?? 0), 0)
  if (totalAvail === 0) return false
  return totalSold >= totalAvail
}

export function pickImageUrl(event: EventbriteEvent): string | null {
  return event.logo?.original?.url ?? event.logo?.url ?? null
}

export function pickVenue(event: EventbriteEvent): string | null {
  if (!event.venue) return null
  const parts = [event.venue.name, event.venue.address?.localized_address_display].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}
