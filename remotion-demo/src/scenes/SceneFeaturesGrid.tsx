import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  IconBook,
  IconChart,
  IconCohort,
  IconPlug,
  IconSurvey,
  IconVideo,
} from "../components/Icons";
import { fontStack, theme } from "../theme";

type Feature = {
  Icon: React.FC<{ size?: number; color?: string }>;
  title: string;
  sub: string;
  color: string;
};

const FEATURES: Feature[] = [
  {
    Icon: IconVideo,
    title: "Virtual Workshops",
    sub: "Zoom & Teams with attendance tracking",
    color: theme.accent,
  },
  {
    Icon: IconBook,
    title: "Document Library",
    sub: "Targeted collections, per-org stats",
    color: theme.accent2,
  },
  {
    Icon: IconSurvey,
    title: "Surveys",
    sub: "5 question types, AI insights",
    color: theme.success,
  },
  {
    Icon: IconCohort,
    title: "Cohorts",
    sub: "Bulk-onboard walk-ins via QR cards",
    color: theme.warning,
  },
  {
    Icon: IconChart,
    title: "Reports & Analytics",
    sub: "Platform-wide and per-org dashboards",
    color: theme.pink,
  },
  {
    Icon: IconPlug,
    title: "Integration API",
    sub: "Pull data into Dynamics 365 & more",
    color: theme.accent2,
  },
];

const FeatureCard: React.FC<{ feature: Feature; delay: number }> = ({ feature, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame - delay;

  const enter = interpolate(localFrame, [0, 1.1 * fps], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(enter, [0, 1], [24, 0]);
  const { Icon } = feature;

  return (
    <div
      style={{
        background: theme.card,
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: 22,
        padding: "34px 34px",
        opacity: enter,
        transform: `translateY(${y}px)`,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        boxShadow: "0 16px 40px rgba(0,0,0,0.25)",
      }}
    >
      <div
        style={{
          width: 84,
          height: 84,
          borderRadius: 20,
          background: `linear-gradient(135deg, ${feature.color} 0%, rgba(34,211,238,0.8) 140%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={46} color="white" />
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

  const headerOpacity = interpolate(frame, [0, 0.9 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headerY = interpolate(frame, [0, 0.9 * fps], [16, 0], {
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
          <FeatureCard key={f.title} feature={f} delay={(0.5 + i * 0.22) * fps} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
