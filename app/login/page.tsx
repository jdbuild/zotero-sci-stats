"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const SLOW_THRESHOLD_MS = 2500;
const MAX_AUTO_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

export default function LoginPage() {
  const router = useRouter();
  const { messages } = useLanguage();
  const t = messages.auth;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState("");

  // Visiting /login while already holding a valid session (e.g. an old
  // bookmark, or navigating back) should just bounce to the app instead of
  // showing a login form next to a Logout button, which reads as broken.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.role) router.replace("/");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function attemptLogin(): Promise<{ ok: boolean; status: number; error?: string }> {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, error: data.error };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSlow(false);
    setError("");

    // A cold Atlas free-tier cluster can take up to ~15s to respond - after
    // a couple of seconds, say so explicitly instead of leaving a bare
    // spinner that looks identical to a hang or a broken login.
    const slowTimer = setTimeout(() => setSlow(true), SLOW_THRESHOLD_MS);

    try {
      for (let attempt = 0; ; attempt++) {
        const result = await attemptLogin();
        if (result.ok) {
          router.push("/");
          router.refresh();
          return;
        }
        // 503 specifically means "database is waking up, not your fault" -
        // retry automatically a couple of times before bothering the user.
        if (result.status === 503 && attempt < MAX_AUTO_RETRIES) {
          setSlow(true);
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          continue;
        }
        throw new Error(result.error ?? messages.common.unknownError);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : messages.common.unknownError);
    } finally {
      clearTimeout(slowTimer);
      setLoading(false);
      setSlow(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-1 flex-col justify-center px-4">
      <h1 className="text-2xl font-bold">{t.loginTitle}</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t.loginSubtitle}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium">{t.usernameLabel}</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            autoComplete="username"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">{t.passwordLabel}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        {loading && slow && (
          <p className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t.wakingUpDatabase}
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading || !username || !password}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-zinc-900"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? t.loggingIn : t.loginButton}
        </button>
      </form>
    </main>
  );
}
