import { AbsoluteFill } from "remotion";
import { IconBook, IconGraduation, IconShield } from "../../components/Icons";
import { fontStack, Theme } from "../../theme";
import { SceneHeader, useCardAnim } from "./shell";

type Fact = {
  Icon: React.FC<{ size?: number; color?: string }>;
  title: string;
  body: string;
  color: keyof Pick<Theme, "accent" | "accent2" | "accent3" | "success" | "lime">;
};

const FACTS: Fact[] = [
  {
    Icon: IconShield,
    title: "Founded 1997",
    body: "Over 25 years championing autistic people across the UK",
    color: "accent",
  },
  {
    Icon: IconGraduation,
    title: "Education, employment & advocacy",
    body: "Schools, post-16 education, careers support and national policy work",
    color: "accent2",
  },
  {
    Icon: IconBook,
    title: "Trusted nationally",
    body: "Partnering with schools, employers and public bodies across the country",
    color: "success",
  },
];

export const SceneOrgWho: React.FC<{ theme: Theme }> = ({ theme }) => {
  const anims = [
    useCardAnim(0.4, 1.6),
    useCardAnim(0.9, 2.1),
    useCardAnim(1.4, 2.6),
  ];

  return (
    <AbsoluteFill
      style={{
        background: theme.bg,
        fontFamily: fontStack,
        padding: "100px 120px",
        gap: 50,
      }}
    >
      <SceneHeader theme={theme} eyebrow="About us" title="Ambitious about Autism" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 28,
          alignItems: "start",
        }}
      >
        {FACTS.map((f, i) => {
          const { Icon } = f;
          const anim = anims[i];
          const colorValue = theme[f.color];
          return (
            <div
              key={f.title}
              style={{
                background: theme.card,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: 24,
                padding: "36px 32px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                boxShadow: theme.cardShadow,
                opacity: anim.opacity,
                transform: `translateY(${anim.y}px)`,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 18,
                  background: `linear-gradient(135deg, ${colorValue} 0%, ${theme.accent} 140%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={40} color="white" />
              </div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: theme.text,
                  letterSpacing: -0.5,
                  lineHeight: 1.2,
                }}
              >
                {f.title}
              </div>
              <div
                style={{
                  fontSize: 19,
                  color: theme.textMuted,
                  lineHeight: 1.45,
                }}
              >
                {f.body}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
