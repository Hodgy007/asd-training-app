import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Theme } from "../../theme";

export const useHeader = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, 0.9 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [0, 0.9 * fps], [16, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return { opacity, y };
};

export const useCardAnim = (startSec: number, endSec: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [startSec * fps, endSec * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [startSec * fps, endSec * fps], [28, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return { opacity, y };
};

export const SceneHeader: React.FC<{
  theme: Theme;
  eyebrow: string;
  title: string;
}> = ({ theme, eyebrow, title }) => {
  const { opacity, y } = useHeader();
  return (
    <div style={{ opacity, transform: `translateY(${y}px)` }}>
      <div
        style={{
          fontSize: 26,
          color: theme.accent,
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        {eyebrow}
      </div>
      <div
        style={{
          fontSize: 54,
          fontWeight: 700,
          color: theme.text,
          letterSpacing: -1.5,
          marginTop: 10,
          lineHeight: 1.12,
          maxWidth: 1500,
        }}
      >
        {title}
      </div>
    </div>
  );
};
