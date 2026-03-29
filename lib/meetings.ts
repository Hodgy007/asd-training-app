import prisma from './prisma'

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface MeetingResult {
  success: boolean
  meetingUrl?: string
  error?: string
}

export interface ConnectionTestResult {
  success: boolean
  error?: string
}

// ─── Zoom ─────────────────────────────────────────────────────────────────────

/**
 * Creates a Zoom meeting via Server-to-Server OAuth.
 * Returns the join_url on success.
 */
export async function createZoomMeeting(
  accountId: string,
  clientId: string,
  clientSecret: string,
  title: string,
  scheduledAt: Date,
  duration: number
): Promise<MeetingResult> {
  try {
    // 1. Obtain access token
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const tokenRes = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    if (!tokenRes.ok) {
      const body = await tokenRes.text()
      return { success: false, error: `Zoom auth failed: ${tokenRes.status} ${body}` }
    }

    const tokenData = await tokenRes.json()
    const accessToken: string = tokenData.access_token

    // 2. Create the meeting
    const meetingRes = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: title,
        type: 2, // Scheduled meeting
        start_time: scheduledAt.toISOString(),
        duration,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          waiting_room: true,
        },
      }),
    })

    if (!meetingRes.ok) {
      const body = await meetingRes.text()
      return { success: false, error: `Zoom meeting creation failed: ${meetingRes.status} ${body}` }
    }

    const meetingData = await meetingRes.json()
    return { success: true, meetingUrl: meetingData.join_url }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Zoom error: ${message}` }
  }
}

// ─── Microsoft Teams ──────────────────────────────────────────────────────────

/**
 * Creates a Teams online meeting via Microsoft Graph.
 * Returns the joinWebUrl on success.
 */
export async function createTeamsMeeting(
  clientId: string,
  clientSecret: string,
  tenantId: string,
  title: string,
  scheduledAt: Date,
  duration: number
): Promise<MeetingResult> {
  try {
    // 1. Obtain access token via client_credentials
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'https://graph.microsoft.com/.default',
        }),
      }
    )

    if (!tokenRes.ok) {
      const body = await tokenRes.text()
      return { success: false, error: `Teams auth failed: ${tokenRes.status} ${body}` }
    }

    const tokenData = await tokenRes.json()
    const accessToken: string = tokenData.access_token

    // 2. Create the online meeting
    const endTime = new Date(scheduledAt.getTime() + duration * 60 * 1000)

    const meetingRes = await fetch('https://graph.microsoft.com/v1.0/communications/onlineMeetings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: title,
        startDateTime: scheduledAt.toISOString(),
        endDateTime: endTime.toISOString(),
      }),
    })

    if (!meetingRes.ok) {
      const body = await meetingRes.text()
      return { success: false, error: `Teams meeting creation failed: ${meetingRes.status} ${body}` }
    }

    const meetingData = await meetingRes.json()
    return { success: true, meetingUrl: meetingData.joinWebUrl }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Teams error: ${message}` }
  }
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

/**
 * Reads the OrgMeetingConfig for the given org and calls the appropriate
 * platform API to create a meeting link. Returns the URL on success.
 */
export async function generateMeetingLink(
  orgId: string,
  title: string,
  scheduledAt: Date,
  duration: number
): Promise<MeetingResult> {
  const config = await prisma.orgMeetingConfig.findUnique({
    where: { organisationId: orgId },
  })

  if (!config || !config.configured) {
    return { success: false, error: 'No meeting platform configured for this organisation.' }
  }

  switch (config.platform) {
    case 'ZOOM': {
      if (!config.apiKey || !config.apiSecret) {
        return { success: false, error: 'Zoom credentials (Account ID / Client ID / Secret) are not set.' }
      }
      // For Zoom Server-to-Server OAuth: apiKey = accountId, apiSecret = "clientId:clientSecret"
      // We store accountId in apiKey and "clientId|clientSecret" in apiSecret
      const [zoomClientId, zoomClientSecret] = (config.apiSecret ?? '').split('|')
      if (!zoomClientId || !zoomClientSecret) {
        return { success: false, error: 'Zoom apiSecret must be formatted as "clientId|clientSecret".' }
      }
      return createZoomMeeting(config.apiKey, zoomClientId, zoomClientSecret, title, scheduledAt, duration)
    }

    case 'TEAMS': {
      if (!config.apiKey || !config.apiSecret || !config.tenantId) {
        return { success: false, error: 'Teams credentials (Client ID / Secret / Tenant ID) are not set.' }
      }
      return createTeamsMeeting(config.apiKey, config.apiSecret, config.tenantId, title, scheduledAt, duration)
    }

    case 'CUSTOM':
      return { success: false, error: 'Custom platform does not support automatic meeting link generation.' }

    default:
      return { success: false, error: 'Unknown meeting platform.' }
  }
}

// ─── Connection test ──────────────────────────────────────────────────────────

/**
 * Tests authentication for a meeting platform without creating a meeting.
 */
export async function testMeetingConnection(
  platform: 'ZOOM' | 'TEAMS' | 'CUSTOM',
  apiKey: string,
  apiSecret: string,
  tenantId?: string
): Promise<ConnectionTestResult> {
  try {
    if (platform === 'ZOOM') {
      // apiKey = accountId, apiSecret = "clientId|clientSecret"
      const [clientId, clientSecret] = apiSecret.split('|')
      if (!clientId || !clientSecret) {
        return { success: false, error: 'Zoom apiSecret must be formatted as "clientId|clientSecret".' }
      }
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      const res = await fetch(
        `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      )
      if (!res.ok) {
        const body = await res.text()
        return { success: false, error: `Zoom auth test failed: ${res.status} ${body}` }
      }
      return { success: true }
    }

    if (platform === 'TEAMS') {
      if (!tenantId) {
        return { success: false, error: 'Tenant ID is required for Teams.' }
      }
      const res = await fetch(
        `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: apiKey,
            client_secret: apiSecret,
            scope: 'https://graph.microsoft.com/.default',
          }),
        }
      )
      if (!res.ok) {
        const body = await res.text()
        return { success: false, error: `Teams auth test failed: ${res.status} ${body}` }
      }
      return { success: true }
    }

    // CUSTOM platform — nothing to test
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Connection test error: ${message}` }
  }
}
