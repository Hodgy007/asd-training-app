import { evolvePath } from "@remotion/paths";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { fontStack, theme } from "../theme";

const WIDTH = 1920;
const HEIGHT = 1080;
const CHART_LEFT = 180;
const CHART_RIGHT = WIDTH - 180;
const CHART_TOP = 340;
const CHART_BOTTOM = HEIGHT - 220;

const DATA = [12, 24, 28, 42, 55, 68, 78, 88, 96];

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

const pointPositions = (data: number[]) => {
  const max = Math.max(...data);
  const stepX = (CHART_RIGHT - CHART_LEFT) / (data.length - 1);
  return data.map((v, i) => ({
    x: CHART_LEFT + i * stepX,
    y: CHART_BOTTOM - (v / max) * (CHART_BOTTOM - CHART_TOP),
  }));
};

export const SceneChart: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const path = pointsToPath(DATA);
  const points = pointPositions(DATA);

  const headerOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headerY = interpolate(frame, [0, 0.5 * fps], [16, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const draw = interpolate(frame, [0.4 * fps, 3.2 * fps], [0, 1], {
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

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: fontStack }}>
      <div
        style={{
          padding: "100px 140px 0",
          opacity: headerOpacity,
          transform: `translateY(${headerY}px)`,
        }}
      >
        <div style={{ fontSize: 28, color: theme.accent2, fontWeight: 600 }}>
          Training progress
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: theme.text,
            letterSpacing: -1.5,
            marginTop: 8,
          }}
        >
          Practitioners completing modules
        </div>
      </div>
      <svg
        width={WIDTH}
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id="line-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={theme.accent} />
            <stop offset="100%" stopColor={theme.accent2} />
          </linearGradient>
          <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.accent} stopOpacity={0.6} />
            <stop offset="100%" stopColor={theme.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((i) => {
          const y = CHART_TOP + ((CHART_BOTTOM - CHART_TOP) / 4) * i;
          const opacity = interpolate(frame, [0, 0.6 * fps], [0, 0.15], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <line
              key={i}
              x1={CHART_LEFT}
              x2={CHART_RIGHT}
              y1={y}
              y2={y}
              stroke={theme.text}
              strokeOpacity={opacity}
              strokeWidth={1}
            />
          );
        })}
        <path
          d={areaPath}
          fill="url(#area-gradient)"
          opacity={areaOpacity}
        />
        <path
          d={path}
          fill="none"
          stroke="url(#line-gradient)"
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
        />
        {points.map((p, i) => {
          const pointProgress = (i + 1) / points.length;
          const reveal = interpolate(
            draw,
            [pointProgress - 0.02, pointProgress + 0.02],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={10 * reveal}
              fill={theme.text}
              stroke={theme.accent}
              strokeWidth={3}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
