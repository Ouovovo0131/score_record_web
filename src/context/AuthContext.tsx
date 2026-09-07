"use client";

// Auth context wrapping Firebase Google sign-in, restricted to a single
// allowlisted email (NEXT_PUBLIC_ALLOWED_EMAIL). Any other Google account is
// immediately signed out with an "此帳號未被授權" error surfaced via `error`.
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ALLOWED_EMAIL, getFirebaseAuth, hasFirebaseConfig } from "@/lib/firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  firebaseConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const firebaseConfigured = hasFirebaseConfig();

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      // No Firebase config present: nothing to subscribe to, so stop loading
      // immediately rather than leaving the app stuck in a loading state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (nextUser && ALLOWED_EMAIL && nextUser.email !== ALLOWED_EMAIL) {
        setError("此帳號未被授權");
        await firebaseSignOut(auth);
        setUser(null);
        setLoading(false);
        return;
      }

      setError(null);
      setUser(nextUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setError("Firebase 尚未設定，請先設定環境變數。");
      return;
    }

    try {
      setError(null);
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      setError(err instanceof Error ? err.message : "登入失敗，請再試一次。");
    }
  }, []);

  const signOut = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) {
      return;
    }
    await firebaseSignOut(auth);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, error, firebaseConfigured, signInWithGoogle, signOut }),
    [user, loading, error, firebaseConfigured, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
