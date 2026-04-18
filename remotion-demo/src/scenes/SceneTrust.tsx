import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  IconAccessibility,
  IconBuilding,
  IconCheck,
  IconKey,
  IconLock,
} from "../components/Icons";
import { fontStack, theme } from "../theme";

type Badge = {
  Icon: React.FC<{ size?: number; color?: string }>;
  title: string;
  sub: string;
};

const BADGES: Badge[] = [
  { Icon: IconLock, title: "MFA for admins", sub: "TOTP enforced" },
  { Icon: IconKey, title: "SSO", sub: "Google, Microsoft, SAML" },
  { Icon: IconBuilding, title: "Multi-tenant", sub: "MATs, hubs, cohorts" },
  { Icon: IconAccessibility, title: "Accessible UX", sub: "Plain language, reduced motion" },
];

const BadgeChip: React.FC<{ badge: Badge; delay: number }> = ({ badge, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = interpolate(frame - delay, [0, 0.8 * fps], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const { Icon } = badge;

  return (
    <div
      style={{
        flex: 1,
        padding: "32px 32px",
        background: theme.card,
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: 20,
        display: "flex",
        alignItems: "center",
        gap: 22,
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [20, 0])}px)`,
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 16,
          background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accent2} 120%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={40} color="white" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 26, color: theme.text, fontWeight: 700 }}>{badge.title}</div>
        <div style={{ fontSize: 18, color: theme.textMuted }}>{badge.sub}</div>
      </div>
    </div>
  );
};

export const SceneTrust: React.FC = () => {
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

  const benefitOpacity = interpolate(frame, [1.4 * fps, 2.2 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: theme.bg,
        fontFamily: fontStack,
        padding: "110px 120px",
        gap: 40,
      }}
    >
      <div style={{ opacity: headerOpacity, transform: `translateY(${headerY}px)` }}>
        <div style={{ fontSize: 26, color: theme.accent2, fontWeight: 600 }}>Built for trust</div>
        <div
          style={{
            fontSize: 54,
            fontWeight: 700,
            color: theme.text,
            letterSpacing: -1.5,
            marginTop: 8,
          }}
        >
          Secure, inclusive, ready to scale
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {BADGES.map((b, i) => (
          <BadgeChip key={b.title} badge={b} delay={(0.3 + i * 0.15) * fps} />
        ))}
      </div>
      <div
        style={{
          marginTop: 16,
          padding: "28px 36px",
          background: "rgba(52,211,153,0.08)",
          border: "1px solid rgba(52,211,153,0.3)",
          borderRadius: 20,
          display: "flex",
          gap: 20,
          alignItems: "center",
          opacity: benefitOpacity,
          transform: `translateY(${interpolate(benefitOpacity, [0, 1], [20, 0])}px)`,
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 14,
            background: theme.success,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <IconCheck size={32} color="white" />
        </div>
        <div style={{ fontSize: 22, color: theme.text, fontWeight: 500 }}>
          AI that never diagnoses. UK English. Strength-first. Rate-limited and audited.
        </div>
      </div>
    </AbsoluteFill>
  );
};
