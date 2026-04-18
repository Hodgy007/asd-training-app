import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  IconBook,
  IconBuilding,
  IconChart,
  IconCohort,
  IconGraduation,
  IconShield,
  IconUsers,
  IconVideo,
} from "../components/Icons";
import { fontStack, theme } from "../theme";

type Role = {
  Icon: React.FC<{ size?: number; color?: string }>;
  title: string;
  features: string[];
  color: string;
};

const ROLES: Role[] = [
  {
    Icon: IconShield,
    title: "Charity Admin",
    features: ["Organisations", "Training content", "Platform reports"],
    color: theme.accent,
  },
  {
    Icon: IconUsers,
    title: "Charity Employee",
    features: ["Delegated permissions", "Surveys & library", "Workshops"],
    color: theme.accent2,
  },
  {
    Icon: IconBuilding,
    title: "Org Admin",
    features: ["User management", "Announcements", "Meeting settings & SSO"],
    color: theme.warning,
  },
  {
    Icon: IconUsers,
    title: "Practitioner",
    features: ["Child observations", "ASD training", "AI pattern insights"],
    color: theme.accent,
  },
  {
    Icon: IconGraduation,
    title: "Careers Professional",
    features: ["Careers CPD training", "Student CV views", "Workshops"],
    color: theme.accent2,
  },
  {
    Icon: IconBook,
    title: "Student",
    features: ["CV Builder wizard", "AI Careers Advisor", "Assigned training"],
    color: theme.success,
  },
  {
    Icon: IconCohort,
    title: "Intern",
    features: ["Workplace readiness", "CV Builder", "Document library"],
    color: theme.pink,
  },
  {
    Icon: IconVideo,
    title: "Employee",
    features: ["Upskilling modules", "Careers Advisor", "Workshops"],
    color: theme.warning,
  },
  {
    Icon: IconChart,
    title: "Everyone",
    features: ["Surveys & feedback", "Targeted library", "Notifications"],
    color: theme.success,
  },
];

const RoleCard: React.FC<{ role: Role; delay: number }> = ({ role, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame - delay;
  const enter = interpolate(localFrame, [0, 1.2 * fps], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(enter, [0, 1], [28, 0]);
  const { Icon } = role;

  return (
    <div
      style={{
        background: theme.card,
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: 22,
        padding: "22px 24px",
        opacity: enter,
        transform: `translateY(${y}px)`,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        boxShadow: "0 18px 44px rgba(0,0,0,0.35)",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: `linear-gradient(135deg, ${role.color} 0%, ${theme.accent2} 130%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={30} color="white" />
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: theme.text,
            letterSpacing: -0.4,
          }}
        >
          {role.title}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 2 }}>
        {role.features.map((f) => (
          <div
            key={f}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 16,
              color: theme.textMuted,
              lineHeight: 1.3,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: role.color,
                flexShrink: 0,
              }}
            />
            {f}
          </div>
        ))}
      </div>
    </div>
  );
};

export const SceneAudiences: React.FC = () => {
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
        padding: "90px 110px",
        gap: 36,
      }}
    >
      <div style={{ opacity: headerOpacity, transform: `translateY(${headerY}px)` }}>
        <div style={{ fontSize: 26, color: theme.accent2, fontWeight: 600 }}>One platform</div>
        <div
          style={{
            fontSize: 54,
            fontWeight: 700,
            color: theme.text,
            letterSpacing: -1.5,
            marginTop: 8,
          }}
        >
          Multiple roles, one bespoke digital offering
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gridAutoRows: "1fr",
          gap: 20,
          flex: 1,
        }}
      >
        {ROLES.map((role, i) => (
          <RoleCard key={role.title} role={role} delay={(0.4 + i * 0.22) * fps} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
