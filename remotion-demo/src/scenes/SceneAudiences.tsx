import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { IconGraduation, IconShield, IconUsers } from "../components/Icons";
import { fontStack, theme } from "../theme";

type Persona = {
  Icon: React.FC<{ size?: number; color?: string }>;
  title: string;
  sub: string;
  bullets: string[];
  color: string;
};

const PERSONAS: Persona[] = [
  {
    Icon: IconUsers,
    title: "Practitioners",
    sub: "Caregivers, nursery workers, health visitors",
    bullets: ["ASD awareness training", "Child observation logs", "AI-supported insights"],
    color: theme.accent,
  },
  {
    Icon: IconGraduation,
    title: "Careers users",
    sub: "Students, interns, employees & careers pros",
    bullets: ["Careers CPD training", "AI CV Builder", "AI Careers Advisor"],
    color: theme.accent2,
  },
  {
    Icon: IconShield,
    title: "Administrators",
    sub: "Charity admins & organisation admins",
    bullets: ["Users & permissions", "Content & reports", "Multi-tenant control"],
    color: theme.success,
  },
];

const PersonaCard: React.FC<{ persona: Persona; delay: number }> = ({ persona, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame - delay;
  const enter = interpolate(localFrame, [0, 0.8 * fps], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(enter, [0, 1], [36, 0]);
  const { Icon } = persona;

  return (
    <div
      style={{
        flex: 1,
        background: theme.card,
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: 28,
        padding: "48px 44px",
        opacity: enter,
        transform: `translateY(${y}px)`,
        display: "flex",
        flexDirection: "column",
        gap: 22,
        boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
      }}
    >
      <div
        style={{
          width: 104,
          height: 104,
          borderRadius: 26,
          background: `linear-gradient(135deg, ${persona.color} 0%, ${theme.accent2} 120%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={56} color="white" />
      </div>
      <div style={{ fontSize: 38, fontWeight: 700, color: theme.text, letterSpacing: -0.5 }}>
        {persona.title}
      </div>
      <div style={{ fontSize: 20, color: theme.textMuted, marginTop: -10 }}>{persona.sub}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 6 }}>
        {persona.bullets.map((b) => (
          <div key={b} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                background: persona.color,
              }}
            />
            <div style={{ fontSize: 22, color: theme.text }}>{b}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SceneAudiences: React.FC = () => {
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
        padding: "110px 120px",
        gap: 48,
      }}
    >
      <div style={{ opacity: headerOpacity, transform: `translateY(${headerY}px)` }}>
        <div style={{ fontSize: 26, color: theme.accent2, fontWeight: 600 }}>One platform</div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: theme.text,
            letterSpacing: -1.5,
            marginTop: 8,
          }}
        >
          Three audiences, one place
        </div>
      </div>
      <div style={{ display: "flex", gap: 28, flex: 1 }}>
        {PERSONAS.map((p, i) => (
          <PersonaCard key={p.title} persona={p} delay={(0.3 + i * 0.25) * fps} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
