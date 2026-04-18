import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { IconCheck } from "../components/Icons";
import { fontStack, theme } from "../theme";

type CardAnim = { opacity: number; y: number };

const useCardAnim = (startSec: number, endSec: number): CardAnim => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [startSec * fps, endSec * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [startSec * fps, endSec * fps], [28, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return { opacity, y };
};

const CardShell: React.FC<{ anim: CardAnim; children: React.ReactNode }> = ({ anim, children }) => (
  <div
    style={{
      flex: 1,
      background: theme.card,
      border: `1px solid ${theme.cardBorder}`,
      borderRadius: 24,
      padding: "32px 32px",
      boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
      display: "flex",
      flexDirection: "column",
      gap: 18,
      opacity: anim.opacity,
      transform: `translateY(${anim.y}px)`,
      overflow: "hidden",
      position: "relative",
    }}
  >
    {children}
  </div>
);

const Chip: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <div
    style={{
      fontSize: 14,
      fontWeight: 700,
      color,
      letterSpacing: 1.5,
      textTransform: "uppercase",
    }}
  >
    {label}
  </div>
);

const TrainingCard: React.FC<{ anim: CardAnim }> = ({ anim }) => (
  <CardShell anim={anim}>
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 6,
        background: `linear-gradient(90deg, ${theme.accent} 0%, ${theme.accent2} 100%)`,
      }}
    />
    <Chip label="Module" color={theme.accent} />
    <div style={{ fontSize: 30, fontWeight: 700, color: theme.text, lineHeight: 1.15 }}>
      Understanding Autism
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 2 }}>
      <div
        style={{
          flex: 1,
          height: 14,
          borderRadius: 999,
          background: "rgba(148,163,184,0.18)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: "70%",
            height: "100%",
            background: `linear-gradient(90deg, ${theme.accent} 0%, ${theme.accent2} 100%)`,
          }}
        />
      </div>
      <div style={{ fontSize: 24, color: theme.text, fontWeight: 700, letterSpacing: -0.3 }}>
        70%
      </div>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 6 }}>
      <LessonRow label="Social communication signs" done />
      <LessonRow label="Sensory patterns" done />
      <LessonRow label="Play & interaction" />
    </div>
  </CardShell>
);

const LessonRow: React.FC<{ label: string; done?: boolean }> = ({ label, done }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 999,
        background: done ? theme.success : "transparent",
        border: done ? "none" : `2px solid ${theme.textMuted}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {done ? <IconCheck size={18} color="white" /> : null}
    </div>
    <div
      style={{
        fontSize: 18,
        color: done ? theme.text : theme.textMuted,
        fontWeight: done ? 500 : 500,
      }}
    >
      {label}
    </div>
  </div>
);

const SurveyCard: React.FC<{ anim: CardAnim }> = ({ anim }) => (
  <CardShell anim={anim}>
    <Chip label="Survey" color={theme.accent2} />
    <div style={{ fontSize: 26, fontWeight: 700, color: theme.text, lineHeight: 1.2 }}>
      How clear was this module?
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
      <ResponseRow label="Very clear" selected />
      <ResponseRow label="Mostly clear" />
      <ResponseRow label="Somewhat clear" />
      <ResponseRow label="Not clear" />
    </div>
    <div style={{ fontSize: 14, color: theme.textMuted, marginTop: 4 }}>
      58 responses · AI summary ready
    </div>
  </CardShell>
);

const ResponseRow: React.FC<{ label: string; selected?: boolean }> = ({ label, selected }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 16px",
      borderRadius: 14,
      background: selected ? "rgba(99,102,241,0.20)" : "rgba(148,163,184,0.06)",
      border: selected
        ? `1.5px solid ${theme.accent}`
        : `1.5px solid rgba(148,163,184,0.15)`,
    }}
  >
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: 999,
        background: selected ? theme.accent : "transparent",
        border: selected ? "none" : `2px solid ${theme.textMuted}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {selected ? <IconCheck size={14} color="white" /> : null}
    </div>
    <div style={{ fontSize: 17, color: theme.text, fontWeight: selected ? 600 : 500 }}>{label}</div>
  </div>
);

const AiInsightCard: React.FC<{ anim: CardAnim }> = ({ anim }) => (
  <CardShell anim={anim}>
    <Chip label="AI insight" color={theme.accent2} />
    <div style={{ fontSize: 26, fontWeight: 700, color: theme.text, lineHeight: 1.2 }}>
      Trends across 147 responses
    </div>
    <div style={{ fontSize: 17, color: theme.textMuted, lineHeight: 1.5 }}>
      Gemini surfaces what&apos;s landing and where to focus next.
    </div>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
      {["Modules", "Surveys", "Feedback"].map((t) => (
        <div
          key={t}
          style={{
            padding: "6px 14px",
            borderRadius: 999,
            background: "rgba(99,102,241,0.18)",
            color: theme.accent2,
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          {t}
        </div>
      ))}
    </div>
  </CardShell>
);

export const SceneTrainingAI: React.FC = () => {
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

  const trainingAnim = useCardAnim(0.4, 1.5);
  const surveyAnim = useCardAnim(0.9, 2.0);
  const aiAnim = useCardAnim(1.4, 2.5);

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: fontStack }}>
      <div
        style={{
          padding: "100px 140px 0",
          opacity: headerOpacity,
          transform: `translateY(${headerY}px)`,
        }}
      >
        <div style={{ fontSize: 26, color: theme.accent2, fontWeight: 600 }}>Training & surveys</div>
        <div
          style={{
            fontSize: 54,
            fontWeight: 700,
            color: theme.text,
            letterSpacing: -1.5,
            marginTop: 8,
          }}
        >
          Structured training & surveys, assisted by AI
        </div>
      </div>
      <div
        style={{
          padding: "60px 140px 100px",
          display: "flex",
          gap: 40,
          alignItems: "stretch",
        }}
      >
        <TrainingCard anim={trainingAnim} />
        <SurveyCard anim={surveyAnim} />
        <AiInsightCard anim={aiAnim} />
      </div>
    </AbsoluteFill>
  );
};
