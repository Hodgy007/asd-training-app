import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { fontStack, Theme } from "../../theme";
import { SceneHeader } from "./shell";

const STRENGTHS = [
  "Exceptional focus",
  "Loyalty",
  "Attention to detail",
  "Systems thinking",
  "Pattern recognition",
];

export const SceneOrgOpportunity: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const statOpacity = interpolate(frame, [0.8 * fps, 2.2 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const statScale = interpolate(frame, [0.8 * fps, 2.2 * fps], [0.9, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const percent = Math.round(
    interpolate(frame, [1.1 * fps, 2.6 * fps], [0, 22], {
      easing: Easing.bezier(0.2, 0.9, 0.3, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  return (
    <AbsoluteFill
      style={{
        background: theme.bg,
        fontFamily: fontStack,
        padding: "100px 120px",
        gap: 40,
      }}
    >
      <SceneHeader theme={theme} eyebrow="Why it matters" title="The employment gap is real — and closable" />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: 36,
        }}
      >
        <div
          style={{
            opacity: statOpacity,
            transform: `scale(${statScale})`,
            display: "flex",
            alignItems: "baseline",
            gap: 28,
          }}
        >
          <div
            style={{
              fontSize: 220,
              fontWeight: 800,
              color: theme.accent2,
              letterSpacing: -6,
              lineHeight: 1,
            }}
          >
            {percent}%
          </div>
          <div
            style={{
              fontSize: 28,
              color: theme.text,
              maxWidth: 780,
              lineHeight: 1.35,
              fontWeight: 500,
            }}
          >
            of autistic adults are in full-time employment in the UK — one of the lowest rates of
            any disabled group.
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", maxWidth: 1500 }}>
          {STRENGTHS.map((s, i) => {
            const localFrame = frame - (2.4 + i * 0.25) * fps;
            const enter = interpolate(localFrame, [0, 0.8 * fps], [0, 1], {
              easing: Easing.bezier(0.16, 1, 0.3, 1),
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const pillY = interpolate(enter, [0, 1], [12, 0]);
            return (
              <div
                key={s}
                style={{
                  padding: "14px 26px",
                  borderRadius: 999,
                  background: theme.pillBg,
                  border: `1.5px solid ${theme.accent}`,
                  color: theme.text,
                  fontSize: 22,
                  fontWeight: 600,
                  opacity: enter,
                  transform: `translateY(${pillY}px)`,
                }}
              >
                {s}
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontSize: 24,
            color: theme.textMuted,
            fontWeight: 500,
            opacity: interpolate(frame, [4.2 * fps, 5.2 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          With the right support, autistic employees thrive.
        </div>
      </div>
    </AbsoluteFill>
  );
};
