import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "任务管理系统",
  description: "企业级任务管理平台 - 高效协作，智能追踪",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
