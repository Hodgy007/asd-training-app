import { DOMParser } from '@xmldom/xmldom'
import { SignedXml } from 'xml-crypto'
import { parseStringPromise } from 'xml2js'

const APP_ENTITY_ID = process.env.NEXTAUTH_URL || 'https://asd-training-app-v2.vercel.app'
const CALLBACK_URL = `${APP_ENTITY_ID}/api/auth/saml/callback`

/**
 * Generate a SAML AuthnRequest login URL.
 * The IdP should redirect back to our callback after authentication.
 */
export function generateSamlLoginUrl(ssoUrl: string, email: string): string {
  const id = `_${crypto.randomUUID()}`
  const issueInstant = new Date().toISOString()

  const authnRequest = `<samlp:AuthnRequest
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="${id}"
    Version="2.0"
    IssueInstant="${issueInstant}"
    Destination="${ssoUrl}"
    AssertionConsumerServiceURL="${CALLBACK_URL}"
    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
    <saml:Issuer>${APP_ENTITY_ID}</saml:Issuer>
    <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true"/>
  </samlp:AuthnRequest>`

  const encoded = Buffer.from(authnRequest, 'utf-8').toString('base64')
  return `${ssoUrl}?SAMLRequest=${encodeURIComponent(encoded)}&RelayState=${encodeURIComponent(email)}`
}

/**
 * Validate a SAML Response from the IdP.
 * Returns the authenticated user's email and optional name on success.
 */
export async function validateSamlResponse(
  samlResponseBase64: string,
  certificate: string
): Promise<{ valid: boolean; email?: string; name?: string; error?: string }> {
  try {
    const xml = Buffer.from(samlResponseBase64, 'base64').toString('utf-8')
    const doc = new DOMParser().parseFromString(xml, 'text/xml')

    // Format the certificate — add PEM headers if missing
    let cert = certificate.trim()
    if (!cert.startsWith('-----BEGIN CERTIFICATE-----')) {
      // Strip any whitespace/newlines from raw base64 cert
      const rawCert = cert.replace(/\s+/g, '')
      cert = `-----BEGIN CERTIFICATE-----\n${rawCert}\n-----END CERTIFICATE-----`
    }
    const certForVerify = cert
      .replace('-----BEGIN CERTIFICATE-----', '')
      .replace('-----END CERTIFICATE-----', '')
      .replace(/\s+/g, '')

    // Find and verify the XML signature
    const signatureElements = doc.getElementsByTagNameNS(
      'http://www.w3.org/2000/09/xmldsig#',
      'Signature'
    )
    if (signatureElements.length === 0) {
      return { valid: false, error: 'No Signature element found in SAML response' }
    }

    const sig = new SignedXml()
    sig.keyInfoProvider = {
      getKey: () => Buffer.from(cert),
      getKeyInfo: () => `<X509Data><X509Certificate>${certForVerify}</X509Certificate></X509Data>`,
    } as any // eslint-disable-line @typescript-eslint/no-explicit-any

    sig.loadSignature(signatureElements[0]!)
    const isValid = sig.checkSignature(xml)
    if (!isValid) {
      return {
        valid: false,
        error: `Signature verification failed: ${sig.validationErrors.join(', ')}`,
      }
    }

    // Check Conditions timestamps (NotBefore / NotOnOrAfter)
    const conditions = doc.getElementsByTagNameNS(
      'urn:oasis:names:tc:SAML:2.0:assertion',
      'Conditions'
    )
    if (conditions.length > 0) {
      const condition = conditions[0]!
      const now = new Date()
      const notBefore = condition.getAttribute('NotBefore')
      const notOnOrAfter = condition.getAttribute('NotOnOrAfter')

      if (notBefore && new Date(notBefore) > now) {
        return { valid: false, error: 'SAML response is not yet valid (NotBefore)' }
      }
      if (notOnOrAfter && new Date(notOnOrAfter) <= now) {
        return { valid: false, error: 'SAML response has expired (NotOnOrAfter)' }
      }
    }

    // Extract NameID as email
    const nameIdElements = doc.getElementsByTagNameNS(
      'urn:oasis:names:tc:SAML:2.0:assertion',
      'NameID'
    )
    if (nameIdElements.length === 0) {
      return { valid: false, error: 'No NameID found in SAML response' }
    }
    const email = nameIdElements[0]!.textContent?.trim()
    if (!email) {
      return { valid: false, error: 'NameID is empty' }
    }

    // Try to extract display name from Attributes
    let name: string | undefined
    const attributes = doc.getElementsByTagNameNS(
      'urn:oasis:names:tc:SAML:2.0:assertion',
      'Attribute'
    )
    const nameAttributeNames = [
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
      'http://schemas.microsoft.com/identity/claims/displayname',
      'displayName',
      'name',
      'givenName',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
    ]

    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes[i]!
      const attrName = attr.getAttribute('Name')
      if (attrName && nameAttributeNames.includes(attrName)) {
        const values = attr.getElementsByTagNameNS(
          'urn:oasis:names:tc:SAML:2.0:assertion',
          'AttributeValue'
        )
        if (values.length > 0 && values[0]!.textContent) {
          name = values[0]!.textContent.trim()
          break
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
      explicitNamespaces: true,
      tagNameProcessors: [(name: string) => name.replace(/^[^:]+:/, '')],
    })

    // Extract entityID from EntityDescriptor
    const entityDescriptor = parsed.EntityDescriptor
    if (!entityDescriptor) {
      return { success: false, error: 'No EntityDescriptor found in metadata' }
    }

    const entityId = entityDescriptor.$?.entityID
    if (!entityId) {
      return { success: false, error: 'No entityID attribute found on EntityDescriptor' }
    }

    // Find SingleSignOnService with HTTP-Redirect binding
    const idpDescriptor =
      entityDescriptor.IDPSSODescriptor?.[0]
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
      // Fallback: take the first SSO service
      if (ssoServices.length > 0) {
        ssoUrl = ssoServices[0].$.Location
      }
    }
    if (!ssoUrl) {
      return { success: false, error: 'No SingleSignOnService URL found in metadata' }
    }

    // Find X509Certificate from KeyDescriptor
    let certificate: string | undefined
    const keyDescriptors = idpDescriptor.KeyDescriptor || []
    for (const kd of keyDescriptors) {
      const use = kd.$?.use
      // Accept 'signing' or no 'use' attribute (dual-purpose key)
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
