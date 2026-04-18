import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fontStack, Theme } from "../../theme";

export const SceneOrgCTA: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = interpolate(frame, [0, 1.2 * fps], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cardY = interpolate(enter, [0, 1], [30, 0]);
  const cardScale = interpolate(enter, [0, 1], [0.94, 1]);

  const ctaOpacity = interpolate(frame, [1.0 * fps, 2.2 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const pulse =
    1 +
    0.03 *
      Math.sin(
        interpolate(frame, [1.5 * fps, 5.5 * fps], [0, Math.PI * 2], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      );

  const isDark = theme.mode === "dark";

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
          gap: 34,
          opacity: enter,
          transform: `translateY(${cardY}px) scale(${cardScale})`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            padding: "28px 48px",
            borderRadius: 22,
            background: "white",
            boxShadow: isDark
              ? "0 30px 80px rgba(73,199,237,0.25)"
              : "0 18px 40px rgba(0,21,34,0.08)",
            border: isDark ? "none" : `1px solid ${theme.cardBorder}`,
          }}
        >
          <Img
            src={staticFile("logo-aaa.svg")}
            style={{ width: 460, height: "auto", display: "block" }}
          />
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: theme.text,
            letterSpacing: -1.5,
            maxWidth: 1500,
            lineHeight: 1.1,
          }}
        >
          Build a truly inclusive workplace
        </div>
        <div
          style={{
            fontSize: 28,
            color: theme.textMuted,
            maxWidth: 1200,
            lineHeight: 1.35,
          }}
        >
          From Ambitious about Autism — for forward-thinking employers.
        </div>
        <div
          style={{
            marginTop: 12,
            padding: "22px 52px",
            borderRadius: 999,
            background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accent2} 100%)`,
            color: "white",
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: -0.4,
            boxShadow: isDark
              ? "0 30px 80px rgba(73,199,237,0.45)"
              : "0 18px 40px rgba(245,130,32,0.35)",
            opacity: ctaOpacity,
            transform: `scale(${pulse})`,
          }}
        >
          ambitiousaboutautism.org.uk
        </div>
      </div>
    </AbsoluteFill>
  );
};
