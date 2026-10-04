"use client";

import { useCallback, useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/context/AuthContext";

interface AllowedUser {
  email: string;
  addedBy: string;
}

function AccountsContent() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const request = useCallback(
    async (url: string, init: RequestInit = {}) => {
      const token = await user?.getIdToken();
      return fetch(url, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers } });
    },
    [user]
  );

  useEffect(() => {
    let cancelled = false;
    request("/api/allowed-users")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("load failed"))))
      .then((data: AllowedUser[]) => {
        if (!cancelled) setUsers(data);
      })
      .catch(() => {
        if (!cancelled) setError("無法載入帳號清單（請確認資料表已建立）");
      });
    return () => {
      cancelled = true;
    };
  }, [request]);

  async function add() {
    if (!email.trim() || busy) return;
    setBusy(true);
    setError("");
    const res = await request("/api/allowed-users", { method: "POST", body: JSON.stringify({ email }) }).catch(() => null);
    if (res && res.ok) {
      const created: AllowedUser = await res.json();
      setUsers((prev) => (prev.some((u) => u.email === created.email) ? prev : [...prev, created]));
      setEmail("");
    } else {
      setError("新增失敗，請確認 Email 格式");
    }
    setBusy(false);
  }

  async function remove(target: string) {
    if (!window.confirm(`確定移除 ${target} 的存取權？`)) return;
    const res = await request(`/api/allowed-users?email=${encodeURIComponent(target)}`, { method: "DELETE" }).catch(() => null);
    if (res && res.ok) setUsers((prev) => prev.filter((u) => u.email !== target));
    else setError("移除失敗");
  }

  const me = user?.email?.toLowerCase();

  return (
    <div className="mobile-page">
      <div className="mobile-page-header mb-6 border-b-4 border-ink bg-white py-5">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-primary">Accounts</p>
        <h1 className="text-4xl font-extrabold sm:text-5xl">帳號管理</h1>
        <p className="mt-2 max-w-2xl text-muted">清單內的 Google 帳號都能登入，並共用同一份資料。</p>
      </div>

      <section className="mobile-panel border border-line bg-white p-5">
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="新增 Google 帳號 Email" className="min-w-0 flex-1 border border-line bg-white p-2" aria-label="Email" />
          <button type="submit" disabled={busy || !email.trim()} className="bg-primary px-5 py-2 font-bold text-white disabled:opacity-50">
            新增
          </button>
        </form>
        {error ? <p className="mt-2 text-sm text-[#dc2626]">{error}</p> : null}

        <ul className="mt-4 divide-y divide-line border border-line">
          {users.map((u) => (
            <li key={u.email} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate font-mono">{u.email}{u.email === me ? "（你）" : ""}</p>
                {u.addedBy ? <p className="text-xs text-muted">由 {u.addedBy} 新增</p> : null}
              </div>
              {u.email !== me ? (
                <button type="button" onClick={() => remove(u.email)} className="px-2 text-sm font-bold text-muted hover:text-ink">
                  移除
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function AccountsPage() {
  return (
    <RequireAuth>
      <AccountsContent />
    </RequireAuth>
  );
}