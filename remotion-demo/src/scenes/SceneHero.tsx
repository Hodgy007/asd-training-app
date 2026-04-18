import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fontStack, theme } from "../theme";

export const SceneHero: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = interpolate(frame, [0, 1.4 * fps], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const logoScale = interpolate(enter, [0, 1], [0.92, 1]);
  const logoY = interpolate(enter, [0, 1], [16, 0]);

  const titleY = interpolate(frame, [0.6 * fps, 1.9 * fps], [20, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleOpacity = interpolate(frame, [0.6 * fps, 1.9 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subOpacity = interpolate(frame, [1.2 * fps, 2.3 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1400px 900px at 50% 45%, ${theme.bgSoft} 0%, ${theme.bg} 70%)`,
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
          gap: 40,
        }}
      >
        <div
          style={{
            padding: "44px 64px",
            borderRadius: 28,
            background: "white",
            boxShadow: "0 40px 100px rgba(73, 199, 237, 0.25)",
            opacity: enter,
            transform: `translateY(${logoY}px) scale(${logoScale})`,
          }}
        >
          <Img
            src={staticFile("logo-aaa.svg")}
            style={{ width: 620, height: "auto", display: "block" }}
          />
        </div>
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            letterSpacing: -1.2,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            textAlign: "center",
            maxWidth: 1400,
            lineHeight: 1.1,
          }}
        >
          Digital Platform
        </div>
        <div
          style={{
            fontSize: 26,
            color: theme.textMuted,
            opacity: subOpacity,
            textAlign: "center",
            maxWidth: 1000,
          }}
        >
          Training, observation and careers support — for the charity and its community.
        </div>
      </div>
    </AbsoluteFill>
  );
};
