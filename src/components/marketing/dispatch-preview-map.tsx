"use client";

export default function DispatchPreviewMap() {
  const mapSrc =
    "https://www.openstreetmap.org/export/embed.html?bbox=-77.106%2C38.947%2C-76.982%2C39.062&layer=mapnik&marker=38.9818%2C-77.0456";

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-slate-900">
      <iframe
        title="DispatchOS live operations map preview"
        src={mapSrc}
        className="h-full w-full border-0"
        loading="eager"
        referrerPolicy="no-referrer-when-downgrade"
      />

      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 z-[400] h-full w-full"
      >
        <path
          d="M18 72 C 30 58, 42 65, 51 47 S 70 31, 82 24"
          fill="none"
          stroke="#06b6d4"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="4 3"
          opacity="0.95"
        />
        <circle cx="18" cy="72" r="3.2" fill="#06b6d4" stroke="#ffffff" strokeWidth="1.5" />
        <circle cx="82" cy="24" r="3.2" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
      </svg>

      <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded-lg border border-white/15 bg-slate-950/85 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur">
        Live route preview
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 z-[500] rounded-lg border border-emerald-400/20 bg-slate-950/90 px-3 py-2 text-xs text-emerald-200 backdrop-blur">
        Driver en route • 14 min
      </div>
    </div>
  );
}
