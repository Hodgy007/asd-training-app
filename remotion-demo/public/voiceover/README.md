# Voiceover assets

Drop 8 MP3 files here, matching these filenames exactly:

```
scene1-hero.mp3
scene2-who.mp3
scene3-opportunity.mp3
scene4-training.mp3
scene5-internship.mp3
scene6-partnership.mp3
scene7-partnership.mp3
scene8-cta.mp3
```

Script + TTS guidance: see `remotion-demo/VOICEOVER-SCRIPT.md`.

Render the VO cuts with:

```bash
export CHROME=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
npx remotion render src/index.ts OrgPitchDarkVO  out/org-pitch-dark-vo.mp4  --browser-executable=$CHROME
npx remotion render src/index.ts OrgPitchLightVO out/org-pitch-light-vo.mp4 --browser-executable=$CHROME
```

MP3s in this folder are ignored by default for the non-VO compositions; they
only activate when you render `OrgPitchDarkVO` / `OrgPitchLightVO`.
