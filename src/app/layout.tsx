import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import NavHeader from "@/components/NavHeader";

export const metadata: Metadata = {
  title: "考程與成績追蹤",
  description: "個人模擬考成績與英文練習追蹤儀表板",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <NavHeader />
          <main className="flex flex-1 flex-col">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
