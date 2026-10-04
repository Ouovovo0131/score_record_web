"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { TRACK_LABELS, type Track } from "@/lib/data";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, track, trackLoading, setTrack } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || (user && trackLoading)) {
    return (
      <div className="flex flex-1 items-center justify-center py-24 text-muted">
        <p className="font-mono">載入中...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!track) {
    return (
      <div className="mx-auto flex w-[min(480px,calc(100%-32px))] flex-1 flex-col items-center justify-center py-16">
        <div className="w-full border border-ink bg-white p-8 text-center">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-primary">Welcome</p>
          <h1 className="text-3xl font-extrabold">選擇未來發展方向</h1>
          <p className="mt-2 text-muted">會依你的選擇顯示自然或社會科目，之後可以隨時在導覽列更改。</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {(Object.keys(TRACK_LABELS) as Track[]).map((key) => (
              <button key={key} type="button" onClick={() => void setTrack(key)} className="border border-ink bg-white px-4 py-4 text-lg font-bold text-ink hover:bg-ink hover:text-white">
                {TRACK_LABELS[key]}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
