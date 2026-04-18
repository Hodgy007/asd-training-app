# ASD Training App — Demo Video (Remotion)

A 15-second product demo at 1920×1080, 30fps (450 frames) built with [Remotion](https://remotion.dev).

## Scenes

1. **0–3.3s** — Hero: logo + tagline
2. **3.3–7.3s** — Stats: animated counters (practitioners, observations, lesson completion)
3. **7.3–12.3s** — Chart: animated line chart showing training progress
4. **12.3–15s** — CTA: call to action with app URL

Scenes are stitched together with `<TransitionSeries>` using `fade` and `slide` transitions.

## Commands

```bash
npm install                 # once
npm run dev                 # Remotion Studio preview at http://localhost:3000
npx remotion render AsdDemo out/asd-demo.mp4
npx remotion still AsdDemo  out/frame-60.png --frame=60 --scale=0.5
npm run lint                # eslint + tsc
```

## File layout

```
src/
  Root.tsx              # Composition registration (AsdDemo, 1920x1080, 450 frames)
  Composition.tsx       # TransitionSeries stitching the 4 scenes
  theme.ts              # Shared colour + font tokens
  scenes/
    SceneHero.tsx
    SceneStats.tsx
    SceneChart.tsx
    SceneCTA.tsx
```

## Notes

- All animation is driven by `useCurrentFrame()` + `interpolate` with `Easing.bezier` — no CSS transitions or Tailwind animation classes (they don't render).
- The line chart uses `@remotion/paths` (`evolvePath`) to animate the stroke.
- Tailwind deps are included from the scaffold but unused; `index.css` is a minimal reset.
