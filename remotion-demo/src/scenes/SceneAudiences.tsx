import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { fontStack, theme } from "../theme";

type Persona = {
  icon: string;
  title: string;
  sub: string;
  bullets: string[];
  color: string;
};

const PERSONAS: Persona[] = [
  {
    icon: "👥",
    title: "Practitioners",
    sub: "Caregivers, nursery workers, health visitors",
    bullets: ["ASD awareness training", "Child observation logs", "AI-supported insights"],
    color: theme.accent,
  },
  {
    icon: "🎓",
    title: "Careers users",
    sub: "Students, interns, employees & careers pros",
    bullets: ["Careers CPD training", "AI CV Builder", "AI Careers Advisor"],
    color: theme.accent2,
  },
  {
    icon: "🛡️",
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

  return (
    <div
      style={{
        flex: 1,
        background: theme.card,
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: 28,
        padding: "44px 40px",
        opacity: enter,
        transform: `translateY(${y}px)`,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
      }}
    >
      <div
        style={{
          width: 84,
          height: 84,
          borderRadius: 20,
          background: `linear-gradient(135deg, ${persona.color} 0%, ${theme.accent2} 120%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 44,
        }}
      >
        {persona.icon}
      </div>
      <div style={{ fontSize: 38, fontWeight: 700, color: theme.text, letterSpacing: -0.5 }}>
        {persona.title}
      </div>
      <div style={{ fontSize: 20, color: theme.textMuted, marginTop: -8 }}>{persona.sub}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
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
