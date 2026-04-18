import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { IconCheck } from "../../components/Icons";
import { fontStack, Theme } from "../../theme";
import { SceneHeader } from "./shell";

const JOURNEY = [
  "Placement matching",
  "Mentor pairing",
  "Structured check-ins",
  "Skills development",
  "Progress review",
  "Job offer & hand-off",
];

const OUTCOMES = [
  { label: "Real skills", colorKey: "accent" as const },
  { label: "Real confidence", colorKey: "accent2" as const },
  { label: "Real careers", colorKey: "success" as const },
];

export const SceneOrgInternship: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const leftEnter = interpolate(frame, [0.4 * fps, 1.6 * fps], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rightEnter = interpolate(frame, [0.9 * fps, 2.1 * fps], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const stepProgress = interpolate(frame, [1.6 * fps, 7.0 * fps], [0, JOURNEY.length - 0.001], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const activeStep = Math.floor(stepProgress);

  return (
    <AbsoluteFill
      style={{
        background: theme.bg,
        fontFamily: fontStack,
        padding: "100px 120px",
        gap: 40,
      }}
    >
      <SceneHeader theme={theme} eyebrow="For your pipeline" title="Guided internship programme" />
      <div style={{ display: "flex", gap: 36, flex: 1 }}>
        <div
          style={{
            flex: 1.4,
            background: theme.card,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: 24,
            padding: 40,
            opacity: leftEnter,
            transform: `translateY(${interpolate(leftEnter, [0, 1], [24, 0])}px)`,
            display: "flex",
            flexDirection: "column",
            gap: 18,
            boxShadow: theme.cardShadow,
          }}
        >
          <div style={{ fontSize: 22, color: theme.accent, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
            Intern journey
          </div>
          <div style={{ fontSize: 30, color: theme.text, fontWeight: 700, letterSpacing: -0.5 }}>
            Real-world experience, wrapped in support
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
            {JOURNEY.map((s, i) => {
              const isActive = i === activeStep;
              const isDone = i < activeStep;
              return (
                <div
                  key={s}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: isActive ? theme.pillBg : "transparent",
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      background: isDone
                        ? theme.success
                        : isActive
                          ? theme.accent
                          : theme.subtleFill,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: 14,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {isDone ? <IconCheck size={16} color="white" /> : i + 1}
                  </div>
                  <div
                    style={{
                      fontSize: 21,
                      color: isActive || isDone ? theme.text : theme.textMuted,
                      fontWeight: isActive ? 700 : 500,
                    }}
                  >
                    {s}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 20,
            opacity: rightEnter,
            transform: `translateY(${interpolate(rightEnter, [0, 1], [24, 0])}px)`,
          }}
        >
          {OUTCOMES.map((o, i) => {
            const localFrame = frame - (2.0 + i * 0.6) * fps;
            const enter = interpolate(localFrame, [0, 1.0 * fps], [0, 1], {
              easing: Easing.bezier(0.16, 1, 0.3, 1),
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const cardColor = theme[o.colorKey];
            return (
              <div
                key={o.label}
                style={{
                  padding: "36px 40px",
                  borderRadius: 22,
                  background: theme.card,
                  border: `2px solid ${cardColor}`,
                  boxShadow: theme.cardShadow,
                  opacity: enter,
                  transform: `translateY(${interpolate(enter, [0, 1], [18, 0])}px)`,
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 999,
                    background: cardColor,
                  }}
                />
                <div
                  style={{
                    fontSize: 34,
                    fontWeight: 700,
                    color: theme.text,
                    letterSpacing: -0.8,
                  }}
                >
                  {o.label}
                </div>
              </div>
            );
          })}
          <div
            style={{
              marginTop: 12,
              fontSize: 20,
              color: theme.textMuted,
              lineHeight: 1.5,
              opacity: interpolate(frame, [4.0 * fps, 5.2 * fps], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            Every placement backed by job coaches, mentor training and ongoing evaluation.
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
