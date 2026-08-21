"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Wrench } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface LibraryRef {
  id: string;
  type: "user" | "group";
  name: string;
}

interface ConfigState {
  configured: boolean;
  libraryId?: string;
  libraryType?: string;
  libraryName?: string;
  apiKeyMasked?: string;
}

interface SyncMetaState {
  status: "idle" | "syncing" | "error";
  lastVersion: number;
  lastSyncedAt?: string;
  itemCount: number;
  lastError?: string;
  durationMs?: number;
  lastRun?: { added: number; updated: number; deleted: number };
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  return mb >= 0.1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export default function SettingsPage() {
  const { messages } = useLanguage();
  const t = messages.settings;

  const [apiKey, setApiKey] = useState("");
  const [libraries, setLibraries] = useState<LibraryRef[] | null>(null);
  const [selectedLibrary, setSelectedLibrary] = useState<string>("");
  const [discoverError, setDiscoverError] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [config, setConfig] = useState<ConfigState | null>(null);
  const [syncMeta, setSyncMeta] = useState<SyncMetaState | null>(null);
  const [cacheSizeBytes, setCacheSizeBytes] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");

  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessResult, setReprocessResult] = useState<number | null>(null);
  const [reprocessError, setReprocessError] = useState("");

  const loadConfig = useCallback(async () => {
    const res = await fetch("/api/config");
    const data = await res.json();
    setConfig(data);
  }, []);

  const loadSyncStatus = useCallback(async () => {
    const res = await fetch("/api/sync");
    const data = await res.json();
    setSyncMeta(data.status);
    setCacheSizeBytes(data.cacheSizeBytes ?? 0);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialState() {
      const [configRes, syncRes] = await Promise.all([fetch("/api/config"), fetch("/api/sync")]);
      const [configData, syncData] = await Promise.all([configRes.json(), syncRes.json()]);
      if (cancelled) return;
      setConfig(configData);
      setSyncMeta(syncData.status);
      setCacheSizeBytes(syncData.cacheSizeBytes ?? 0);
    }

    void loadInitialState();
    return () => {
      cancelled = true;
    };
  }, []);

