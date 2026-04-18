type IconProps = { size?: number; color?: string };

const svg = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const IconUsers: React.FC<IconProps> = ({ size = 36, color = "white" }) => (
  <svg {...svg(size)} style={{ color }}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const IconGraduation: React.FC<IconProps> = ({ size = 36, color = "white" }) => (
  <svg {...svg(size)} style={{ color }}>
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

export const IconShield: React.FC<IconProps> = ({ size = 36, color = "white" }) => (
  <svg {...svg(size)} style={{ color }}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const IconVideo: React.FC<IconProps> = ({ size = 36, color = "white" }) => (
  <svg {...svg(size)} style={{ color }}>
    <rect x="2" y="6" width="14" height="12" rx="2" />
    <path d="m22 8-6 4 6 4V8z" />
  </svg>
);

export const IconBook: React.FC<IconProps> = ({ size = 36, color = "white" }) => (
  <svg {...svg(size)} style={{ color }}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <path d="M8 7h8M8 11h6" />
  </svg>
);

export const IconSurvey: React.FC<IconProps> = ({ size = 36, color = "white" }) => (
  <svg {...svg(size)} style={{ color }}>
    <rect x="4" y="4" width="16" height="18" rx="2" />
    <path d="M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
    <path d="m9 14 2 2 4-4" />
    <path d="M9 9h6" />
  </svg>
);

export const IconCohort: React.FC<IconProps> = ({ size = 36, color = "white" }) => (
  <svg {...svg(size)} style={{ color }}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    <circle cx="19" cy="7" r="2.5" />
  </svg>
);

export const IconChart: React.FC<IconProps> = ({ size = 36, color = "white" }) => (
  <svg {...svg(size)} style={{ color }}>
    <path d="M3 3v18h18" />
    <path d="m7 15 4-4 4 4 5-6" />
  </svg>
);

export const IconPlug: React.FC<IconProps> = ({ size = 36, color = "white" }) => (
  <svg {...svg(size)} style={{ color }}>
    <path d="M9 2v6M15 2v6" />
    <path d="M5 8h14v3a7 7 0 0 1-14 0V8z" />
    <path d="M12 18v4" />
  </svg>
);

export const IconLock: React.FC<IconProps> = ({ size = 36, color = "white" }) => (
  <svg {...svg(size)} style={{ color }}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    <circle cx="12" cy="16" r="1.25" fill="currentColor" />
  </svg>
);

export const IconKey: React.FC<IconProps> = ({ size = 36, color = "white" }) => (
  <svg {...svg(size)} style={{ color }}>
    <circle cx="7.5" cy="15.5" r="5.5" />
    <path d="m21 2-9.5 9.5M15.5 7.5 19 11" />
  </svg>
);

export const IconBuilding: React.FC<IconProps> = ({ size = 36, color = "white" }) => (
  <svg {...svg(size)} style={{ color }}>
    <rect x="3" y="3" width="8" height="18" rx="1" />
    <rect x="13" y="8" width="8" height="13" rx="1" />
    <path d="M6 7h2M6 11h2M6 15h2M16 12h2M16 16h2" />
  </svg>
);

export const IconAccessibility: React.FC<IconProps> = ({ size = 36, color = "white" }) => (
  <svg {...svg(size)} style={{ color }}>
    <circle cx="12" cy="4" r="2" />
    <path d="M4 10h16" />
    <path d="M9 10v4l-2 7" />
    <path d="M15 10v4l2 7" />
    <path d="M9 14h6" />
  </svg>
);

export const IconSparkle: React.FC<IconProps> = ({ size = 36, color = "white" }) => (
  <svg {...svg(size)} style={{ color }}>
    <path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3z" />
  </svg>
);

export const IconCheck: React.FC<IconProps> = ({ size = 36, color = "white" }) => (
  <svg {...svg(size)} style={{ color }}>
    <path d="m5 12 5 5 9-11" />
  </svg>
);
