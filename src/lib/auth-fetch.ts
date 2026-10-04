import type { User } from "firebase/auth";

// fetch() that attaches the signed-in user's Firebase ID token so the API can
// scope data to that account.
export async function authFetch(user: User | null, url: string, init: RequestInit = {}): Promise<Response> {
  const token = user ? await user.getIdToken() : "";
  return fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
}