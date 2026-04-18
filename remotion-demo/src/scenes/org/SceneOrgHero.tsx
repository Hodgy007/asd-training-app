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

export const SceneOrgHero: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = interpolate(frame, [0, 1.4 * fps], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const logoScale = interpolate(enter, [0, 1], [0.92, 1]);
  const logoY = interpolate(enter, [0, 1], [20, 0]);

  const titleOpacity = interpolate(frame, [0.7 * fps, 2.0 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [0.7 * fps, 2.0 * fps], [24, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const subOpacity = interpolate(frame, [1.3 * fps, 2.6 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isDark = theme.mode === "dark";

  return (
    <AbsoluteFill
      style={{
        background: isDark
          ? `radial-gradient(1400px 900px at 50% 45%, ${theme.bgSoft} 0%, ${theme.bg} 70%)`
          : `radial-gradient(1400px 900px at 50% 45%, ${theme.bgSoft} 0%, ${theme.bg} 70%)`,
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
          gap: 44,
        }}
      >
        <div
          style={{
            padding: "44px 64px",
            borderRadius: 28,
            background: "white",
            boxShadow: isDark
              ? "0 40px 100px rgba(73,199,237,0.25)"
              : "0 24px 60px rgba(0,21,34,0.08)",
            opacity: enter,
            transform: `translateY(${logoY}px) scale(${logoScale})`,
            border: isDark ? "none" : `1px solid ${theme.cardBorder}`,
          }}
        >
          <Img
            src={staticFile("logo-aaa.svg")}
            style={{ width: 620, height: "auto", display: "block" }}
          />
        </div>
        <div
          style={{
            fontSize: 58,
            fontWeight: 700,
            letterSpacing: -1.4,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            textAlign: "center",
            maxWidth: 1500,
            lineHeight: 1.1,
          }}
        >
          Empowering employers. Changing lives.
        </div>
        <div
          style={{
            fontSize: 26,
            color: theme.textMuted,
            opacity: subOpacity,
            textAlign: "center",
            maxWidth: 1100,
            lineHeight: 1.4,
          }}
        >
          The UK&apos;s leading charity for autistic children, young people and their families.
        </div>
      </div>
    </AbsoluteFill>
  );
};
