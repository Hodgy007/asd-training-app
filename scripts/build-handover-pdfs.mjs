#!/usr/bin/env node
// Builds the seven handover PDFs in docs/handover/ from their markdown sources.
// Run via: npm run handover:build
//
// Sources live alongside the PDFs in docs/handover/, plus the four role guides in
// docs/guides/. Two of the PDFs are composites of multiple guide files — the script
// concatenates them with a page-break separator before handing to md-to-pdf.

import { mdToPdf } from 'md-to-pdf'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
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
    output: 'AAA_User_Guide.pdf',
    title: 'AAA Digital Platform — User Guide',
    sources: [
      join(guidesDir, 'caregiver-guide.md'),
      join(guidesDir, 'careers-professional-guide.md'),
    ],
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

  console.log(`Building ${DOCS.length} handover PDF(s)...`)
  for (const doc of DOCS) {
    process.stdout.write(`  ${doc.output} ... `)
    try {
      await buildPdf(doc)
      console.log('done')
    } catch (err) {
      console.log('FAILED')
      console.error(err)
      process.exitCode = 1
    }
  }
  console.log('Finished.')
}

main()
