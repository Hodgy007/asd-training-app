import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { fontStack, theme } from "../theme";

export const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = interpolate(frame, [0, 0.8 * fps], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cardY = interpolate(enter, [0, 1], [30, 0]);
  const cardScale = interpolate(enter, [0, 1], [0.94, 1]);

  const ctaOpacity = interpolate(frame, [0.6 * fps, 1.4 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const pulse =
    1 +
    0.03 *
      Math.sin(
        interpolate(frame, [1 * fps, 3 * fps], [0, Math.PI * 2], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      );

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1400px 900px at 50% 50%, ${theme.bgSoft} 0%, ${theme.bg} 70%)`,
        fontFamily: fontStack,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 40,
          opacity: enter,
          transform: `translateY(${cardY}px) scale(${cardScale})`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 80,
            fontWeight: 700,
            color: theme.text,
            letterSpacing: -2,
            maxWidth: 1400,
            lineHeight: 1.05,
          }}
        >
          Start training your team today
        </div>
        <div
          style={{
            fontSize: 32,
            color: theme.textMuted,
            maxWidth: 1100,
          }}
        >
          Autism awareness, careers CPD and observation — one platform.
        </div>
        <div
          style={{
            marginTop: 24,
            padding: "28px 60px",
            borderRadius: 999,
            background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accent2} 100%)`,
            color: "white",
            fontSize: 36,
            fontWeight: 600,
            letterSpacing: -0.5,
            boxShadow: "0 30px 80px rgba(99,102,241,0.45)",
            opacity: ctaOpacity,
            transform: `scale(${pulse})`,
          }}
        >
          asd-training-app-v2.vercel.app
        </div>
      </div>
    </AbsoluteFill>
  );
};
