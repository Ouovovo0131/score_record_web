"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const NAV_LINKS = [
  { href: "/", label: "考程倒數" },
  { href: "/score", label: "成績統計" },
  { href: "/english", label: "英文練習" },
];

export default function NavHeader() {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();

  return (
    <header className="border-b-4 border-ink bg-white">
      <div className="mx-auto flex w-[min(1240px,calc(100%-32px))] flex-wrap items-center justify-between gap-4 py-4">
        <nav className="flex flex-wrap gap-2" aria-label="主要頁面">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex items-center justify-center border border-ink px-4 py-2 font-bold ${
                  isActive ? "bg-ink text-white" : "bg-white text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {!loading && user && (
            <>
              <span className="hidden font-mono text-sm text-muted sm:inline">{user.email}</span>
              <button
                type="button"
                onClick={() => signOut()}
                className="border border-ink bg-white px-4 py-2 font-bold text-ink"
              >
                登出
              </button>
            </>
          )}
          {!loading && !user && (
            <Link href="/login" className="border border-ink bg-ink px-4 py-2 font-bold text-white">
              登入
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
