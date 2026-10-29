// Line icons drawn here so no icon package is needed: 24px grid, round ends, they take the text color.
import type { ReactNode } from "react";

function Svg({ children, className, on = false }: { children: ReactNode; className?: string; on?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill={on ? "currentColor" : "none"}
      fillOpacity={on ? 0.16 : undefined}
      stroke="currentColor"
      strokeWidth={on ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

type IconProps = { className?: string; on?: boolean };

export const SearchIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.8-3.8" />
  </Svg>
);

export const HomeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
  </Svg>
);

export const CalcIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="3" width="14" height="18" rx="2.5" />
    <path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01" />
  </Svg>
);

export const SparkIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m12 3 2.3 5.7L20 11l-5.7 2.3L12 19l-2.3-5.7L4 11l5.7-2.3z" />
  </Svg>
);

export const ChatIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7.5L6 21v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
  </Svg>
);

export const UserIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Svg>
);
