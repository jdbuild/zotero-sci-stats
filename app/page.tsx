"use client";

import Link from "next/link";
import { BookOpen, ShieldCheck, RefreshCw, GitCompareArrows } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Badges } from "@/components/Badges";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const featureIcons = [ShieldCheck, RefreshCw, GitCompareArrows, BookOpen];

export default function Home() {
  const { messages } = useLanguage();
  const { home } = messages;

  return (
    <main className="flex-1">
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="flex flex-col items-start gap-6">
          <Logo className="h-14 w-14" />
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{home.title}</h1>
          <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">{home.subtitle}</p>
          <Badges />
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/settings"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {home.connectLibrary}
            </Link>
            <Link
              href="/compare"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              {home.goToCompare}
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:grid-cols-2 sm:px-6">
          {home.features.map((f, i) => {
            const Icon = featureIcons[i];
            return (
              <div key={f.title} className="flex gap-4">
                <Icon className="h-6 w-6 flex-none text-red-600" strokeWidth={1.75} />
                <div>
                  <h2 className="font-semibold">{f.title}</h2>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{f.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
