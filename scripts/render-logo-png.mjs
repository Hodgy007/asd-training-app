/**
 * One-off: render public/logo-aaa.svg → public/logo-aaa.png at email-friendly
 * resolution. Run with: node scripts/render-logo-png.mjs
 *
 * Why: New Outlook (Windows) and older Outlook desktop strip <img src="…svg">.
 * PNG is the bulletproof format. Email clients display the logo at ~220px CSS
 * width; rendering at 660px (3x) keeps it crisp on retina inboxes.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'

const svg = readFileSync('public/logo-aaa.svg', 'utf8')

// SVG viewBox is 0 0 380 130 → aspect ~2.92:1.
// 660px wide @ 3x density renders sharp on retina; ~10–20 KB output.
const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 660 },
  background: 'rgba(255,255,255,0)',
})
const pngBuf = resvg.render().asPng()
writeFileSync('public/logo-aaa.png', pngBuf)

console.log(`Wrote public/logo-aaa.png (${pngBuf.byteLength.toLocaleString()} bytes)`)
