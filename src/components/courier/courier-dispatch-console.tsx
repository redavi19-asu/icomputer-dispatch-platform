"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  FileUp,
  Loader2,
  MapPinned,
  Plus,
  Route,
  Trash2,
  Truck,
} from "lucide-react";
import { authRequest } from "@/lib/dispatchos-auth";

type DraftStop = {
  id: string;
  trackingCode: string;
  customerName: string;
  phone: string;
  address: string;
  packageLocation: string;
  priority: number;
  timeWindowStart: string;
  timeWindowEnd: string;
  instructions: string;
  stopType: "pickup" | "delivery";
  pairKey: string;
  lat: number | null;
  lon: number | null;
};

type Driver = { id: string; name: string; status?: string | null };

type RouteStop = {
  id: string;
  status: string;
  trackingCode?: string | null;
  loadedAt?: string | null;
};

type CourierRoute = {
  id: string;
  name: string;
  status: string;
  driverName?: string | null;
  stops: RouteStop[];
};

const blankStop = (): DraftStop => ({
  id: crypto.randomUUID(),
  trackingCode: "",
  customerName: "",
  phone: "",
  address: "",
  packageLocation: "",
  priority: 0,
  timeWindowStart: "",
  timeWindowEnd: "",
  instructions: "",
  stopType: "delivery",
  pairKey: "",
  lat: null,
  lon: null,
});

const parseCsvLine = (line: string) => {
  const values: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }

  values.push(value.trim());
  return values;
};

const pick = (row: Record<string, string>, keys: string[]) => {
  for (const key of keys) {
    if (row[key]) return row[key];
  }
  return "";
};

const parseManifest = (text: string): DraftStop[] => {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) =>
    header.toLowerCase().replace(/[^a-z0-9]/g, "")
  );

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    const stopType = pick(row, ["stoptype", "type"]).toLowerCase();
    return {
      ...blankStop(),
      trackingCode: pick(row, ["tracking", "trackingcode", "barcode", "packageid", "id"]),
      customerName: pick(row, ["customer", "customername", "recipient", "name"]),
      phone: pick(row, ["phone", "mobile", "telephone"]),
      address: pick(row, ["address", "deliveryaddress", "dropoffaddress", "streetaddress"]),
      packageLocation: pick(row, ["packagelocation", "vehiclelocation", "bin", "shelf"]),
      priority: Number(pick(row, ["priority"])) || 0,
      timeWindowStart: pick(row, ["timewindowstart", "windowstart", "starttime"]),
      timeWindowEnd: pick(row, ["timewindowend", "windowend", "endtime"]),
      instructions: pick(row, ["instructions", "notes", "deliveryinstructions"]),
      stopType: stopType === "pickup" ? "pickup" : "delivery",
      pairKey: pick(row, ["pairkey", "orderid", "shipmentid"]),
    };
  });
};

const toRad = (value: number) => (value * Math.PI) / 180;
const haversineMiles = (a: [number, number], b: [number, number]) => {
  const radius = 3958.8;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
};

const geocode = async (address: string): Promise<[number, number]> => {
  const response = await fetch(
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=" +
      encodeURIComponent(address),
    { headers: { Accept: "application/json" } }
  );
  if (!response.ok) throw new Error("Address lookup failed.");
  const data = await response.json();
  if (!data?.[0]?.lat || !data?.[0]?.lon) {
    throw new Error("Address not found: " + address);
  }
  return [Number(data[0].lat), Number(data[0].lon)];
};

