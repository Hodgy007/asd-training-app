# Remotion demo — build notes

Lessons from building the 45s `AsdDemo` cut, captured so the next iteration
is faster. Pair this with `README.md` for the scene overview.

## Rendering environment

The sandbox cannot download Chromium from `remotion.media` (403 "Host not
in allowlist"). Every render must pass `--browser-executable` pointing at
a Playwright-bundled headless shell:

```bash
export CHROME=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
```

- `node_modules/.remotion/chrome-for-testing/...` also exists but is a
  full Chrome, not a headless shell — old-headless mode is gone so
  Remotion errors out with "Failed to launch the browser process".
- `headless_shell --version` should report Chromium ≥ 140.

## Render commands

```bash
# Preview a single frame — much faster than full video
npx remotion still src/index.ts AsdDemo out/preview.png \
  --frame=230 --browser-executable=$CHROME --log=error

# Full 1080p (~3-5 min)
npx remotion render src/index.ts AsdDemo out/asd-demo.mp4 \
  --browser-executable=$CHROME --log=error

# 540p mobile fallback — same duration, half resolution
npx remotion render src/index.ts AsdDemo out/asd-demo-540p.mp4 \
  --browser-executable=$CHROME --scale=0.5 --log=error
```

Watch-outs:
- `--frame=N` is invalid on `render`; it's `--frames=a-b`. For a single
  frame, use `still`.
- `--log=error` keeps the Bash tool output short; the default emits a
  progress line per frame (~1350 lines for the 45s cut).
- Always `npx eslint src` before rendering — unused imports fail `build`
  but not `render`, so they surface later as PR noise.

## Composition math

- `AsdDemo` is 30fps. Duration in seconds = `durationInFrames / 30`.
- `Root.tsx` `durationInFrames` must equal the effective length of
  `<TransitionSeries>`, which is:

  ```
  sum(sequence durations) − (num_transitions × TRANSITION_FRAMES)
  ```

  `TRANSITION_FRAMES = 15` and there are 6 transitions, so subtract 90.
- 45s cut budget (1350 frames, sequences sum to 1440):
  Hero 130 · Audiences 220 · TrainingAI 240 · Careers 240 ·
  FeaturesGrid 240 · Trust 195 · CTA 175.
- If `durationInFrames` is shorter than the sum, the trailing scene
  gets cut off mid-animation. Update both `Root.tsx` and `Composition.tsx`
  together.

## Scene patterns (reusable)

Every scene follows the same shape:

```tsx
const headerOpacity = interpolate(frame, [0, 0.9 * fps], [0, 1], clampOpts);
const headerY = interpolate(frame, [0, 0.9 * fps], [16, 0], bezierOpts);
```

Card entrances use a small helper:

```tsx
const useCardAnim = (startSec, endSec) => ({
  opacity: interpolate(frame, [startSec*fps, endSec*fps], [0, 1], clamp),
  y: interpolate(frame, [startSec*fps, endSec*fps], [28, 0], bezier),
});
```

Preferred easing everywhere: `Easing.bezier(0.16, 1, 0.3, 1)` (smooth
ease-out). Avoid `Easing.linear` — it looks mechanical.

## Animation timing heuristics

These feel calm without being sluggish at 30fps:

| Element                      | Window       | Stagger between siblings |
| ---------------------------- | ------------ | ------------------------ |
| Scene header enter           | 0.9–1.0s     | —                        |
| Card row (3 across)          | 1.0–1.2s     | 0.3–0.5s                 |
| Grid (6–9 cards)             | 1.0–1.1s     | 0.2–0.25s                |
| Hero logo / CTA card         | 1.2–1.4s     | —                        |
| Subtitle after headline      | +0.6s offset | —                        |

Rule of thumb: to "slow down" a scene, multiply all windows and
staggers by ~1.5 and bump sequence duration by the same factor.

## Layout gotchas

- `alignItems: "stretch"` + parent `flex: 1` → cards fill the entire
  vertical area, which leaves whitespace below content. **Drop the
  parent's `flex: 1`** so cards stretch only to the tallest sibling's
  content, not the whole frame.
- `alignItems: "flex-start"` → each card is natural-height, so cards
  with lighter content look visibly shorter. Use when that's desired.
- `flex: 1` on individual cards inside a row ensures equal widths.
- Grids: `gridTemplateColumns: "repeat(3, 1fr)"` + `gridAutoRows: "1fr"`
  gives 3×N uniform cells.
- Card radii: 20–28px reads as "modern but not cartoonish".
- Shadows: `0 18–30px 40–80px rgba(0,0,0,0.25–0.45)` for floating cards
  against the dark bg.

## Iteration workflow

1. Edit the scene.
2. Render one representative still (`remotion still ... --frame=N`).
3. Read the PNG with the Read tool — catches layout breakage in seconds.
4. Only when the still looks right, render the full MP4.
5. Copy to `public/`:

   ```bash
   cp out/asd-demo.mp4        ../public/asd-demo.mp4
   cp out/asd-demo-540p.mp4   ../public/asd-demo-540p.mp4
   ```

6. Commit, push feature branch, fast-forward `main`, push `main`.

Representative preview frames for each scene (at the current budget):

| Scene          | Frame |
| -------------- | ----- |
| Hero           | 60    |
| Audiences      | 230   |
| TrainingAI     | 500   |
| Careers        | 750   |
| FeaturesGrid   | 990   |
| Trust          | 1200  |
| CTA            | 1300  |

## Theme & icons

- All colours live in `src/theme.ts` — never hard-code hex in a scene.
- Gradient on icon tiles: `linear-gradient(135deg, ${role.color} 0%,
  ${theme.accent2} 130%)`. Second stop > 100% pushes the accent into
  the corner without washing out the base colour.
- Icons are stroke-only 24×24 SVGs in `src/components/Icons.tsx`.
  New icons follow the existing `stroke="currentColor"` /
  `strokeWidth: 1.75` pattern so they scale cleanly at any size.
- UK English copy everywhere (CLAUDE.md rule). Never "color", never
  "organization". Never mention diagnosing ASD.

## Output pipeline

`public/asd-demo.mp4` + `public/asd-demo-540p.mp4` are served as static
files from the Next.js app at `/asd-demo.mp4` / `/asd-demo-540p.mp4`.
There is no server-side streaming; just commit the MP4s. Expect
~5-6 MB at 1080p and ~3 MB at 540p for the 45s cut.

## Things I'd do differently next time

- Parameterise scene durations in `Composition.tsx` from a single
  `SCENE_BUDGET` object so slowing/speeding the whole video is one edit.
- Build a `SceneShell` component with the shared header pattern so a
  new scene is ~30 lines, not ~100.
- Add a `check-<scene>` npm script that renders the representative
  still frame for each scene — no more remembering frame numbers.
- Store the headless-shell path in `remotion.config.ts` via
  `Config.setBrowserExecutable()` so `--browser-executable` isn't
  needed on the CLI.
