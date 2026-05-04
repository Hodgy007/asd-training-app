import { DOMParser } from '@xmldom/xmldom'
import { SignedXml } from 'xml-crypto'
import { parseStringPromise } from 'xml2js'
import { prisma } from './prisma'

const APP_ENTITY_ID = process.env.NEXTAUTH_URL || 'https://asd-training-app-v2.vercel.app'
const CALLBACK_URL = `${APP_ENTITY_ID}/api/auth/saml/callback`

// Maximum age for an inbound SAML assertion's IssueInstant. Tighter than
// `NotOnOrAfter` (which IdPs often set to 5–60 min) so a captured response
// can't replay across the whole IdP-allowed window.
const MAX_ASSERTION_AGE_MS = 5 * 60 * 1000 // 5 minutes
const NONCE_LIFETIME_MS = 60 * 60 * 1000 // 1 hour — long enough for slow MFA flows

const SAML_ASSERTION_NS = 'urn:oasis:names:tc:SAML:2.0:assertion'
const XMLDSIG_NS = 'http://www.w3.org/2000/09/xmldsig#'

/**
 * Generate a SAML AuthnRequest login URL and persist the request ID so we can
 * verify InResponseTo on the callback (one-time-use nonce).
 */
export async function generateSamlLoginUrl(
  ssoUrl: string,
  email: string,
  opts?: { isCharity?: boolean }
): Promise<string> {
  const id = `_${crypto.randomUUID()}`
  const issueInstant = new Date().toISOString()

  await prisma.samlAuthnRequest.create({
    data: {
      id,
      email: email.toLowerCase().trim(),
      isCharity: opts?.isCharity ?? false,
      expiresAt: new Date(Date.now() + NONCE_LIFETIME_MS),
    },
  })

  const authnRequest = `<samlp:AuthnRequest
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="${id}"
    Version="2.0"
    IssueInstant="${issueInstant}"
    Destination="${escapeXml(ssoUrl)}"
    AssertionConsumerServiceURL="${escapeXml(CALLBACK_URL)}"
    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
    <saml:Issuer>${escapeXml(APP_ENTITY_ID)}</saml:Issuer>
    <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true"/>
  </samlp:AuthnRequest>`

  const encoded = Buffer.from(authnRequest, 'utf-8').toString('base64')
  return `${ssoUrl}?SAMLRequest=${encodeURIComponent(encoded)}&RelayState=${encodeURIComponent(email)}`
}

export interface SamlValidationResult {
  valid: boolean
  email?: string
  name?: string
  error?: string
}

/**
 * Validate a SAML Response. Defends against the standard SAML pitfalls:
 *
 *   - Signature verification (xml-crypto)
 *   - **XML Signature Wrapping** — values are read ONLY from the element that
 *     was actually referenced by the signature, never from a document-wide
 *     `getElementsByTagName` walk.
 *   - InResponseTo nonce — must match an unconsumed `SamlAuthnRequest` row;
 *     the row is marked consumed on success, so replay across the whole
 *     `NotOnOrAfter` window is impossible.
 *   - Recipient — must equal our ACS URL.
 *   - Audience — must contain our entityId.
 *   - IssueInstant — assertion must be ≤ 5 min old.
 *   - Conditions NotBefore / NotOnOrAfter still enforced as a backstop.
 */
