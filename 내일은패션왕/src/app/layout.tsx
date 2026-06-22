import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "내일은패션왕",
  description: "가상 마네킹에 옷 입혀보고 360도 돌려보는 패션 시뮬레이터",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
