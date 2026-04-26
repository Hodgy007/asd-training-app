/**
 * Build a SCORM 1.2 imsmanifest.xml for a Module being exported as a SCORM
 * package. Each lesson becomes its own SCO so receiving LMSes (Moodle, SCORM
 * Cloud, etc.) can track per-lesson completion. Shared CSS / JS are referenced
 * once as an `asset` resource and pulled in by every SCO via `<dependency>`.
 *
 * Output is round-trippable through `parseScormManifest` in `manifest.ts` —
 * the export tests assert this so the import and export sides cannot drift.
 */

export interface ExportLessonItem {
  /** Lesson id from the DB. Used as the resource identifier suffix. */
  id: string
  /** Lesson title. Will be XML-escaped. */
  title: string
  /** Relative path inside the zip to the launchable HTML for this SCO. */
  href: string
  /** Files this SCO needs (relative paths inside the zip), excluding shared/. */
  files: string[]
  /** Optional mastery score (0–100). Omitted if undefined. */
  masteryScore?: number
}

export interface BuildManifestArgs {
  moduleId: string
  moduleTitle: string
  /** Files referenced by the shared `asset` resource, e.g. shared/style.css. */
  sharedFiles: string[]
  lessons: ExportLessonItem[]
}

const SHARED_RESOURCE_ID = 'RES-SHARED'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** SCORM identifiers must be NCName — letters, digits, `_`, `-`, `.` only. */
function safeId(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9_.-]/g, '_')
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `id-${cleaned}`
}

export function buildScorm12Manifest(args: BuildManifestArgs): string {
  const { moduleId, moduleTitle, sharedFiles, lessons } = args

  const orgId = safeId(`ORG-${moduleId}`)
  const manifestId = safeId(`com.asd-training.${moduleId}`)

  const itemsXml = lessons
    .map((lesson) => {
      const itemId = safeId(`ITEM-${lesson.id}`)
      const refId = safeId(`RES-${lesson.id}`)
      const masteryXml =
        typeof lesson.masteryScore === 'number'
          ? `      <adlcp:masteryscore>${lesson.masteryScore}</adlcp:masteryscore>\n`
          : ''
      return `    <item identifier="${itemId}" identifierref="${refId}">
      <title>${escapeXml(lesson.title)}</title>
${masteryXml}    </item>`
    })
    .join('\n')

  const lessonResourcesXml = lessons
    .map((lesson) => {
      const refId = safeId(`RES-${lesson.id}`)
      const filesXml = [lesson.href, ...lesson.files.filter((f) => f !== lesson.href)]
        .map((f) => `      <file href="${escapeXml(f)}"/>`)
        .join('\n')
      return `    <resource identifier="${refId}" type="webcontent" adlcp:scormtype="sco" href="${escapeXml(lesson.href)}">
${filesXml}
      <dependency identifierref="${SHARED_RESOURCE_ID}"/>
    </resource>`
    })
    .join('\n')

  const sharedFilesXml = sharedFiles
    .map((f) => `      <file href="${escapeXml(f)}"/>`)
    .join('\n')

  const sharedResourceXml = `    <resource identifier="${SHARED_RESOURCE_ID}" type="webcontent" adlcp:scormtype="asset">
${sharedFilesXml}
    </resource>`

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${manifestId}" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="${orgId}">
    <organization identifier="${orgId}">
      <title>${escapeXml(moduleTitle)}</title>
${itemsXml}
    </organization>
  </organizations>
  <resources>
${lessonResourcesXml}
${sharedResourceXml}
  </resources>
</manifest>
`
}