export function CourierDispatchConsole() {
  const [stops, setStops] = useState<DraftStop[]>([]);
  const [draft, setDraft] = useState<DraftStop>(() => blankStop());
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<CourierRoute[]>([]);
  const [routeName, setRouteName] = useState("Courier Manifest Route");
  const [driverId, setDriverId] = useState("");
  const [autoAssign, setAutoAssign] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(
    "Dispatch prepares the manifest and assignment. Physical package scanning happens in the driver app."
  );
  const [distanceMiles, setDistanceMiles] = useState<number | null>(null);

  const validStopCount = useMemo(
    () => stops.filter((stop) => stop.address.trim()).length,
    [stops]
  );

  const refresh = async () => {
    try {
      const [driverData, routeData] = await Promise.all([
        authRequest("/api/drivers", { method: "GET", cache: "no-store" }),
        authRequest("/api/courier/routes?active=1", { method: "GET", cache: "no-store" }),
      ]);
      setDrivers(Array.isArray(driverData.drivers) ? driverData.drivers : []);
      setRoutes(Array.isArray(routeData.routes) ? routeData.routes : []);
    } catch {
      // Keep the dispatcher page available even if the API is temporarily unavailable.
    }
  };

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(refresh, 7000);
    return () => window.clearInterval(timer);
  }, []);

  const importManifest = async (file: File) => {
    const rows = parseManifest(await file.text());
    setStops(rows);
    setDistanceMiles(null);
    const incomplete = rows.filter((stop) => !stop.address.trim()).length;
    setStatus(
      "Manifest imported: " +
        rows.length +
        " records." +
        (incomplete
          ? " " + incomplete + " record(s) still need an address."
          : " Ready to optimize and assign.")
    );
  };

  const addStop = () => {
    if (!draft.address.trim()) {
      setStatus("A dispatcher-created stop needs an address.");
      return;
    }
    setStops((current) => [...current, { ...draft, id: crypto.randomUUID() }]);
    setDraft(blankStop());
    setDistanceMiles(null);
    setStatus("Stop added to the manifest.");
  };

  const optimize = async () => {
    if (!stops.length || stops.some((stop) => !stop.address.trim())) {
      setStatus("Every manifest stop needs an address before optimization.");
      return;
    }

    setBusy(true);
    setStatus("Optimizing manifest route...");
    try {
      const located: DraftStop[] = [];
      for (const stop of stops) {
        const [lat, lon] =
          stop.lat != null && stop.lon != null
            ? [stop.lat, stop.lon]
            : await geocode(stop.address);
        located.push({ ...stop, lat, lon });
        await new Promise((resolve) => window.setTimeout(resolve, 150));
      }

      let current: [number, number] = [located[0].lat!, located[0].lon!];
      const remaining = [...located];
      const ordered: DraftStop[] = [];
      let total = 0;

      while (remaining.length) {
        const deliveredPairs = new Set(
          ordered
            .filter((stop) => stop.stopType === "pickup" && stop.pairKey)
            .map((stop) => stop.pairKey)
        );
        const eligibleIndexes = remaining
          .map((stop, index) => ({ stop, index }))
          .filter(({ stop }) => {
            if (stop.stopType !== "delivery" || !stop.pairKey) return true;
            const pickupExists = located.some(
              (candidate) =>
                candidate.stopType === "pickup" &&
                candidate.pairKey === stop.pairKey
            );
            return !pickupExists || deliveredPairs.has(stop.pairKey);
          });

        const candidates = eligibleIndexes.length
          ? eligibleIndexes
          : remaining.map((stop, index) => ({ stop, index }));

        let best = candidates[0];
        let bestScore = Number.POSITIVE_INFINITY;
        for (const candidate of candidates) {
          const distance = haversineMiles(current, [
            candidate.stop.lat!,
            candidate.stop.lon!,
          ]);
          const priorityBonus = Math.max(0, candidate.stop.priority) * 1.5;
          const windowBonus = candidate.stop.timeWindowStart ? 0.5 : 0;
          const score = distance - priorityBonus - windowBonus;
          if (score < bestScore) {
            bestScore = score;
            best = candidate;
          }
        }

        const [next] = remaining.splice(best.index, 1);
        const distance = haversineMiles(current, [next.lat!, next.lon!]);
        total += distance;
        ordered.push(next);
        current = [next.lat!, next.lon!];
      }

      setStops(ordered);
      setDistanceMiles(total);
      setStatus("Manifest route optimized. Assign it to a driver when ready.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Route optimization failed.");
    } finally {
      setBusy(false);
    }
  };

  const dispatch = async () => {
    if (!stops.length || stops.some((stop) => !stop.address.trim())) {
      setStatus("Every manifest stop needs an address before dispatch.");
      return;
    }

    setBusy(true);
    setStatus("Creating route and assigning driver...");
    try {
      const data = await authRequest("/api/courier/routes", {
        method: "POST",
        body: JSON.stringify({
          name: routeName,
          driverId: autoAssign ? null : driverId || null,
          autoAssign,
          totalDistanceMiles: distanceMiles,
          estimatedMinutes:
            distanceMiles == null
              ? null
              : Math.round(distanceMiles * 2.1 + stops.length * 4),
          stops: stops.map(({ id, ...stop }) => stop),
        }),
      });

      setStatus(
        data.route?.driverName
          ? "Route assigned to " +
              data.route.driverName +
              ". The driver must scan tracked packages into the vehicle before NEXT STOP unlocks."
          : "Route created. Assign a driver before loading."
      );
      setStops([]);
      setDistanceMiles(null);
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Route dispatch failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <section className="space-y-5">
        <div className="rounded-3xl border border-cyan-400/20 bg-slate-950/75 p-5 shadow-2xl backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
                Dispatcher
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                Prepare Courier Route
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
                Upload the company manifest, clean up addresses, optimize the stop order and assign the route. The driver phone handles all physical package scanning.
              </p>
            </div>
            <label className="cursor-pointer rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-100">
              <span className="inline-flex items-center gap-2">
                <FileUp className="h-4 w-4" /> Import Manifest CSV
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importManifest(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>

          <p className="mt-4 rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-3 text-sm text-cyan-100">
            {status}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-5 text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">
                Optional manual entry
              </p>
              <h3 className="mt-1 text-xl font-bold">Add Manifest Stop</h3>
            </div>
            <Plus className="h-5 w-5 text-cyan-300" />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              value={draft.trackingCode}
              onChange={(event) => setDraft({ ...draft, trackingCode: event.target.value })}
              placeholder="Tracking / barcode"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 outline-none"
            />
            <input
              value={draft.customerName}
              onChange={(event) => setDraft({ ...draft, customerName: event.target.value })}
              placeholder="Recipient"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 outline-none"
            />
            <input
              value={draft.address}
              onChange={(event) =>
                setDraft({ ...draft, address: event.target.value, lat: null, lon: null })
              }
              placeholder="Delivery / pickup address"
              className="md:col-span-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 outline-none"
            />
            <input
              value={draft.packageLocation}
              onChange={(event) => setDraft({ ...draft, packageLocation: event.target.value })}
              placeholder="Suggested vehicle bin (optional)"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 outline-none"
            />
            <select
              value={draft.stopType}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  stopType: event.target.value as "pickup" | "delivery",
                })
              }
              className="rounded-xl border border-white/10 bg-slate-900 px-3 py-3"
            >
              <option value="delivery">Delivery</option>
              <option value="pickup">Pickup</option>
            </select>
          </div>

          <button
            type="button"
            onClick={addStop}
            className="mt-4 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950"
          >
            Add Stop
          </button>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-5 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">
                Manifest
              </p>
              <h3 className="mt-1 text-xl font-bold">
                {validStopCount}/{stops.length} addressed
              </h3>
            </div>
            <button
              type="button"
              disabled={busy || !stops.length}
              onClick={() => void optimize()}
              className="inline-flex items-center gap-2 rounded-xl border border-violet-300/20 bg-violet-500/10 px-4 py-3 text-sm font-bold text-violet-100 disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Route className="h-4 w-4" />}
              Optimize
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {stops.map((stop, index) => (
              <div
                key={stop.id}
                className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 md:grid-cols-[3rem_1fr_auto] md:items-center"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400/15 text-sm font-black text-cyan-200">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{stop.address || "Address needed"}</p>
                  <p className="mt-1 text-xs text-white/45">
                    {stop.trackingCode || "No tracking code"}
                    {stop.stopType === "pickup" ? " • PICKUP" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setStops((current) => current.filter((item) => item.id !== stop.id))
                  }
                  className="rounded-lg p-2 text-white/40 hover:bg-rose-500/10 hover:text-rose-300"
                  aria-label="Remove stop"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {!stops.length ? (
              <p className="py-8 text-center text-sm text-white/35">
                Upload a manifest or add stops manually.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <aside className="space-y-5">
        <div className="rounded-3xl border border-emerald-400/20 bg-slate-950/80 p-5 text-white">
          <div className="flex items-center gap-3">
            <Truck className="h-6 w-6 text-emerald-300" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
                Assignment
              </p>
              <h3 className="text-xl font-black">Send to Driver</h3>
            </div>
          </div>

          <input
            value={routeName}
            onChange={(event) => setRouteName(event.target.value)}
            placeholder="Route name"
            className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 outline-none"
          />

          <label className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm">
            <span>Auto-assign best available driver</span>
            <input
              type="checkbox"
              checked={autoAssign}
              onChange={(event) => setAutoAssign(event.target.checked)}
            />
          </label>

          {!autoAssign ? (
            <select
              value={driverId}
              onChange={(event) => setDriverId(event.target.value)}
              className="mt-3 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3"
            >
              <option value="">Choose driver</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                  {driver.status ? " • " + driver.status : ""}
                </option>
              ))}
            </select>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-2xl font-black">{stops.length}</p>
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/35">Stops</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-2xl font-black">
                {distanceMiles == null ? "—" : distanceMiles.toFixed(1)}
              </p>
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/35">Miles</p>
            </div>
          </div>

          <button
            type="button"
            disabled={busy || !stops.length}
            onClick={() => void dispatch()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 font-black text-slate-950 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
            Assign Route
          </button>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-5 text-white">
          <div className="flex items-center gap-2">
            <MapPinned className="h-5 w-5 text-cyan-300" />
            <h3 className="font-bold">Live Courier Routes</h3>
          </div>

          <div className="mt-4 space-y-2">
            {routes.map((route) => {
              const delivered = route.stops.filter((stop) => stop.status === "Delivered").length;
              const tracked = route.stops.filter((stop) => Boolean(stop.trackingCode));
              const loaded = tracked.filter((stop) => Boolean(stop.loadedAt)).length;

              return (
                <div
                  key={route.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{route.name}</p>
                    <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-[10px] font-bold uppercase text-cyan-200">
                      {route.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/45">
                    {route.driverName || "Unassigned"} • {delivered}/{route.stops.length} delivered
                  </p>
                  {tracked.length ? (
                    <p className="mt-1 text-xs text-amber-200">
                      Vehicle load: {loaded}/{tracked.length} scanned
                    </p>
                  ) : null}
                  {route.stops.length > 0 && delivered === route.stops.length ? (
                    <p className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Route complete
                    </p>
                  ) : null}
                </div>
              );
            })}

            {!routes.length ? (
              <p className="py-5 text-center text-sm text-white/35">
                No active courier routes.
              </p>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}
