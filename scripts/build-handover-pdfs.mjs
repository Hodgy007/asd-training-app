#!/usr/bin/env node
// Builds the handover PDFs in docs/handover/ from their markdown sources.
// Run via: npm run handover:build
//
// Sources live alongside the PDFs in docs/handover/, plus the role guides and the
// integration guide in docs/guides/. One PDF (the Admin Guide) is a composite of two
// guide files — the script concatenates them with a page-break separator before
// handing to md-to-pdf.
//
// Outputs whose sources haven't changed are skipped. md-to-pdf embeds a creation
// timestamp, so a rebuilt PDF is byte-different even when its content is identical;
// without the skip, every docs commit carried megabytes of meaningless binary churn
// and `git diff --stat` couldn't show which documents actually moved.
// Pass --force to rebuild everything regardless.

import { mdToPdf } from 'md-to-pdf'
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const repoRoot = resolve(dirname(__filename), '..')

const handoverDir = join(repoRoot, 'docs', 'handover')
const guidesDir = join(repoRoot, 'docs', 'guides')
const cssPath = join(handoverDir, '_pdf-style.css')
const css = readFileSync(cssPath, 'utf8')

const PAGE_BREAK = '\n\n<div class="page-break"></div>\n\n'

const DOCS = [
  {
    output: 'AAA_Admin_Guide.pdf',
    title: 'AAA Digital Platform — Admin Guide',
    sources: [
      join(guidesDir, 'super-admin-guide.md'),
      join(guidesDir, 'org-admin-guide.md'),
    ],
  },
  {
    output: 'AAA_Platform_Administration.pdf',
    title: 'AAA Digital Platform — Platform Administration Guide',
    sources: [join(handoverDir, 'platform-administration.md')],
  },
  {
    output: 'AAA_User_Guide.pdf',
    title: 'AAA Digital Platform — User Guide',
    sources: [join(guidesDir, 'learner-guide.md')],
  },
  {
    output: 'AAA_Data_Dictionary.pdf',
    title: 'AAA Digital Platform — Data Dictionary',
    sources: [join(handoverDir, 'data-dictionary.md')],
  },
  {
    output: 'AAA_Technical_Setup_Guide.pdf',
    title: 'AAA Digital Platform — Technical Setup Guide',
    sources: [join(handoverDir, 'technical-setup-guide.md')],
  },
  {
    output: 'AAA_Self_Registration_Flow.pdf',
    title: 'AAA Digital Platform — Self-Registration Flow',
    sources: [join(handoverDir, 'self-registration-flow.md')],
  },
  {
    output: 'AAA_Digital_Platform_Handover_Plan.pdf',
    title: 'AAA Digital Platform — Handover Plan',
    sources: [join(handoverDir, 'handover-plan.md')],
  },
  {
    output: 'AAA_Training_Materials.pdf',
    title: 'AAA Digital Platform — Training Materials',
    sources: [join(handoverDir, 'training-materials.md')],
  },
  {
    output: 'AAA_Integration_Reports_Guide.pdf',
    title: 'AAA Digital Platform — Integration Reports Guide',
    sources: [join(guidesDir, 'integration-reports-guide.md')],
  },
]

function loadSources(sources) {
  return sources
    .map((path) => {
      if (!existsSync(path)) {
        throw new Error(`Source not found: ${path}`)
      }
      return readFileSync(path, 'utf8')
    })
    .join(PAGE_BREAK)
}

async function buildPdf({ output, title, sources }) {
  const content = loadSources(sources)
  const outputPath = join(handoverDir, output)

  const pdf = await mdToPdf(
    { content },
    {
      dest: outputPath,
      stylesheet_encoding: 'utf-8',
      css,
      pdf_options: {
        format: 'A4',
        margin: { top: '25mm', bottom: '25mm', left: '20mm', right: '20mm' },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `<div style="font-size:9px;color:#64748b;width:100%;padding:0 20mm;display:flex;justify-content:space-between;"><span>${escapeHtml(title)}</span><span>Ambitious about Autism</span></div>`,
        footerTemplate:
          '<div style="font-size:9px;color:#64748b;width:100%;padding:0 20mm;display:flex;justify-content:space-between;"><span>© 2026 Ambitious about Autism. Confidential.</span><span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
      },
      launch_options: { args: ['--no-sandbox'] },
    }
  )

  if (!pdf) {
    throw new Error(`md-to-pdf returned no result for ${output}`)
  }

  return outputPath
}

/**
 * True when the PDF is newer than every input that shapes it — its markdown
 * sources, the shared stylesheet, and this script (which owns the header and
 * footer templates). Missing output always rebuilds.
 */
function isUpToDate({ output, sources }) {
  const outputPath = join(handoverDir, output)
  if (!existsSync(outputPath)) return false

  const builtAt = statSync(outputPath).mtimeMs
  const inputs = [...sources, cssPath, __filename]
  return inputs.every((input) => statSync(input).mtimeMs <= builtAt)
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function main() {
  if (!existsSync(handoverDir)) {
    mkdirSync(handoverDir, { recursive: true })
  }

  const force = process.argv.includes('--force')
  let built = 0
  let skipped = 0

  console.log(`Building ${DOCS.length} handover PDF(s)${force ? ' (forced)' : ''}...`)
  for (const doc of DOCS) {
    process.stdout.write(`  ${doc.output} ... `)

    if (!force && isUpToDate(doc)) {
      console.log('up to date')
      skipped++
      continue
    }

    try {
      await buildPdf(doc)
      console.log('done')
      built++
    } catch (err) {
      console.log('FAILED')
      console.error(err)
      process.exitCode = 1
    }
  }
  console.log(`Finished. ${built} rebuilt, ${skipped} unchanged.`)
}

main()
