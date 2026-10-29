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

export const BackIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="m15 5-7 7 7 7" />
  </Svg>
);

export const CloseIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

/** 글쓰기 버튼: 말풍선 + 플러스 */
export const WriteIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M20 11.5A8.5 8.5 0 1 0 6.7 18.5L4 21l4.6-.9A8.5 8.5 0 0 0 12 20.3" />
    <path d="M18 15v6M15 18h6" />
  </Svg>
);

/** 학과 이야기 항목별 아이콘 (16px 안팎의 작은 크기로 쓴다) */
const CATEGORY_PATHS: Record<string, ReactNode> = {
  all: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </>
  ),
  curriculum: (
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H20v13H5.5A1.5 1.5 0 0 0 4 18.5z" />
      <path d="M4 18.5A1.5 1.5 0 0 0 5.5 20H20v-3" />
    </>
  ),
  culture: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M17 14a5 5 0 0 1 4 6" />
    </>
  ),
  clubs: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
  career: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18" />
    </>
  ),
  multimajor: <path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5" />,
  question: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5M12 17h.01" />
    </>
  ),
};

export const CategoryIcon = ({ id, className }: { id: string; className?: string }) => <Svg className={className}>{CATEGORY_PATHS[id]}</Svg>;

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