export async function validateSamlResponse(
  samlResponseBase64: string,
  certificate: string
): Promise<SamlValidationResult> {
  try {
    const xml = Buffer.from(samlResponseBase64, 'base64').toString('utf-8')
    const doc = new DOMParser().parseFromString(xml, 'text/xml')

    // Format the certificate — add PEM headers if missing
    let cert = certificate.trim()
    if (!cert.startsWith('-----BEGIN CERTIFICATE-----')) {
      const rawCert = cert.replace(/\s+/g, '')
      cert = `-----BEGIN CERTIFICATE-----\n${rawCert}\n-----END CERTIFICATE-----`
    }

    const signatureElements = doc.getElementsByTagNameNS(XMLDSIG_NS, 'Signature')
    if (signatureElements.length === 0) {
      return { valid: false, error: 'No Signature element found in SAML response' }
    }

    const sig = new SignedXml({ publicCert: cert })
    sig.loadSignature(signatureElements[0]!)
    const isValid = sig.checkSignature(xml)
    if (!isValid) {
      const errs = (sig as unknown as { validationErrors?: string[] }).validationErrors
      return {
        valid: false,
        error: `Signature verification failed: ${errs?.join(', ') || 'unknown error'}`,
      }
    }

    // ── XSW protection: extract the element referenced by the signature ──
    // The signature has one or more `<Reference URI="#id"/>` entries. We pick
    // the SIGNED element that is either the SAML Response root or an
    // Assertion, then read all subsequent values from THAT element only.
    const signedElement = findSignedElement(doc, sig)
    if (!signedElement) {
      return { valid: false, error: 'Signed element not found in document (possible XSW)' }
    }

    // The signed element should itself be a Response or an Assertion. If it's
    // a Response, drill into the contained Assertion. Reject if neither.
    const assertion = resolveAssertion(signedElement)
    if (!assertion) {
      return { valid: false, error: 'Signed element is not a SAML Response or Assertion' }
    }

    // Subject / NameID — read scoped to the signed assertion only.
    const subjectEl = firstChildByLocalName(assertion, 'Subject', SAML_ASSERTION_NS)
    if (!subjectEl) return { valid: false, error: 'No Subject in signed assertion' }

    const nameIdEl = firstChildByLocalName(subjectEl, 'NameID', SAML_ASSERTION_NS)
    const email = nameIdEl?.textContent?.trim()
    if (!email) return { valid: false, error: 'No NameID in signed assertion' }

    // SubjectConfirmation / SubjectConfirmationData — Recipient + InResponseTo.
    const subjectConfirmationData = findSubjectConfirmationData(subjectEl)
    if (!subjectConfirmationData) {
      return { valid: false, error: 'No SubjectConfirmationData in signed assertion' }
    }
    const recipient = subjectConfirmationData.getAttribute('Recipient')
    if (!recipient || recipient !== CALLBACK_URL) {
      return { valid: false, error: 'SubjectConfirmation Recipient does not match ACS URL' }
    }
    const inResponseTo = subjectConfirmationData.getAttribute('InResponseTo')
    if (!inResponseTo) {
      return { valid: false, error: 'Missing InResponseTo in SubjectConfirmationData' }
    }

    // Conditions: NotBefore / NotOnOrAfter / Audience.
    const conditionsEl = firstChildByLocalName(assertion, 'Conditions', SAML_ASSERTION_NS)
    const now = new Date()
    if (conditionsEl) {
      const notBefore = conditionsEl.getAttribute('NotBefore')
      const notOnOrAfter = conditionsEl.getAttribute('NotOnOrAfter')
      if (notBefore && new Date(notBefore) > now) {
        return { valid: false, error: 'SAML response is not yet valid (NotBefore)' }
      }
      if (notOnOrAfter && new Date(notOnOrAfter) <= now) {
        return { valid: false, error: 'SAML response has expired (NotOnOrAfter)' }
      }
      // Audience must include our entity ID.
      const audienceRestriction = firstChildByLocalName(
        conditionsEl,
        'AudienceRestriction',
        SAML_ASSERTION_NS
      )
      if (!audienceRestriction) {
        return { valid: false, error: 'Missing AudienceRestriction in Conditions' }
      }
      const audiences = childrenByLocalName(audienceRestriction, 'Audience', SAML_ASSERTION_NS)
      const matched = audiences.some((a) => a.textContent?.trim() === APP_ENTITY_ID)
      if (!matched) {
        return { valid: false, error: 'Audience does not match this application' }
      }
    } else {
      return { valid: false, error: 'Missing Conditions element in signed assertion' }
    }

    // IssueInstant freshness — tight 5-minute window.
    const issueInstant = assertion.getAttribute('IssueInstant')
    if (!issueInstant) {
      return { valid: false, error: 'Missing IssueInstant on Assertion' }
    }
    const issuedMs = new Date(issueInstant).getTime()
    if (!Number.isFinite(issuedMs)) {
      return { valid: false, error: 'Invalid IssueInstant on Assertion' }
    }
    if (Math.abs(now.getTime() - issuedMs) > MAX_ASSERTION_AGE_MS) {
      return { valid: false, error: 'Assertion IssueInstant is outside the allowed freshness window' }
    }

    // InResponseTo nonce check + atomic single-use consumption.
    const consumed = await consumeAuthnRequest(inResponseTo)
    if (!consumed) {
      return { valid: false, error: 'InResponseTo does not match a pending request (replay or unsolicited)' }
    }

    // Display-name attribute extraction — also scoped to the signed assertion.
    const attributeStatement = firstChildByLocalName(
      assertion,
      'AttributeStatement',
      SAML_ASSERTION_NS
    )
    let name: string | undefined
    if (attributeStatement) {
      const attributes = childrenByLocalName(attributeStatement, 'Attribute', SAML_ASSERTION_NS)
      const nameAttributeNames = [
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
        'http://schemas.microsoft.com/identity/claims/displayname',
        'displayName',
        'name',
        'givenName',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
      ]
      for (const attr of attributes) {
        const attrName = attr.getAttribute('Name')
        if (attrName && nameAttributeNames.includes(attrName)) {
          const values = childrenByLocalName(attr, 'AttributeValue', SAML_ASSERTION_NS)
          const text = values[0]?.textContent?.trim()
          if (text) {
            name = text
            break
          }
        }
      }
    }

    return { valid: true, email, name }
  } catch (err) {
    return {
      valid: false,
      error: `Failed to parse SAML response: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

/**
 * Find the element actually referenced by the signature. xml-crypto exposes
 * the validated `references` after `checkSignature`. We resolve each URI
 * (`#id`) against the document by `ID` attribute and pick the first match
 * that is a Response or Assertion.
 */
function findSignedElement(doc: Document, sig: SignedXml): Element | null {
  const references = (sig as unknown as { references?: Array<{ uri?: string }> }).references ?? []
  for (const ref of references) {
    const uri = ref.uri ?? ''
    if (!uri.startsWith('#')) continue
    const id = uri.slice(1)
    const el = findElementById(doc.documentElement, id)
    if (!el) continue
    const local = el.localName ?? el.nodeName.replace(/^[^:]+:/, '')
    if (local === 'Response' || local === 'Assertion') return el
  }
  return null
}

function findElementById(root: Element | null, id: string): Element | null {
  if (!root) return null
  // SAML uses `ID` (capitalised). Try `ID` first, then `Id`/`id`.
  const candidate =
    root.getAttribute?.('ID') === id ||
    root.getAttribute?.('Id') === id ||
    root.getAttribute?.('id') === id
  if (candidate) return root
  for (let i = 0; i < root.childNodes.length; i++) {
    const child = root.childNodes[i]!
    if (child.nodeType === 1) {
      const found = findElementById(child as Element, id)
      if (found) return found
    }
  }
  return null
}

function resolveAssertion(signedEl: Element): Element | null {
  const local = signedEl.localName ?? signedEl.nodeName.replace(/^[^:]+:/, '')
  if (local === 'Assertion') return signedEl
  if (local === 'Response') {
    return firstChildByLocalName(signedEl, 'Assertion', SAML_ASSERTION_NS)
  }
  return null
}

function firstChildByLocalName(parent: Element, localName: string, ns: string): Element | null {
  for (let i = 0; i < parent.childNodes.length; i++) {
    const node = parent.childNodes[i]!
    if (node.nodeType !== 1) continue
    const el = node as Element
    if ((el.namespaceURI === ns || !el.namespaceURI) && (el.localName ?? el.nodeName.replace(/^[^:]+:/, '')) === localName) {
      return el
    }
  }
  return null
}

function childrenByLocalName(parent: Element, localName: string, ns: string): Element[] {
  const out: Element[] = []
  for (let i = 0; i < parent.childNodes.length; i++) {
    const node = parent.childNodes[i]!
    if (node.nodeType !== 1) continue
    const el = node as Element
    if ((el.namespaceURI === ns || !el.namespaceURI) && (el.localName ?? el.nodeName.replace(/^[^:]+:/, '')) === localName) {
      out.push(el)
    }
  }
  return out
}

function findSubjectConfirmationData(subjectEl: Element): Element | null {
  const confirmations = childrenByLocalName(subjectEl, 'SubjectConfirmation', SAML_ASSERTION_NS)
  for (const sc of confirmations) {
    const data = firstChildByLocalName(sc, 'SubjectConfirmationData', SAML_ASSERTION_NS)
    if (data) return data
  }
  return null
}

/**
 * Atomically consume an InResponseTo nonce. Returns true on success; false if
 * the nonce was missing, expired, or already consumed.
 */
async function consumeAuthnRequest(id: string): Promise<boolean> {
  try {
    const result = await prisma.samlAuthnRequest.updateMany({
      where: {
        id,
        consumed: false,
        expiresAt: { gt: new Date() },
      },
      data: { consumed: true },
    })
    return result.count === 1
  } catch {
    return false
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Parse a SAML IdP metadata URL to extract entityId, SSO URL, and signing certificate.
 */
export async function parseMetadataUrl(
  metadataUrl: string
): Promise<{ success: boolean; entityId?: string; ssoUrl?: string; certificate?: string; error?: string }> {
  try {
    const res = await fetch(metadataUrl)
    if (!res.ok) {
      return { success: false, error: `Failed to fetch metadata: HTTP ${res.status}` }
    }

    const xmlText = await res.text()
    const parsed = await parseStringPromise(xmlText, {
      tagNameProcessors: [(name: string) => name.replace(/^[^:]+:/, '')],
    } as Parameters<typeof parseStringPromise>[1])

    const entityDescriptor = parsed.EntityDescriptor
    if (!entityDescriptor) {
      return { success: false, error: 'No EntityDescriptor found in metadata' }
    }

    const entityId = entityDescriptor.$?.entityID
    if (!entityId) {
      return { success: false, error: 'No entityID attribute found on EntityDescriptor' }
    }

    const idpDescriptor = entityDescriptor.IDPSSODescriptor?.[0]
    if (!idpDescriptor) {
      return { success: false, error: 'No IDPSSODescriptor found in metadata' }
    }

    let ssoUrl: string | undefined
    const ssoServices = idpDescriptor.SingleSignOnService || []
    for (const svc of ssoServices) {
      const binding = svc.$?.Binding
      if (binding === 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect') {
        ssoUrl = svc.$.Location
        break
      }
    }
    if (!ssoUrl) {
      if (ssoServices.length > 0) {
        ssoUrl = ssoServices[0].$.Location
      }
    }
    if (!ssoUrl) {
      return { success: false, error: 'No SingleSignOnService URL found in metadata' }
    }

    let certificate: string | undefined
    const keyDescriptors = idpDescriptor.KeyDescriptor || []
    for (const kd of keyDescriptors) {
      const use = kd.$?.use
      if (use === 'signing' || !use) {
        const keyInfo = kd.KeyInfo?.[0]
        const x509Data = keyInfo?.X509Data?.[0]
        const cert = x509Data?.X509Certificate?.[0]
        if (cert) {
          certificate = typeof cert === 'string' ? cert.trim() : cert._.trim()
          break
        }
      }
    }
    if (!certificate) {
      return { success: false, error: 'No X509Certificate found in metadata' }
    }

    return { success: true, entityId, ssoUrl, certificate }
  } catch (err) {
    return {
      success: false,
      error: `Failed to parse metadata: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}
