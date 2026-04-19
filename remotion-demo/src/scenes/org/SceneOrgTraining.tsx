import { AbsoluteFill } from "remotion";
import { IconBook, IconCheck, IconUsers } from "../../components/Icons";
import { fontStack, Theme } from "../../theme";
import { SceneHeader, useCardAnim } from "./shell";
import { SceneVoiceover } from "./SceneVoiceover";

type Course = {
  Icon: React.FC<{ size?: number; color?: string }>;
  title: string;
  bullets: string[];
  colorKey: keyof Pick<Theme, "accent" | "accent2" | "success" | "lime">;
};

const COURSES: Course[] = [
  {
    Icon: IconUsers,
    title: "Autism Awareness",
    bullets: ["CPD-accredited", "All staff levels", "Online or in-person"],
    colorKey: "accent",
  },
  {
    Icon: IconCheck,
    title: "Inclusive Interviewing",
    bullets: [
      "Adapt your process",
      "Remove common barriers",
      "Unlock hidden talent",
    ],
    colorKey: "accent2",
  },
  {
    Icon: IconBook,
    title: "Onboarding Support",
    bullets: [
      "Structured first weeks",
      "Line-manager guidance",
      "Ongoing check-ins",
    ],
    colorKey: "success",
  },
];

export const SceneOrgTraining: React.FC<{ theme: Theme; voiceoverSrc?: string; durationInFrames: number }> = ({
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
      <SceneHeader theme={theme} eyebrow="For your team" title="Inclusive hiring & workplace training" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 28,
          alignItems: "stretch",
        }}
      >
        {COURSES.map((c, i) => {
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
                padding: "34px 32px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                boxShadow: theme.cardShadow,
                opacity: anim.opacity,
                transform: `translateY(${anim.y}px)`,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 6,
                  background: cardColor,
                }}
              />
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
                  fontSize: 28,
                  fontWeight: 700,
                  color: theme.text,
                  letterSpacing: -0.5,
                  lineHeight: 1.2,
                }}
              >
                {c.title}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  marginTop: 4,
                }}
              >
                {c.bullets.map((b) => (
                  <div
                    key={b}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      fontSize: 18,
                      color: theme.textMuted,
                      lineHeight: 1.4,
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 999,
                        background: cardColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconCheck size={14} color="white" />
                    </div>
                    {b}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <SceneVoiceover src={voiceoverSrc} durationInFrames={durationInFrames} />
    </AbsoluteFill>
  );
};
