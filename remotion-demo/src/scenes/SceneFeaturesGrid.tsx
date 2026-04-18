import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { fontStack, theme } from "../theme";

type Feature = {
  icon: string;
  title: string;
  sub: string;
  color: string;
};

const FEATURES: Feature[] = [
  {
    icon: "🎥",
    title: "Virtual Workshops",
    sub: "Zoom & Teams with attendance tracking",
    color: theme.accent,
  },
  {
    icon: "📚",
    title: "Document Library",
    sub: "Targeted collections, per-org stats",
    color: theme.accent2,
  },
  {
    icon: "📊",
    title: "Surveys",
    sub: "5 question types, AI insights",
    color: theme.success,
  },
  {
    icon: "👥",
    title: "Cohorts",
    sub: "Bulk-onboard walk-ins via QR cards",
    color: theme.warning,
  },
  {
    icon: "📈",
    title: "Reports & Analytics",
    sub: "Platform-wide and per-org dashboards",
    color: theme.pink,
  },
  {
    icon: "🔌",
    title: "Integration API",
    sub: "Pull data into Dynamics 365 & more",
    color: theme.accent2,
  },
];

const FeatureCard: React.FC<{ feature: Feature; delay: number }> = ({ feature, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame - delay;

  const enter = interpolate(localFrame, [0, 0.7 * fps], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(enter, [0, 1], [24, 0]);

  return (
    <div
      style={{
        background: theme.card,
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: 22,
        padding: "32px 32px",
        opacity: enter,
        transform: `translateY(${y}px)`,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        boxShadow: "0 16px 40px rgba(0,0,0,0.25)",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: `linear-gradient(135deg, ${feature.color} 0%, rgba(34,211,238,0.8) 140%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 34,
        }}
      >
        {feature.icon}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: theme.text, letterSpacing: -0.5 }}>
        {feature.title}
      </div>
      <div style={{ fontSize: 19, color: theme.textMuted, lineHeight: 1.4 }}>{feature.sub}</div>
    </div>
  );
};

export const SceneFeaturesGrid: React.FC = () => {
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
        <div style={{ fontSize: 26, color: theme.accent2, fontWeight: 600 }}>
          Everything the charity needs
        </div>
        <div
          style={{
            fontSize: 54,
            fontWeight: 700,
            color: theme.text,
            letterSpacing: -1.5,
            marginTop: 8,
          }}
        >
          More than training
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gridAutoRows: "1fr",
          gap: 24,
          flex: 1,
        }}
      >
        {FEATURES.map((f, i) => (
          <FeatureCard key={f.title} feature={f} delay={(0.35 + i * 0.12) * fps} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
