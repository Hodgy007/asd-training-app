import { AbsoluteFill } from "remotion";
import { IconBook, IconChart, IconSurvey } from "../../components/Icons";
import { fontStack, Theme } from "../../theme";
import { SceneHeader, useCardAnim } from "./shell";
import { SceneVoiceover } from "./SceneVoiceover";

type Capability = {
  Icon: React.FC<{ size?: number; color?: string }>;
  title: string;
  stat: string;
  statLabel: string;
  colorKey: keyof Pick<Theme, "accent" | "accent2" | "success">;
};

const CAPABILITIES: Capability[] = [
  {
    Icon: IconBook,
    title: "Training modules",
    stat: "68%",
    statLabel: "average completion",
    colorKey: "accent",
  },
  {
    Icon: IconSurvey,
    title: "Surveys & feedback",
    stat: "147",
    statLabel: "responses this quarter",
    colorKey: "accent2",
  },
  {
    Icon: IconChart,
    title: "Reports & analytics",
    stat: "Live",
    statLabel: "dashboards per org",
    colorKey: "success",
  },
];

export const SceneOrgPlatform: React.FC<{ theme: Theme; voiceoverSrc?: string; durationInFrames: number }> = ({
  theme,
  voiceoverSrc,
  durationInFrames,
}) => {
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
      <SceneHeader theme={theme} eyebrow="Supported by technology" title="Track impact with our digital platform" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 28,
          alignItems: "stretch",
        }}
      >
        {CAPABILITIES.map((c, i) => {
          const { Icon } = c;
          const anim = anims[i];
          const cardColor = theme[c.colorKey];
          return (
            <div
              key={c.title}
              style={{
                background: theme.card,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: 24,
                padding: "36px 32px",
                display: "flex",
                flexDirection: "column",
                gap: 20,
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
                  background: `linear-gradient(135deg, ${cardColor} 0%, ${theme.accent} 140%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={40} color="white" />
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: theme.text,
                  letterSpacing: -0.4,
                }}
              >
                {c.title}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div
                  style={{
                    fontSize: 56,
                    fontWeight: 800,
                    color: cardColor,
                    letterSpacing: -2,
                    lineHeight: 1,
                  }}
                >
                  {c.stat}
                </div>
                <div style={{ fontSize: 18, color: theme.textMuted }}>{c.statLabel}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          fontSize: 22,
          color: theme.textMuted,
          fontWeight: 500,
          textAlign: "center",
        }}
      >
        Everything measurable. Nothing guesswork.
      </div>
      <SceneVoiceover src={voiceoverSrc} durationInFrames={durationInFrames} />
    </AbsoluteFill>
  );
};
