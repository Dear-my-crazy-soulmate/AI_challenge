import type { Metadata, Viewport } from "next";
import ServiceWorker from "@/components/ServiceWorker";
import TabBar from "@/components/TabBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "다전공 길잡이",
  description: "본전공과 희망 다전공·부전공·마이크로디그리를 고르면 필요한 학점과 과목을 알려 줍니다 (경희대 국제캠퍼스).",
  applicationName: "다전공 길잡이",
  appleWebApp: { capable: true, title: "다전공 길잡이", statusBarStyle: "default" },
  icons: { icon: "/icons/192", apple: "/icons/180" },
};

export const viewport: Viewport = {
  themeColor: "#f5f3ee",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        {/* If the CDN is unreachable the system sans-serif takes over (see --font-sans). */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full">
        <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-paper md:shadow-[0_0_0_1px_var(--color-line)]">
          <div className="flex-1 pb-[calc(62px+env(safe-area-inset-bottom))]">{children}</div>
          <TabBar />
        </div>
        <ServiceWorker />
      </body>
    </html>
  );
}