  async function discoverLibraries() {
    setDiscoverError("");
    setLibraries(null);
    setDiscovering(true);
    try {
      const res = await fetch("/api/zotero/libraries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? messages.common.unknownError);
      setLibraries(data.libraries);
      if (data.libraries.length > 0) setSelectedLibrary(data.libraries[0].id);
    } catch (err) {
      setDiscoverError(err instanceof Error ? err.message : messages.common.unknownError);
    } finally {
      setDiscovering(false);
    }
  }

  async function saveLibrary() {
    const lib = libraries?.find((l) => l.id === selectedLibrary);
    if (!lib) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zoteroApiKey: apiKey,
          libraryId: lib.id,
          libraryType: lib.type,
          libraryName: lib.name,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? messages.common.unknownError);
      await loadConfig();
      setLibraries(null);
      setApiKey("");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : messages.common.unknownError);
    } finally {
      setSaving(false);
    }
  }

  async function triggerSync() {
    setSyncing(true);
    setSyncError("");
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? messages.common.unknownError);
      await loadSyncStatus();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : messages.common.unknownError);
    } finally {
      setSyncing(false);
    }
  }

  async function triggerReprocess() {
    setReprocessing(true);
    setReprocessError("");
    setReprocessResult(null);
    try {
      const res = await fetch("/api/reprocess", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? messages.common.unknownError);
      setReprocessResult(data.processed);
    } catch (err) {
      setReprocessError(err instanceof Error ? err.message : messages.common.unknownError);
    } finally {
      setReprocessing(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t.subtitle}</p>

      <section className="mt-8 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="font-semibold">{t.connectHeading}</h2>

        {config?.configured && (
          <div className="mt-3 rounded-md bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900">
            {t.connectedWith} <strong>{config.libraryName}</strong> ({config.libraryType}, {config.libraryId}) ·
            Key {config.apiKeyMasked}
          </div>
        )}

        <label className="mt-4 block text-sm font-medium">{t.apiKeyLabel}</label>
        <p className="text-xs text-zinc-500">
          {t.apiKeyHint.split("zotero.org/settings/keys")[0]}
          <a
            href="https://www.zotero.org/settings/keys"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            zotero.org/settings/keys
          </a>
          {t.apiKeyHint.split("zotero.org/settings/keys")[1]}
        </p>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="P9xxxxxxxxxxxxxxxxxxxxxx"
          className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />

        <button
          onClick={discoverLibraries}
          disabled={!apiKey || discovering}
          className="mt-3 flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-zinc-900"
        >
          {discovering && <Loader2 className="h-4 w-4 animate-spin" />}
          {t.fetchLibraries}
        </button>

        {discoverError && <p className="mt-2 text-sm text-red-600">{discoverError}</p>}

        {libraries && (
          <div className="mt-4">
            <label className="block text-sm font-medium">{t.selectLibraryLabel}</label>
            <select
              value={selectedLibrary}
              onChange={(e) => setSelectedLibrary(e.target.value)}
              className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              {libraries.map((lib) => (
                <option key={lib.id} value={lib.id}>
                  {lib.name} ({lib.type})
                </option>
              ))}
            </select>
            <button
              onClick={saveLibrary}
              disabled={saving}
              className="mt-3 flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.saveConnection}
            </button>
            {saveError && <p className="mt-2 text-sm text-red-600">{saveError}</p>}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="font-semibold">{t.syncHeading}</h2>
        {syncMeta ? (
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <dt className="text-zinc-500">{t.status}</dt>
            <dd>{syncMeta.status}</dd>
            <dt className="text-zinc-500">{t.itemsInCache}</dt>
            <dd>{syncMeta.itemCount}</dd>
            <dt className="text-zinc-500">{t.cacheSize}</dt>
            <dd>{formatBytes(cacheSizeBytes)}</dd>
            <dt className="text-zinc-500">{t.lastSync}</dt>
            <dd>{syncMeta.lastSyncedAt ? new Date(syncMeta.lastSyncedAt).toLocaleString() : t.never}</dd>
            <dt className="text-zinc-500">{t.lastSyncDuration}</dt>
            <dd>{syncMeta.durationMs ? formatDuration(syncMeta.durationMs) : t.notRecordedYet}</dd>
            <dt className="text-zinc-500">{t.lastSyncChanges}</dt>
            <dd>
              {syncMeta.lastRun ? (
                <>
                  +{syncMeta.lastRun.added} {t.added}, {syncMeta.lastRun.updated} {t.updated}, -
                  {syncMeta.lastRun.deleted} {t.deleted}
                </>
              ) : (
                t.notRecordedYet
              )}
            </dd>
            {syncMeta.lastError && (
              <>
                <dt className="text-zinc-500">{t.lastError}</dt>
                <dd className="text-red-600">{syncMeta.lastError}</dd>
              </>
            )}
          </dl>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">{t.cacheSize}: {formatBytes(cacheSizeBytes)}</p>
        )}

        <button
          onClick={triggerSync}
          disabled={!config?.configured || syncing}
          className="mt-4 flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-zinc-900"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? t.syncing : t.syncNow}
        </button>
        {syncError && <p className="mt-2 text-sm text-red-600">{syncError}</p>}
      </section>

      <section className="mt-6 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="font-semibold">{t.reprocessHeading}</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{t.reprocessHint}</p>
        <button
          onClick={triggerReprocess}
          disabled={!config?.configured || reprocessing}
          className="mt-4 flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {reprocessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
          {reprocessing ? t.reprocessing : t.reprocessButton}
        </button>
        {reprocessResult != null && (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {reprocessResult} {t.reprocessDone}
          </p>
        )}
        {reprocessError && <p className="mt-2 text-sm text-red-600">{reprocessError}</p>}
      </section>
    </main>
  );
}
