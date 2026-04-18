import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { fontStack, theme } from "../theme";

export const SceneHero: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = interpolate(frame, [0, 0.8 * fps], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const logoScale = interpolate(enter, [0, 1], [0.85, 1]);
  const logoY = interpolate(enter, [0, 1], [20, 0]);
  const titleY = interpolate(frame, [0.3 * fps, 1.1 * fps], [24, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleOpacity = interpolate(frame, [0.3 * fps, 1.1 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subOpacity = interpolate(frame, [0.7 * fps, 1.4 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1200px 800px at 50% 40%, ${theme.bgSoft} 0%, ${theme.bg} 70%)`,
        fontFamily: fontStack,
        color: theme.text,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
          transform: `translateY(${logoY}px)`,
        }}
      >
        <div
          style={{
            width: 160,
            height: 160,
            borderRadius: 36,
            background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accent2} 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 30px 80px rgba(99, 102, 241, 0.35)",
            transform: `scale(${logoScale})`,
            opacity: enter,
          }}
        >
          <svg width={80} height={80} viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2 L2 20 H22 Z"
              fill="white"
              opacity={0.95}
            />
            <circle cx={12} cy={14} r={2.6} fill={theme.accent} />
          </svg>
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: -1.5,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            textAlign: "center",
            maxWidth: 1400,
            lineHeight: 1.1,
          }}
        >
          ASD Early Identification Training Platform
        </div>
        <div
          style={{
            fontSize: 28,
            color: theme.textMuted,
            opacity: subOpacity,
            textAlign: "center",
            maxWidth: 1000,
          }}
        >
          Training, observation, and careers support — built for your charity.
        </div>
      </div>
    </AbsoluteFill>
  );
};
