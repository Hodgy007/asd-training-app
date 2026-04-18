import { AbsoluteFill } from "remotion";
import {
  IconAccessibility,
  IconChart,
  IconKey,
  IconUsers,
} from "../../components/Icons";
import { fontStack, Theme } from "../../theme";
import { SceneHeader, useCardAnim } from "./shell";

type Benefit = {
  Icon: React.FC<{ size?: number; color?: string }>;
  title: string;
  body: string;
  colorKey: keyof Pick<Theme, "accent" | "accent2" | "success" | "warning">;
};

const BENEFITS: Benefit[] = [
  {
    Icon: IconUsers,
    title: "Dedicated partnership manager",
    body: "A single named contact supporting your journey from first call to launch and beyond.",
    colorKey: "accent",
  },
  {
    Icon: IconKey,
    title: "CPD-accredited training",
    body: "Certified, evidence-based content your people will trust and put into practice.",
    colorKey: "accent2",
  },
  {
    Icon: IconChart,
    title: "Impact reporting & ESG evidence",
    body: "Meaningful data for your social value reporting, investors and leadership team.",
    colorKey: "success",
  },
  {
    Icon: IconAccessibility,
    title: "National network",
    body: "Join employers, schools and charities already driving systemic change.",
    colorKey: "warning",
  },
];

export const SceneOrgPartnership: React.FC<{ theme: Theme }> = ({ theme }) => {
  const anims = [
    useCardAnim(0.4, 1.6),
    useCardAnim(0.7, 1.9),
    useCardAnim(1.0, 2.2),
    useCardAnim(1.3, 2.5),
  ];

  return (
    <AbsoluteFill
      style={{
        background: theme.bg,
        fontFamily: fontStack,
        padding: "90px 120px",
        gap: 40,
      }}
    >
      <SceneHeader
        theme={theme}
        eyebrow="Partnership benefits"
        title="Join organisations already making a difference"
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          alignItems: "start",
        }}
      >
        {BENEFITS.map((b, i) => {
          const { Icon } = b;
          const anim = anims[i];
          const cardColor = theme[b.colorKey];
          return (
            <div
              key={b.title}
              style={{
                background: theme.card,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: 22,
                padding: "30px 32px",
                display: "flex",
                alignItems: "flex-start",
                gap: 22,
                boxShadow: theme.cardShadow,
                opacity: anim.opacity,
                transform: `translateY(${anim.y}px)`,
              }}
            >
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 16,
                  background: `linear-gradient(135deg, ${cardColor} 0%, ${theme.accent} 140%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={38} color="white" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: theme.text,
                    letterSpacing: -0.4,
                    lineHeight: 1.2,
                  }}
                >
                  {b.title}
                </div>
                <div style={{ fontSize: 18, color: theme.textMuted, lineHeight: 1.4 }}>
                  {b.body}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
