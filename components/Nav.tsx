"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "./Logo";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { Language } from "@/lib/i18n/translations";

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, messages } = useLanguage();

  // Absent entirely (authEnabled: false) means this deployment doesn't use
  // access management at all - Settings stays visible to everyone, exactly
  // like before this feature existed.
  const [auth, setAuth] = useState<{ authEnabled: boolean; role: "admin" | "member" | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setAuth(d);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // Before the fetch resolves, auth is null - treat that as "don't know
  // yet" rather than "disabled", so Settings/Logout don't flash into view
  // for a moment on every navigation before snapping to the real state.
  const showSettings = auth !== null && (!auth.authEnabled || auth.role === "admin");
  const showLogout = Boolean(auth?.authEnabled && auth.role);

  // On the login page itself there's nowhere to navigate to yet - every
  // other page just bounces back here anyway - so show only the brand and
  // language switch, not a full menu of links that go nowhere.
  const onLoginPage = pathname === "/login";
  const links = onLoginPage
    ? []
    : [
        { href: "/", label: messages.nav.overview },
        { href: "/compare", label: messages.nav.compare },
        { href: "/network", label: messages.nav.network },
        ...(showSettings ? [{ href: "/settings", label: messages.nav.settings }] : []),
      ];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const otherLanguage: Language = language === "de" ? "en" : "de";

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Logo className="h-7 w-7" />
          <span>ZoteroSciStats</span>
        </Link>
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1 text-sm">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-1.5 transition-colors ${
                    active
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <button
            onClick={() => setLanguage(otherLanguage)}
            aria-label={`Switch to ${otherLanguage === "de" ? "Deutsch" : "English"}`}
            className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium uppercase text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            {otherLanguage}
          </button>
          {showLogout && (
            <button
              onClick={handleLogout}
              className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              {messages.nav.logout}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
