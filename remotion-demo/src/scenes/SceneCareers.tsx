import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { fontStack, theme } from "../theme";

const CV_STEPS = [
  "Personal details",
  "Personal statement",
  "Work experience",
  "Education",
  "Skills",
  "Interests",
  "References",
  "Review & download",
];

const AI_SUGGESTIONS = [
  "Strengths you bring to teams",
  "3 career paths that suit you",
  "Next steps (UK resources)",
];

export const SceneCareers: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headerY = interpolate(frame, [0, 0.5 * fps], [16, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const leftEnter = interpolate(frame, [0.25 * fps, 1.0 * fps], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rightEnter = interpolate(frame, [0.55 * fps, 1.3 * fps], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const stepProgress = interpolate(frame, [1.0 * fps, 4.0 * fps], [0, CV_STEPS.length - 0.001], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const activeStep = Math.floor(stepProgress);

  return (
    <AbsoluteFill
      style={{
        background: theme.bg,
        fontFamily: fontStack,
        padding: "90px 120px",
        gap: 40,
      }}
    >
      <div style={{ opacity: headerOpacity, transform: `translateY(${headerY}px)` }}>
        <div style={{ fontSize: 26, color: theme.accent2, fontWeight: 600 }}>Careers support</div>
        <div
          style={{
            fontSize: 54,
            fontWeight: 700,
            color: theme.text,
            letterSpacing: -1.5,
            marginTop: 8,
          }}
        >
          CVs and career guidance, made accessible
        </div>
      </div>
      <div style={{ display: "flex", gap: 32, flex: 1 }}>
        <div
          style={{
            flex: 1,
            background: theme.card,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: 24,
            padding: 40,
            opacity: leftEnter,
            transform: `translateY(${interpolate(leftEnter, [0, 1], [24, 0])}px)`,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div style={{ fontSize: 24, color: theme.accent, fontWeight: 700 }}>CV Builder</div>
          <div style={{ fontSize: 32, color: theme.text, fontWeight: 700, letterSpacing: -0.5 }}>
            8-step autism-friendly wizard
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
            {CV_STEPS.map((s, i) => {
              const isActive = i === activeStep;
              const isDone = i < activeStep;
              return (
                <div
                  key={s}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: isActive ? "rgba(99,102,241,0.18)" : "transparent",
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      background: isDone
                        ? theme.success
                        : isActive
                          ? theme.accent
                          : "rgba(148,163,184,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {isDone ? "✓" : i + 1}
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      color: isActive ? theme.text : theme.textMuted,
                      fontWeight: isActive ? 600 : 400,
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
            background: theme.card,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: 24,
            padding: 40,
            opacity: rightEnter,
            transform: `translateY(${interpolate(rightEnter, [0, 1], [24, 0])}px)`,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div style={{ fontSize: 24, color: theme.accent2, fontWeight: 700 }}>
            AI Careers Advisor
          </div>
          <div style={{ fontSize: 32, color: theme.text, fontWeight: 700, letterSpacing: -0.5 }}>
            Personalised, strength-first guidance
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 10 }}>
            {AI_SUGGESTIONS.map((s, i) => {
              const suggestionFrame = frame - (1.2 + i * 0.35) * fps;
              const suggestionOpacity = interpolate(suggestionFrame, [0, 0.6 * fps], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const suggestionY = interpolate(suggestionFrame, [0, 0.6 * fps], [16, 0], {
                easing: Easing.bezier(0.16, 1, 0.3, 1),
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={s}
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "flex-start",
                    padding: "16px 18px",
                    background: "rgba(34,211,238,0.08)",
                    border: `1px solid rgba(34,211,238,0.25)`,
                    borderRadius: 14,
                    opacity: suggestionOpacity,
                    transform: `translateY(${suggestionY}px)`,
                  }}
                >
                  <div style={{ fontSize: 22, color: theme.text }}>{s}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
