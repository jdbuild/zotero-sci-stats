export type Language = "de" | "en";

interface FeatureItem {
  title: string;
  text: string;
}

export interface Messages {
  nav: {
    overview: string;
    compare: string;
    network: string;
    settings: string;
    logout: string;
  };
  auth: {
    loginTitle: string;
    loginSubtitle: string;
    usernameLabel: string;
    passwordLabel: string;
    loginButton: string;
    loggingIn: string;
  };
  home: {
    title: string;
    subtitle: string;
    features: FeatureItem[];
  };
  settings: {
    title: string;
    subtitle: string;
    connectHeading: string;
    connectedWith: string;
    apiKeyLabel: string;
    apiKeyHint: string;
    fetchLibraries: string;
    selectLibraryLabel: string;
    saveConnection: string;
    syncHeading: string;
    status: string;
    itemsInCache: string;
    cacheSize: string;
    lastSync: string;
    never: string;
    lastError: string;
    lastSyncDuration: string;
    lastSyncChanges: string;
    added: string;
    updated: string;
    deleted: string;
    notRecordedYet: string;
    syncNow: string;
    syncing: string;
    reprocessHeading: string;
    reprocessHint: string;
    reprocessButton: string;
    reprocessing: string;
    reprocessDone: string;
    accessHeading: string;
    accessHint: string;
    addMember: string;
    addingMember: string;
    usernamePlaceholder: string;
    newMemberPasswordNotice: string;
    copyPassword: string;
    copied: string;
    memberUsernameColumn: string;
    memberRoleColumn: string;
    memberCreatedColumn: string;
    removeMember: string;
    noMembersYet: string;
  };
  compare: {
    title: string;
    subtitle: string;
    loadExample: string;
    querySetNamePlaceholder: string;
    removeQuerySet: string;
    tagsLabel: string;
    tagsPlaceholder: string;
    tagModeAnd: string;
    tagModeOr: string;
    authorsLabel: string;
    authorsPlaceholder: string;
    authorModeAnd: string;
    authorModeOr: string;
    itemTypesLabel: string;
    peerReviewedGroup: string;
    otherTypesGroup: string;
    selectAllTypes: string;
    deselectAllTypes: string;
    yearLabel: string;
    plusOneMonth: string;
    plusOneYear: string;
    addQuerySet: string;
    compareButton: string;
    comparing: string;
    noYearData: string;
    publicationsPerYear: string;
    overviewHeading: string;
    querySetColumn: string;
    totalHits: string;
    totalRowLabel: string;
    citationListHeading: string;
    showList: string;
    hideList: string;
    showingOf: string;
    historyHeading: string;
    historyEmpty: string;
    loadIntoEditor: string;
    deleteRun: string;
    unnamed: string;
  };
  network: {
    title: string;
    subtitle: string;
    addNode: string;
    buildButton: string;
    building: string;
    graphHeading: string;
    collabRankingHeading: string;
    totalPublicationsColumn: string;
    collaborativeColumn: string;
    pairRankingHeading: string;
    sharedCount: string;
    noOverlap: string;
    minTwoSets: string;
    historyHeading: string;
    historyEmpty: string;
    deleteRun: string;
    trackedAuthorsLabel: string;
    trackedAuthorsPlaceholder: string;
    trackedAuthorsHint: string;
    notTracked: string;
    pointsLabel: string;
    winsLabel: string;
    tiesLabel: string;
    unassignedLabel: string;
    otherQuerySetLabel: string;
    method1Heading: string;
    method1Explainer: string;
    method2Heading: string;
    method2Explainer: string;
    explainerTriggerLabel: string;
  };
  common: {
    unknownError: string;
    periodLabel: string;
    allDates: string;
  };
}

