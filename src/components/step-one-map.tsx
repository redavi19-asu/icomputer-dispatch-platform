"use client";

import { MapPin } from "lucide-react";
import { useGeolocation } from "@/lib/useGeolocation";

type StepOneMapProps = {
  defaultEmbedUrl: string;
};

export function StepOneMap({ defaultEmbedUrl }: StepOneMapProps) {
  const { location, isLoading, error } = useGeolocation(true);
  const mapsUrl = location
    ? `https://www.google.com/maps?q=${location.lat},${location.lng}`
    : null;

  const formatCoordinates = (lat: number, lng: number) => {
    const latDir = lat >= 0 ? "N" : "S";
    const lngDir = lng >= 0 ? "E" : "W";
    const latAbs = Math.abs(lat).toFixed(2);
    const lngAbs = Math.abs(lng).toFixed(2);
    return `${latAbs}°${latDir}, ${lngAbs}°${lngDir}`;
  };

  return (
    <div className="space-y-3">
      {/* Location status banner */}
      <div className="rounded-lg bg-slate-900/60 px-4 py-3 text-sm border border-cyan-500/30 backdrop-blur-sm">
        {isLoading && (
          <p className="text-cyan-300 font-medium">
            📍 Detecting your location...
          </p>
        )}

        {location && !isLoading && (
          <div>
            <p className="text-green-400 font-semibold mb-1">
              ✓ Location detected
            </p>
            <p className="text-white/80 mb-3">
              <span className="text-cyan-300">Near:</span> {" "}
              <span className="font-mono text-white">{formatCoordinates(location.lat, location.lng)}</span>
              {location.accuracy && (
                <span className="text-white/60"> (±{Math.round(location.accuracy)}m)</span>
              )}
            </p>
            <a
              href={mapsUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-white font-semibold text-sm transition-colors"
              title="Open Google Maps with your location"
            >
              <MapPin className="h-4 w-4" />
              View My Location
            </a>
          </div>
        )}

        {error && !isLoading && (
          <div>
            <p className="text-amber-400 font-semibold mb-1">
              📍 Location access is off
            </p>
            <p className="text-white/80">
              Using default service area view. Enable location in your browser to show coverage near you.
            </p>
          </div>
        )}
      </div>

      {/* Static default embedded map - stays valid and reliable */}
      <iframe
        src={defaultEmbedUrl}
        title="Service location map - Washington DC area"
        className="h-[320px] w-full border-0 md:h-[420px] rounded-lg shadow-lg"
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
