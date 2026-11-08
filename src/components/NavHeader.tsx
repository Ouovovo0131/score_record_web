"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { TRACK_LABELS, type Track } from "@/lib/data";

const NAV_LINKS = [
  { href: "/", label: "總覽", mobileLabel: "總覽" },
  { href: "/score", label: "成績統計", mobileLabel: "成績" },
  { href: "/english", label: "英文練習", mobileLabel: "英文" },
  { href: "/study", label: "讀書紀錄", mobileLabel: "讀書" },
  { href: "/weakness", label: "弱點管理", mobileLabel: "弱點" },
  { href: "/settings", label: "設定與匯出", mobileLabel: "設定" },
];

export default function NavHeader() {
  const pathname = usePathname();
  const { user, loading, signOut, track, setTrack } = useAuth();

  return (
    <header className="dashboard-nav">
      <div className="dashboard-nav-inner">
        <Link href="/" className="dashboard-brand" aria-label="考程與成績追蹤首頁">
          <span className="dashboard-brand-mark" aria-hidden="true">學</span>
          <span>
            <strong>學習追蹤</strong>
            <small>考程與成績</small>
          </span>
        </Link>

        <nav className="dashboard-links" aria-label="主要頁面">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`dashboard-nav-link${isActive ? " is-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <nav className="mobile-bottom-nav" aria-label="手機主要頁面">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`mobile-bottom-nav-link${isActive ? " is-active" : ""}`}
                aria-label={link.label}
                aria-current={isActive ? "page" : undefined}
              >
                {link.mobileLabel}
              </Link>
            );
          })}
        </nav>

        <div className="dashboard-account">
          {!loading && user && (
            <>
              {track && (
                <select value={track} onChange={(e) => void setTrack(e.target.value as Track)} aria-label="組別" className="dashboard-track">
                  {(Object.keys(TRACK_LABELS) as Track[]).map((key) => (
                    <option key={key} value={key}>
                      {TRACK_LABELS[key]}
                    </option>
                  ))}
                </select>
              )}
              <span className="dashboard-user">{user.email}</span>
              <button
                type="button"
                onClick={() => signOut()}
                className="dashboard-account-action"
              >
                登出
              </button>
            </>
          )}
          {!loading && !user && (
            <Link href="/login" className="dashboard-account-action is-primary">
              登入
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
