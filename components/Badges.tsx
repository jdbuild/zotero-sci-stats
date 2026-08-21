const badges: { label: string; message: string; color: string }[] = [
  { label: "license", message: "MIT", color: "3b82f6" },
  { label: "next.js", message: "15", color: "000000" },
  { label: "mongodb", message: "cache%2Fsync", color: "47A248" },
  { label: "zotero%20api", message: "read--only", color: "dc2f36" },
];

export function Badges() {
  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((b) => (
        // eslint-disable-next-line @next/next/no-img-element -- shields.io badges have no fixed size next/image can rely on
        <img
          key={b.label}
          src={`https://img.shields.io/badge/${b.label}-${b.message}-${b.color}`}
          alt={`${b.label}: ${decodeURIComponent(b.message)}`}
          className="h-5"
        />
      ))}
    </div>
  );
}
