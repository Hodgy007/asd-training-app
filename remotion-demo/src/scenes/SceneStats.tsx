import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { fontStack, theme } from "../theme";

type Stat = {
  label: string;
  value: number;
  suffix?: string;
  color: string;
};

const STATS: Stat[] = [
  { label: "Practitioners trained", value: 1240, color: theme.accent },
  { label: "Observations logged", value: 8690, color: theme.accent2 },
  { label: "Lessons completed", value: 94, suffix: "%", color: theme.success },
];

const StatCard: React.FC<{ stat: Stat; delay: number }> = ({ stat, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame - delay;

  const enter = interpolate(localFrame, [0, 0.8 * fps], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const count = interpolate(localFrame, [0.1 * fps, 1.2 * fps], [0, stat.value], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        flex: 1,
        background: theme.card,
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: 24,
        padding: "40px 36px",
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px)`,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
      }}
    >
      <div
        style={{
          width: 8,
          height: 40,
          borderRadius: 4,
          background: stat.color,
        }}
      />
      <div
        style={{
          fontSize: 72,
          fontWeight: 700,
          letterSpacing: -2,
          color: theme.text,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}
      >
        {Math.round(count).toLocaleString()}
        {stat.suffix ?? ""}
      </div>
      <div style={{ fontSize: 22, color: theme.textMuted }}>{stat.label}</div>
    </div>
  );
};

export const SceneStats: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOpacity = interpolate(frame, [0, 0.6 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headerY = interpolate(frame, [0, 0.6 * fps], [16, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: theme.bg,
        fontFamily: fontStack,
        padding: "120px 140px",
        gap: 60,
      }}
    >
      <div
        style={{
          opacity: headerOpacity,
          transform: `translateY(${headerY}px)`,
        }}
      >
        <div style={{ fontSize: 28, color: theme.accent2, fontWeight: 600 }}>
          Platform at a glance
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: theme.text,
            letterSpacing: -1.5,
            marginTop: 8,
          }}
        >
          Real impact, measured every day
        </div>
      </div>
      <div style={{ display: "flex", gap: 28 }}>
        {STATS.map((s, i) => (
          <StatCard key={s.label} stat={s} delay={(0.3 + i * 0.2) * fps} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
