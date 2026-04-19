# Voiceover script — Org pitch video

60-second organisation-pitch, 8 scenes. Every line is measured against the
scene's frame budget with ~15% headroom so the transition fades don't clip.

UK English. Tone: warm, confident, human. Use a mid-range voice — avoid
over-corporate "announcer" VO and avoid kids-TV brightness. Think BBC Radio 4
feature narrator.

## Scripts

### Scene 1 — Hero  (0.0–5.0s · 150 frames)

> Ambitious about Autism. Empowering employers. Changing lives.

*(8 words · ~3.5s · leaves 1.5s of held silence over the logo)*

### Scene 2 — Who we are  (5.5–13.5s · 240 frames)

> For over twenty-five years, we've championed autistic people across the UK — through education, employment, and national advocacy.

*(19 words · ~7s)*

### Scene 3 — Employment gap  (14.0–22.5s · 255 frames)

> Only twenty-two percent of autistic adults are in full-time employment. With the right support, they thrive.

*(17 words · ~7s · pause briefly before "With the right support" for emphasis)*

### Scene 4 — Staff training  (23.0–32.0s · 270 frames)

> Our CPD-accredited training prepares your team for inclusive hiring — awareness, interviewing, and onboarding done right.

*(17 words · ~7s)*

### Scene 5 — Guided internship  (32.5–41.5s · 270 frames)

> Our guided internship programme gives autistic young people real placements — matched mentors, structured check-ins, and job coaching every step of the way.

*(23 words · ~8.5s)*

### Scene 6 — Digital platform  (42.0–50.0s · 240 frames)

> Our digital platform tracks training, captures feedback, and delivers live dashboards. Measure impact — don't guess at it.

*(18 words · ~7s)*

### Scene 7 — Partnership  (50.5–58.5s · 240 frames)

> Partner with us for a dedicated manager, accredited training, ESG evidence, and a national network already driving real change.

*(20 words · ~7.5s)*

### Scene 8 — CTA  (59.0–67.0s · 240 frames)

> Build a truly inclusive workplace. Visit ambitiousaboutautism.org.uk to start your partnership today.

*(13 words · ~5.5s · last 2s are silent while the pulsing CTA button holds)*

## Rendering the voiceover versions

1. Generate 8 MP3s (see TTS guidance below) and drop them into
   `remotion-demo/public/voiceover/` using these exact filenames:

   ```
   scene1-hero.mp3
   scene2-who.mp3
   scene3-opportunity.mp3
   scene4-training.mp3
   scene5-internship.mp3
   scene6-platform.mp3
   scene7-partnership.mp3
   scene8-cta.mp3
   ```

2. Re-render the VO-enabled compositions:

   ```bash
   export CHROME=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
   npx remotion render src/index.ts OrgPitchDarkVO  out/org-pitch-dark-vo.mp4  --browser-executable=$CHROME
   npx remotion render src/index.ts OrgPitchLightVO out/org-pitch-light-vo.mp4 --browser-executable=$CHROME
   ```

3. Copy to `public/` and ship as `org-pitch-dark-vo.mp4` / `org-pitch-light-vo.mp4`.

   The non-VO variants (`OrgPitchDark`, `OrgPitchLight`) remain untouched so
   you can keep silent cuts as social-ready copies.

## TTS guidance

### ElevenLabs (recommended — best quality for this tone)

- Voice: **Daniel** (British male, confident) or **Rachel** (warm clarity).
  For a charity feel, Daniel tends to outperform.
- Model: **Eleven Multilingual v2** or **Eleven Turbo v2.5**.
- Settings: stability 45, similarity 75, style 10, speaker boost on.
- Export each scene at **44.1 kHz, 128 kbps MP3**.
- Add ~400 ms of silence at the start of every clip (Remotion aligns from
  frame 0 but natural VO benefits from a breath-in).

### OpenAI TTS (cheapest acceptable option)

- Voice: `alloy` or `onyx`. `onyx` suits the warm-authority tone.
- Model: `tts-1-hd`.
- Speed: 0.95 (slightly slower than default for clarity).

### Human voiceover

- 60-second reads, one MP3 per scene to make editing surgical.
- Ask for two takes per line: one neutral, one warm.
- Budget expectation: a UK VO artist on Voquent / Bodalgo will do this for
  ~£180–£280 for commercial-unlimited use rights.

## Timing cheatsheet

| Scene | Frames | Seconds | Max words (UK VO, 150 wpm) |
| ----- | -----: | ------: | -------------------------: |
| Hero          | 150 | 5.0 | 12 |
| Who           | 240 | 8.0 | 20 |
| Opportunity   | 255 | 8.5 | 21 |
| Training      | 270 | 9.0 | 22 |
| Internship    | 270 | 9.0 | 22 |
| Platform      | 240 | 8.0 | 20 |
| Partnership   | 240 | 8.0 | 20 |
| CTA           | 240 | 8.0 | 20 |

Always leave the final 300–500 ms of each scene silent — that's where the
transition crossfade lives.
