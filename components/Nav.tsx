"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { Language } from "@/lib/i18n/translations";

export function Nav() {
  const pathname = usePathname();
  const { language, setLanguage, messages } = useLanguage();

  const links = [
    { href: "/", label: messages.nav.overview },
    { href: "/compare", label: messages.nav.compare },
    { href: "/network", label: messages.nav.network },
    { href: "/settings", label: messages.nav.settings },
  ];

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
        </div>
      </div>
    </header>
  );
}
