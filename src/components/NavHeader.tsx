"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { TRACK_LABELS, type Track } from "@/lib/data";

const NAV_LINKS = [
  { href: "/", label: "考程倒數" },
  { href: "/score", label: "成績統計" },
  { href: "/english", label: "英文練習" },
  { href: "/study", label: "讀書紀錄" },
];

export default function NavHeader() {
  const pathname = usePathname();
  const { user, loading, signOut, track, setTrack } = useAuth();

  return (
    <header className="border-b-4 border-ink bg-white">
      <div className="mobile-nav-shell mx-auto flex w-[min(1240px,calc(100%-32px))] flex-wrap items-center justify-between gap-4 py-4">
        <nav className="flex flex-wrap gap-2" aria-label="主要頁面">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`mobile-nav-link inline-flex items-center justify-center border border-ink px-4 py-2 font-bold ${
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
              {track && (
                <select value={track} onChange={(e) => void setTrack(e.target.value as Track)} aria-label="組別" className="border border-ink bg-white px-2 py-2 font-bold text-ink">
                  {(Object.keys(TRACK_LABELS) as Track[]).map((key) => (
                    <option key={key} value={key}>
                      {TRACK_LABELS[key]}
                    </option>
                  ))}
                </select>
              )}
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
