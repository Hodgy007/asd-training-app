import { evolvePath } from "@remotion/paths";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { fontStack, theme } from "../theme";

const CHART_LEFT = 140;
const CHART_RIGHT = 1100;
const CHART_TOP = 380;
const CHART_BOTTOM = 820;

const DATA = [10, 22, 30, 44, 58, 70, 82, 92, 98];

const pointsToPath = (data: number[]) => {
  const max = Math.max(...data);
  const stepX = (CHART_RIGHT - CHART_LEFT) / (data.length - 1);
  return data
    .map((v, i) => {
      const x = CHART_LEFT + i * stepX;
      const y = CHART_BOTTOM - (v / max) * (CHART_BOTTOM - CHART_TOP);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
};

export const SceneTrainingAI: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const path = pointsToPath(DATA);

  const headerOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headerY = interpolate(frame, [0, 0.5 * fps], [16, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const draw = interpolate(frame, [0.3 * fps, 3.0 * fps], [0, 1], {
    easing: Easing.bezier(0.45, 0, 0.15, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const { strokeDasharray, strokeDashoffset } = evolvePath(draw, path);
  const areaPath = `${path} L ${CHART_RIGHT} ${CHART_BOTTOM} L ${CHART_LEFT} ${CHART_BOTTOM} Z`;
  const areaOpacity = interpolate(draw, [0, 0.8, 1], [0, 0.2, 0.35], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const aiCardOpacity = interpolate(frame, [1.6 * fps, 2.4 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const aiCardY = interpolate(frame, [1.6 * fps, 2.4 * fps], [28, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: fontStack }}>
      <div
        style={{
          padding: "100px 140px 0",
          opacity: headerOpacity,
          transform: `translateY(${headerY}px)`,
        }}
      >
        <div style={{ fontSize: 26, color: theme.accent2, fontWeight: 600 }}>
          Training & observation
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
          Structured training, powered by AI
        </div>
      </div>
      <svg
        width={1920}
        height={1080}
        viewBox="0 0 1920 1080"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id="tline-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={theme.accent} />
            <stop offset="100%" stopColor={theme.accent2} />
          </linearGradient>
          <linearGradient id="tarea-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.accent} stopOpacity={0.55} />
            <stop offset="100%" stopColor={theme.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((i) => {
          const y = CHART_TOP + ((CHART_BOTTOM - CHART_TOP) / 3) * i;
          return (
            <line
              key={i}
              x1={CHART_LEFT}
              x2={CHART_RIGHT}
              y1={y}
              y2={y}
              stroke={theme.text}
              strokeOpacity={0.1}
              strokeWidth={1}
            />
          );
        })}
        <path d={areaPath} fill="url(#tarea-gradient)" opacity={areaOpacity} />
        <path
          d={path}
          fill="none"
          stroke="url(#tline-gradient)"
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          right: 140,
          top: 360,
          width: 620,
          background: theme.card,
          border: `1px solid ${theme.cardBorder}`,
          borderRadius: 24,
          padding: "32px 36px",
          opacity: aiCardOpacity,
          transform: `translateY(${aiCardY}px)`,
          boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 22,
            fontWeight: 600,
            color: theme.accent2,
          }}
        >
          AI insight
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: theme.text, lineHeight: 1.2 }}>
          Patterns across 12 observations
        </div>
        <div style={{ fontSize: 20, color: theme.textMuted, lineHeight: 1.5 }}>
          Gemini-powered summaries highlight behavioural trends and next steps — never diagnosing,
          always supporting practitioners.
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
          {["Social", "Sensory", "Play"].map((t) => (
            <div
              key={t}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                background: "rgba(99,102,241,0.18)",
                color: theme.accent2,
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