export const translations: Record<Language, Messages> = {
  de: {
    nav: {
      overview: "Übersicht",
      compare: "Tag-Vergleich",
      network: "Tag NetzwerkVis",
      settings: "Einstellungen",
      logout: "Abmelden",
    },
    auth: {
      loginTitle: "Anmelden",
      loginSubtitle: "Bitte meldet euch an, um ZoteroSciStats zu nutzen.",
      usernameLabel: "Benutzername",
      passwordLabel: "Passwort",
      loginButton: "Anmelden",
      loggingIn: "Melde an…",
    },
    home: {
      title: "ZoteroSciStats",
      subtitle:
        "Publikationsstatistiken direkt aus eurer Zotero-Bibliothek – gefiltert nach Tags, Autor:innen und Datumsgrenzen, mit Vergleich mehrerer Suchen nebeneinander. Reiner Lesezugriff, lokaler Cache in MongoDB.",
      features: [
        {
          title: "Strikt lesend",
          text: "Die App verwendet ausschließlich GET-Aufrufe gegen die Zotero-API. Es gibt im Code keine Schreib-Funktion – ein Zotero-Key mit Nur-Lese-Berechtigung genügt.",
        },
        {
          title: "Zuverlässiger Sync",
          text: "Erstsync holt die komplette Bibliothek, danach läuft ein inkrementeller Sync über die Zotero Library-Version. Der Fortschritt wird erst nach vollständigem Erfolg festgeschrieben.",
        },
        {
          title: "Mehrere Suchen vergleichen",
          text: "Kombiniert 1–N Tags und Autor:innen mit UND/ODER-Logik und Datumsgrenzen zu benannten Query-Sets – z. B. #ICMT 2026 gegen #CDHSI 2026 – und vergleicht sie nebeneinander.",
        },
        {
          title: "Für große Bibliotheken",
          text: "Ausgelegt auf mehrere tausend Einträge über viele Jahre, dank lokalem MongoDB-Cache statt wiederholter Live-Abfragen.",
        },
      ],
    },
    settings: {
      title: "Einstellungen",
      subtitle:
        "Verbindet die App per Zotero-API-Key (nur Lesezugriff) mit eurer Bibliothek. Der Key wird ausschließlich lokal in MongoDB gespeichert, niemals in Git.",
      connectHeading: "Zotero-Bibliothek verbinden",
      connectedWith: "Aktuell verbunden mit",
      apiKeyLabel: "Zotero API-Key (nur Lesezugriff)",
      apiKeyHint: "Erstellt einen Key unter zotero.org/settings/keys und deaktiviert dort jegliche Schreibrechte.",
      fetchLibraries: "Bibliotheken abrufen",
      selectLibraryLabel: "Bibliothek auswählen",
      saveConnection: "Verbindung speichern",
      syncHeading: "Synchronisierung",
      status: "Status",
      itemsInCache: "Einträge im Cache",
      cacheSize: "Cache-Größe",
      lastSync: "Letzter Sync",
      never: "noch nie",
      lastError: "Letzter Fehler",
      lastSyncDuration: "Dauer des letzten Syncs",
      lastSyncChanges: "Änderungen im letzten Sync",
      added: "neu",
      updated: "geändert",
      deleted: "gelöscht",
      notRecordedYet: "wird beim nächsten Sync erfasst",
      syncNow: "Jetzt synchronisieren",
      syncing: "Synchronisiere…",
      reprocessHeading: "Cache neu verarbeiten",
      reprocessHint:
        "Berechnet abgeleitete Felder (z. B. Autor:innen-Namen für die Filterung) für bereits synchronisierte Einträge neu – rein lokal aus den bereits gespeicherten Rohdaten, ohne erneuten Zotero-Zugriff. Sinnvoll direkt nach diesem Update, wenn ihr schon eine große Bibliothek importiert habt.",
      reprocessButton: "Cache neu verarbeiten (kein Zotero-Zugriff)",
      reprocessing: "Verarbeite…",
      reprocessDone: "Einträge neu verarbeitet",
      accessHeading: "Zugriffsverwaltung",
      accessHint:
        "Erstellt Konten für Kolleg:innen, die diese Instanz nutzen sollen. Nur sichtbar und wirksam, wenn Zugriffsverwaltung für diese Bereitstellung aktiviert ist.",
      addMember: "Mitglied hinzufügen",
      addingMember: "Erstelle…",
      usernamePlaceholder: "Benutzername",
      newMemberPasswordNotice:
        "Passwort für {username} - jetzt kopieren und weitergeben, es wird nicht erneut angezeigt:",
      copyPassword: "Kopieren",
      copied: "Kopiert",
      memberUsernameColumn: "Benutzername",
      memberRoleColumn: "Rolle",
      memberCreatedColumn: "Erstellt",
      removeMember: "Entfernen",
      noMembersYet: "Noch keine Mitglieder erstellt.",
    },
    compare: {
      title: "Tag-Vergleich",
      subtitle: "Stellt mehrere Tag- und Autor:innen-Kombinationen innerhalb desselben Zeitraums nebeneinander gegenüber.",
      loadExample: "Beispiel laden (ICMT vs. CDHSI)",
      querySetNamePlaceholder: "Name des Query-Sets",
      removeQuerySet: "Query-Set entfernen",
      tagsLabel: "Tags",
      tagsPlaceholder: "Tag eingeben, Enter drücken…",
      tagModeAnd: "alle Tags (UND)",
      tagModeOr: "ein Tag reicht (ODER)",
      authorsLabel: "Autor:innen",
      authorsPlaceholder: "Autor:in eingeben, Enter drücken…",
      authorModeAnd: "alle Autor:innen (UND)",
      authorModeOr: "eine:r reicht (ODER)",
      itemTypesLabel: "Publikationstyp",
      peerReviewedGroup: "Peer-reviewed",
      otherTypesGroup: "Sonstige",
      selectAllTypes: "Alle auswählen",
      deselectAllTypes: "Alle abwählen",
      yearLabel: "Datum (von – bis)",
      plusOneMonth: "+1 Monat",
      plusOneYear: "+1 Jahr",
      addQuerySet: "Query-Set hinzufügen",
      compareButton: "Vergleichen",
      comparing: "Vergleiche…",
      noYearData: "Keine datierten Treffer für die aktuellen Query-Sets.",
      publicationsPerYear: "Publikationen pro Jahr",
      overviewHeading: "Übersicht",
      querySetColumn: "Query-Set",
      totalHits: "Treffer gesamt",
      totalRowLabel: "Gesamt",
      citationListHeading: "Publikationsliste (APA)",
      showList: "Liste anzeigen",
      hideList: "Liste ausblenden",
      showingOf: "zeigt {shown} von {total}",
      historyHeading: "Frühere Vergleiche",
      historyEmpty: "Noch keine Vergleiche gespeichert.",
      loadIntoEditor: "In Editor laden",
      deleteRun: "Vergleich löschen",
      unnamed: "(ohne Namen)",
    },
    network: {
      title: "Kollaborations-Netzwerk",
      subtitle:
        "Vergleicht mehrere Tag-/Autor:innen-Kombinationen paarweise und zeigt, wie stark sie über gemeinsame Publikationen verbunden sind.",
      addNode: "Knoten hinzufügen",
      buildButton: "Netzwerk erstellen",
      building: "Erstelle…",
      graphHeading: "Netzwerk",
      collabRankingHeading: "Rangliste nach Kollaborationen",
      totalPublicationsColumn: "Publikationen gesamt",
      collaborativeColumn: "Kollaborativ",
      pairRankingHeading: "Stärkste Verbindungen",
      sharedCount: "{count} gemeinsame Publikationen",
      noOverlap: "Keine gemeinsamen Publikationen",
      minTwoSets: "Es werden mindestens zwei Knoten benötigt.",
      historyHeading: "Frühere Netzwerke",
      historyEmpty: "Noch keine Netzwerke gespeichert.",
      deleteRun: "Netzwerk löschen",
      trackedAuthorsLabel: "Erfasste Autor:innen (optional)",
      trackedAuthorsPlaceholder: "Namen eingeben, Enter drücken…",
      trackedAuthorsHint:
        "Schränkt diesen Knoten nicht ein - zeigt nur, wer hinter den unten stehenden Verbindungen steckt.",
      notTracked: "nicht erfasst",
      pointsLabel: "Punkte",
      winsLabel: "zugeschrieben",
      tiesLabel: "Unentschieden",
      unassignedLabel: "nicht zuordenbar",
      otherQuerySetLabel: "von einem anderen erfassten Query-Set initiiert",
      method1Heading: "Methode 1: Initiator:in",
      method1Explainer:
        "Wer zuerst in der Autor:innen-Liste einer gemeinsamen Publikation vorkommt, bekommt die ganze Publikation zugeschrieben - dabei zählen die erfassten Autor:innen aller Query-Sets im Netzwerk, nicht nur der beiden hier verglichenen. Steht die erste erfasste Person auf einem dritten, hier nicht verglichenen Query-Set, wird die Publikation als 'von einem anderen Query-Set initiiert' geführt, statt fälschlich einem der beiden verglichenen Query-Sets zugeschrieben zu werden. Kommt niemand vor, oder ist die erste erfasste Person auf beiden verglichenen Listen zugleich, bleibt sie unzugeordnet.",
      method2Heading: "Methode 2: Medaillenwertung",
      method2Explainer:
        "Jede Position in der Autor:innen-Liste bringt Punkte: Gold für die erste Person, Silber für die zweite oder letzte Person, Bronze für alle dazwischen. Die Punkte zählen für das Query-Set, dem die jeweilige Person angehört; wer mehr Punkte hat, gewinnt diese Publikation.",
      explainerTriggerLabel: "Wie wird das gezählt?",
    },
    common: {
      unknownError: "Unbekannter Fehler.",
      periodLabel: "Zeitraum",
      allDates: "alle Daten",
    },
  },
  en: {
    nav: {
      overview: "Overview",
      compare: "Tag Compare",
      network: "Tag NetworkVis",
      settings: "Settings",
      logout: "Log out",
    },
    auth: {
      loginTitle: "Log in",
      loginSubtitle: "Please log in to use ZoteroSciStats.",
      usernameLabel: "Username",
      passwordLabel: "Password",
      loginButton: "Log in",
      loggingIn: "Logging in…",
    },
    home: {
      title: "ZoteroSciStats",
      subtitle:
        "Publication statistics straight from your Zotero library - filtered by tags, authors, and date ranges, with side-by-side comparison of multiple searches. Read-only access, local cache in MongoDB.",
      features: [
        {
          title: "Strictly read-only",
          text: "The app only ever issues GET requests to the Zotero API. There is no write function anywhere in the code - a read-only Zotero key is all it needs.",
        },
        {
          title: "Reliable sync",
          text: "The first sync pulls the whole library; after that, an incremental sync runs off Zotero's library version. Progress is only committed once a run fully succeeds.",
        },
        {
          title: "Compare multiple searches",
          text: "Combine 1..N tags and authors with AND/OR logic and a date range into named query sets - e.g. #ICMT 2026 vs. #CDHSI 2026 - and compare them side by side.",
        },
        {
          title: "Built for large libraries",
          text: "Designed for thousands of entries across many years, thanks to a local MongoDB cache instead of repeated live queries.",
        },
      ],
    },
    settings: {
      title: "Settings",
      subtitle:
        "Connects the app to your library via a Zotero API key (read-only). The key is stored only in your local MongoDB, never in git.",
      connectHeading: "Connect Zotero library",
      connectedWith: "Currently connected to",
      apiKeyLabel: "Zotero API key (read-only)",
      apiKeyHint: "Create a key at zotero.org/settings/keys and disable any write access there.",
      fetchLibraries: "Fetch libraries",
      selectLibraryLabel: "Select library",
      saveConnection: "Save connection",
      syncHeading: "Synchronization",
      status: "Status",
      itemsInCache: "Items in cache",
      cacheSize: "Cache size",
      lastSync: "Last sync",
      never: "never",
      lastError: "Last error",
      lastSyncDuration: "Last sync duration",
      lastSyncChanges: "Changes in last sync",
      added: "added",
      updated: "updated",
      deleted: "deleted",
      notRecordedYet: "will be recorded on the next sync",
      syncNow: "Sync now",
      syncing: "Syncing…",
      reprocessHeading: "Reprocess cache",
      reprocessHint:
        "Recomputes derived fields (e.g. author names for filtering) for already-synced items - purely from the raw data already stored locally, without touching the Zotero API again. Useful right after this update if you already imported a large library.",
      reprocessButton: "Reprocess cache (no Zotero access)",
      reprocessing: "Processing…",
      reprocessDone: "items reprocessed",
      accessHeading: "Access management",
      accessHint:
        "Create accounts for colleagues who should use this instance. Only visible and effective when access management is enabled for this deployment.",
      addMember: "Add member",
      addingMember: "Creating…",
      usernamePlaceholder: "Username",
      newMemberPasswordNotice: "Password for {username} - copy and share it now, it won't be shown again:",
      copyPassword: "Copy",
      copied: "Copied",
      memberUsernameColumn: "Username",
      memberRoleColumn: "Role",
      memberCreatedColumn: "Created",
      removeMember: "Remove",
      noMembersYet: "No members created yet.",
    },
    compare: {
      title: "Tag Compare",
      subtitle: "Put several tag and author combinations, within the same time range, side by side.",
      loadExample: "Load example (ICMT vs. CDHSI)",
      querySetNamePlaceholder: "Query set name",
      removeQuerySet: "Remove query set",
      tagsLabel: "Tags",
      tagsPlaceholder: "Type a tag, press Enter…",
      tagModeAnd: "all tags (AND)",
      tagModeOr: "any tag (OR)",
      authorsLabel: "Authors",
      authorsPlaceholder: "Type an author, press Enter…",
      authorModeAnd: "all authors (AND)",
      authorModeOr: "any author (OR)",
      itemTypesLabel: "Publication type",
      peerReviewedGroup: "Peer-reviewed",
      otherTypesGroup: "Other",
      selectAllTypes: "Select all",
      deselectAllTypes: "Deselect all",
      yearLabel: "Date (from – to)",
      plusOneMonth: "+1 month",
      plusOneYear: "+1 year",
      addQuerySet: "Add query set",
      compareButton: "Compare",
      comparing: "Comparing…",
      noYearData: "No dated results for the current query sets.",
      publicationsPerYear: "Publications per year",
      overviewHeading: "Overview",
      querySetColumn: "Query set",
      totalHits: "Total hits",
      totalRowLabel: "Total",
      citationListHeading: "Publication list (APA)",
      showList: "Show list",
      hideList: "Hide list",
      showingOf: "showing {shown} of {total}",
      historyHeading: "Previous comparisons",
      historyEmpty: "No comparisons saved yet.",
      loadIntoEditor: "Load into editor",
      deleteRun: "Delete comparison",
      unnamed: "(unnamed)",
    },
    network: {
      title: "Collaboration Network",
      subtitle:
        "Compares several tag/author combinations pairwise and shows how strongly they're connected through shared publications.",
      addNode: "Add node",
      buildButton: "Build network",
      building: "Building…",
      graphHeading: "Network",
      collabRankingHeading: "Ranking by collaborations",
      totalPublicationsColumn: "Total publications",
      collaborativeColumn: "Collaborative",
      pairRankingHeading: "Strongest connections",
      sharedCount: "{count} shared publications",
      noOverlap: "No shared publications",
      minTwoSets: "At least two nodes are required.",
      historyHeading: "Previous networks",
      historyEmpty: "No networks saved yet.",
      deleteRun: "Delete network",
      trackedAuthorsLabel: "Tracked authors (optional)",
      trackedAuthorsPlaceholder: "Add a name, press Enter…",
      trackedAuthorsHint:
        "Doesn't narrow this node - only shows who's behind the connections below.",
      notTracked: "not tracked",
      pointsLabel: "points",
      winsLabel: "credited",
      tiesLabel: "Ties",
      unassignedLabel: "unassigned",
      otherQuerySetLabel: "initiated by another tracked query set",
      method1Heading: "Method 1: Initiator",
      method1Explainer:
        "Whoever appears first in a shared publication's author list gets the whole publication credited to them - checked against every tracked query set in the whole network, not just the two being compared here. If that earliest tracked person turns out to belong to a third query set (neither of these two), the publication is marked \"initiated by another tracked query set\" instead of being wrongly credited to whichever of these two happens to appear earlier between themselves. If nobody's tracked at all, or the earliest tracked person is on both compared lists at once, it's left unassigned.",
      method2Heading: "Method 2: Medal race",
      method2Explainer:
        "Every position in the author list earns points: gold for the first author, silver for the second or last author, bronze for everyone in between. The points count toward whichever query set that person belongs to; whoever has more points wins that publication.",
      explainerTriggerLabel: "How is this counted?",
    },
    common: {
      unknownError: "Unknown error.",
      periodLabel: "Period",
      allDates: "all dates",
    },
  },
};
