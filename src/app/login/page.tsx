"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { user, loading, error, firebaseConfigured, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/score");
    }
  }, [loading, user, router]);

  return (
    <div className="mobile-login-page mx-auto flex w-[min(480px,calc(100%-32px))] flex-1 flex-col items-center justify-center gap-6 py-16">
      <div className="mobile-login-card w-full border border-ink bg-white p-8 text-center">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-primary">Sign In</p>
        <h1 className="text-3xl font-extrabold">登入</h1>
        <p className="mt-2 text-muted">登入後才能檢視與編輯成績統計、英文練習資料。</p>

        {!firebaseConfigured ? (
          <p className="mt-6 border border-line bg-[#fff2f2] p-4 font-semibold text-danger">
            Firebase 尚未設定，請先在 .env.local 設定 NEXT_PUBLIC_FIREBASE_* 環境變數。
          </p>
        ) : (
          <>
            {error && (
              <p className="mt-6 border border-line bg-[#fff2f2] p-4 font-semibold text-danger">{error}</p>
            )}
            <button
              type="button"
              onClick={() => signInWithGoogle()}
              className="mt-6 w-full border border-ink bg-ink px-4 py-3 font-bold text-white"
            >
              使用 Google 登入
            </button>
          </>
        )}
      </div>
    </div>
  );
}
