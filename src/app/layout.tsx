import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ServiceWorker from "@/components/ServiceWorker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "다전공 탐색",
  description: "본전공과 희망 다전공·부전공·마이크로디그리를 고르면 필요한 학점과 과목을 알려 줍니다 (경희대 국제캠퍼스).",
  applicationName: "다전공 탐색",
  appleWebApp: { capable: true, title: "다전공 탐색", statusBarStyle: "default" },
  icons: { icon: "/icons/192", apple: "/icons/180" },
};

export const viewport: Viewport = {
  themeColor: "#8b1e2d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
