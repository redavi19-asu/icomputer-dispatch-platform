import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE_DEFAULT = "https://chargenext-api.ryanedavis.workers.dev";

function Badge({ ok, label }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,.10)",
        background: "rgba(255,255,255,.06)",
        color: "rgba(255,255,255,.85)",
        fontSize: 12,
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: ok ? "#25d366" : "#ffcc00",
          boxShadow: ok ? "0 0 0 6px rgba(37,211,102,.12)" : "0 0 0 6px rgba(255,204,0,.10)",
        }}
      />
      {label}
    </span>
  );
}

function Card({ title, right, children }) {
  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,.10)",
        background: "rgba(16,31,57,.78)",
        boxShadow: "0 18px 50px rgba(0,0,0,.35)",
        padding: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#cfe0ff" }}>{title}</div>
        {right}
      </div>
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  );
}

function SmallBtn({ children, onClick, active }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 10px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,.10)",
        background: active ? "rgba(43,111,255,.22)" : "rgba(27,43,76,.9)",
        color: "rgba(255,255,255,.9)",
        fontWeight: 900,
        cursor: "pointer",
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function PrimaryBtn({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        border: 0,
        background: disabled
          ? "rgba(43,111,255,.25)"
          : "linear-gradient(180deg, rgba(43,111,255,.95), rgba(43,111,255,.78))",
        color: "white",
        fontWeight: 900,
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {children}
    </button>
  );
}

function formatLatLng(lat, lng) {
  if (lat == null || lng == null) return "—";
  return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
}

export default function App() {
  const [apiBase, setApiBase] = useState(API_BASE_DEFAULT);
  const [driverId, setDriverId] = useState(6);
  const [available, setAvailable] = useState(true);

  const [health, setHealth] = useState(null);
  const [log, setLog] = useState([]);

  // Manual accept
  const [pendingDispatchId, setPendingDispatchId] = useState("");
  const [acceptResult, setAcceptResult] = useState(null);

  // Feed + selection
  const [feedStatus, setFeedStatus] = useState({ ok: false, message: "Not loaded yet." });
  const [jobs, setJobs] = useState([]);
  const [selected, setSelected] = useState(null);

  // Toggles
  const [autoRefresh, setAutoRefresh] = useState(true);

  // View mode: "pending" (default) | "mine" | "all"
  const [view, setView] = useState("mine");

  // Manual map override
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

  const api = useMemo(() => apiBase.trim().replace(/\/$/, ""), [apiBase]);
  const timerRef = useRef(null);

  const addLog = (entry) => {
    setLog((prev) => [{ at: new Date().toISOString(), ...entry }, ...prev].slice(0, 25));
  };

  const refreshHealth = async () => {
    try {
      const res = await fetch(`${api}/health`);
      const data = await res.json();
      setHealth(data);
      addLog({ type: "health", ok: true, data });
    } catch (e) {
      addLog({ type: "health", ok: false, error: String(e?.message || e) });
    }
  };

  const accept = async (idOverride) => {
    setAcceptResult(null);
    const id = Number(idOverride ?? pendingDispatchId);
    if (!id) {
      setAcceptResult({ ok: false, error: "Enter a pendingDispatchId first." });
      return;
    }
    try {
      const res = await fetch(`${api}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingDispatchId: id, driverId: Number(driverId) }),
      });
      const data = await res.json().catch(() => ({}));
      const out = { ok: res.ok, status: res.status, data };
      setAcceptResult(out);
      addLog({ type: "accept", ok: res.ok, status: res.status, data });

      // refresh feed after accept
      setTimeout(() => loadFeed(), 300);

      return out;
    } catch (e) {
      const out = { ok: false, error: String(e?.message || e) };
      setAcceptResult(out);
      addLog({ type: "accept", ok: false, error: String(e?.message || e) });
      return out;
    }
  };

  const loadFeed = async () => {
    try {
      setFeedStatus({ ok: false, message: "Loading…" });
      const res = await fetch(`${api}/driver-feed?driverId=${encodeURIComponent(String(driverId))}`);
      if (!res.ok) {
        const text = await res.text();
        setFeedStatus({ ok: false, message: `Feed error (HTTP ${res.status}): ${text.slice(0, 140)}` });
        setJobs([]);
        return;
      }
      const data = await res.json().catch(() => ({}));
      const list = Array.isArray(data.jobs) ? data.jobs : [];
      setJobs(list);
      setFeedStatus({ ok: true, message: `Loaded ${list.length} job(s).` });

      // keep selection if still exists
      setSelected((prev) => {
        if (prev) {
          const still = list.find((j) => j.pendingDispatchId === prev.pendingDispatchId);
          if (still) return still;
        }

        // pick based on view
        if (view === "pending") return list.find((j) => j.status === "pending") || null;
        if (view === "mine") return list.find((j) => j.status === "accepted_by_me") || null;
        return list[0] || null;
      });

      addLog({ type: "feed", ok: true, count: list.length });
    } catch (e) {
      setFeedStatus({ ok: false, message: `Feed error: ${String(e?.message || e)}` });
      setJobs([]);
      addLog({ type: "feed", ok: false, error: String(e?.message || e) });
    }
  };

  useEffect(() => {
    refreshHealth();
    loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoRefresh) {
      timerRef.current = setInterval(() => loadFeed(), 6000);
    }
    return () => timerRef.current && clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, api, driverId, view]);

  const visibleJobs = useMemo(() => {
    const list = Array.isArray(jobs) ? jobs : [];
    if (view === "pending") return list.filter((j) => j.status === "pending");
    if (view === "mine") return list.filter((j) => j.status === "accepted_by_me");
    return list;
  }, [jobs, view]);

  // Map values (guard against NaN)
  const mapInfo = useMemo(() => {
    const rawLat = selected?.lat ?? manualLat;
    const rawLng = selected?.lng ?? manualLng;

    const lat = rawLat === "" || rawLat == null ? null : Number(rawLat);
    const lng = rawLng === "" || rawLng == null ? null : Number(rawLng);

    const safeLat = Number.isFinite(lat) ? lat : null;
    const safeLng = Number.isFinite(lng) ? lng : null;

    const mapLink =
      selected?.mapLink ||
      (safeLat != null && safeLng != null
        ? `https://maps.google.com/?q=${encodeURIComponent(safeLat)},${encodeURIComponent(safeLng)}`
        : "");

    return { lat: safeLat, lng: safeLng, mapLink };
  }, [selected, manualLat, manualLng]);

  const osmEmbed = useMemo(() => {
    const lat = mapInfo.lat;
    const lng = mapInfo.lng;

    // Hard stop if values aren't valid numbers
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const d = 0.02; // zoom window (bigger = more zoomed out)
    const left = lng - d;
    const right = lng + d;
    const top = lat + d;
    const bottom = lat - d;

    return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
      `${left},${bottom},${right},${top}`
    )}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lng}`)}`;
  }, [mapInfo.lat, mapInfo.lng]);

  const viewTitle =
    view === "pending" ? "Job Feed (pending)" : view === "mine" ? "My Accepted Jobs" : "Job Feed (all)";

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 600px at 20% -10%, rgba(43,111,255,.35), transparent 55%), radial-gradient(900px 600px at 80% 0%, rgba(37,211,102,.18), transparent 50%), #0b1220",
        color: "white",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
        padding: 18,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 0.2 }}>ChargeNext — Driver App</div>
            <div style={{ color: "rgba(255,255,255,.65)", fontSize: 12, marginTop: 4 }}>
              Views: Pending (default) • Mine • All
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Badge ok={health?.ok === true} label={health?.ok ? "API healthy" : "checking"} />
            <SmallBtn onClick={refreshHealth}>Refresh</SmallBtn>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "420px 1fr",
            gap: 14,
            marginTop: 14,
            alignItems: "start",
          }}
        >
          {/* LEFT */}
          <Card title="Driver Status">
            <label style={{ fontSize: 12, color: "rgba(255,255,255,.65)" }}>API Base</label>
            <input
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              style={{
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.10)",
                background: "rgba(11,18,32,.65)",
                color: "white",
                outline: "none",
                fontSize: 13,
              }}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
              <div>
                <label style={{ fontSize: 12, color: "rgba(255,255,255,.65)" }}>Driver ID</label>
                <input
                  type="number"
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,.10)",
                    background: "rgba(11,18,32,.65)",
                    color: "white",
                    outline: "none",
                    fontSize: 13,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: "rgba(255,255,255,.65)" }}>Availability</label>
                <button
                  onClick={() => setAvailable((v) => !v)}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,.10)",
                    background: available
                      ? "linear-gradient(180deg, rgba(37,211,102,.95), rgba(37,211,102,.75))"
                      : "rgba(27,43,76,.9)",
                    color: "white",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  {available ? "Available" : "Offline"}
                </button>
              </div>
            </div>

            <div style={{ marginTop: 14, fontSize: 13, fontWeight: 800, color: "#cfe0ff" }}>
              Accept a job (manual)
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <input
                value={pendingDispatchId}
                onChange={(e) => setPendingDispatchId(e.target.value)}
                placeholder="pendingDispatchId"
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,.10)",
                  background: "rgba(11,18,32,.65)",
                  color: "white",
                  outline: "none",
                  fontSize: 13,
                }}
              />
              <PrimaryBtn onClick={() => accept()}>Accept</PrimaryBtn>
            </div>

            {acceptResult && (
              <div
                style={{
                  marginTop: 10,
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,.10)",
                  background: "rgba(0,0,0,.25)",
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
                  fontSize: 12,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {JSON.stringify(acceptResult, null, 2)}
              </div>
            )}
          </Card>

          {/* RIGHT */}
          <div style={{ display: "grid", gap: 14 }}>
            <Card
              title={viewTitle}
              right={
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <Badge ok={feedStatus.ok} label={feedStatus.ok ? "feed ok" : "feed"} />
                  <SmallBtn onClick={loadFeed}>Load</SmallBtn>
                  <SmallBtn onClick={() => setAutoRefresh((v) => !v)} active={autoRefresh}>
                    Auto {autoRefresh ? "ON" : "OFF"}
                  </SmallBtn>
                  <SmallBtn onClick={() => setView("pending")} active={view === "pending"}>
                    Pending
                  </SmallBtn>
                  <SmallBtn onClick={() => setView("mine")} active={view === "mine"}>
                    Mine
                  </SmallBtn>
                  <SmallBtn onClick={() => setView("all")} active={view === "all"}>
                    All
                  </SmallBtn>
                </div>
              }
            >
              <div style={{ color: "rgba(255,255,255,.65)", fontSize: 12, lineHeight: 1.35 }}>
                {feedStatus.message}
              </div>

              {visibleJobs.length === 0 ? (
                <div
                  style={{
                    marginTop: 10,
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,.10)",
                    background: "rgba(0,0,0,.22)",
                  }}
                >
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>
                    {view === "pending"
                      ? "No pending jobs right now"
                      : view === "mine"
                        ? "No accepted jobs assigned to you yet"
                        : "No jobs listed"}
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {visibleJobs.map((j) => {
                    const isSel = selected?.pendingDispatchId === j.pendingDispatchId;
                    const canAccept = j.status === "pending";
                    return (
                      <div
                        key={j.pendingDispatchId}
                        onClick={() => {
                          setSelected(j);
                          setPendingDispatchId(String(j.pendingDispatchId));
                          if (j.lat != null) setManualLat(String(j.lat));
                          if (j.lng != null) setManualLng(String(j.lng));
                        }}
                        style={{
                          cursor: "pointer",
                          padding: 12,
                          borderRadius: 14,
                          border: `1px solid ${isSel ? "rgba(43,111,255,.55)" : "rgba(255,255,255,.10)"}`,
                          background: isSel ? "rgba(43,111,255,.12)" : "rgba(0,0,0,.22)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                          <div style={{ fontWeight: 900 }}>
                            #{j.pendingDispatchId}{" "}
                            <span style={{ color: "rgba(255,255,255,.65)", fontWeight: 700 }}>
                              {j.status || "pending"}
                            </span>
                          </div>

                          <PrimaryBtn
                            disabled={!canAccept}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (canAccept) accept(j.pendingDispatchId);
                            }}
                          >
                            Accept
                          </PrimaryBtn>
                        </div>

                        <div style={{ marginTop: 6, color: "rgba(255,255,255,.75)", fontSize: 12 }}>
                          {j.message || "ChargeNext: NEW JOB"}
                        </div>
                        <div style={{ marginTop: 6, color: "rgba(255,255,255,.55)", fontSize: 12 }}>
                          {formatLatLng(j.lat, j.lng)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card
              title="Map Preview"
              right={
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <SmallBtn
                    onClick={() => {
                      setManualLat(selected?.lat != null ? String(selected.lat) : "");
                      setManualLng(selected?.lng != null ? String(selected.lng) : "");
                    }}
                  >
                    Use selected
                  </SmallBtn>
                  {mapInfo.mapLink ? (
                    <a
                      href={mapInfo.mapLink}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "8px 10px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,.10)",
                        background: "rgba(27,43,76,.9)",
                        color: "rgba(255,255,255,.9)",
                        fontWeight: 900,
                        textDecoration: "none",
                        fontSize: 12,
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      Open in Google Maps
                    </a>
                  ) : null}
                </div>
              }
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: "rgba(255,255,255,.65)" }}>Latitude</label>
                  <input
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    placeholder="38.8895"
                    style={{
                      width: "100%",
                      marginTop: 6,
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,.10)",
                      background: "rgba(11,18,32,.65)",
                      color: "white",
                      outline: "none",
                      fontSize: 13,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "rgba(255,255,255,.65)" }}>Longitude</label>
                  <input
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                    placeholder="-77.0353"
                    style={{
                      width: "100%",
                      marginTop: 6,
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,.10)",
                      background: "rgba(11,18,32,.65)",
                      color: "white",
                      outline: "none",
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                {osmEmbed ? (
                  <iframe
                    title="map"
                    src={osmEmbed}
                    style={{
                      width: "100%",
                      height: 420,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,.10)",
                      background: "rgba(0,0,0,.22)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      height: 420,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,.10)",
                      background: "rgba(0,0,0,.22)",
                      display: "grid",
                      placeItems: "center",
                      color: "rgba(255,255,255,.65)",
                      fontSize: 13,
                      padding: 14,
                      textAlign: "center",
                      lineHeight: 1.35,
                    }}
                  >
                    No location yet. Enter lat/lng above (or select a job).
                  </div>
                )}
              </div>
            </Card>

            <Card title="Activity Log" right={<SmallBtn onClick={() => setLog([])}>Clear</SmallBtn>}>
              <div style={{ display: "grid", gap: 10 }}>
                {log.length === 0 ? (
                  <div style={{ color: "rgba(255,255,255,.65)", fontSize: 13 }}>No activity yet.</div>
                ) : (
                  log.map((e, idx) => (
                    <div
                      key={idx}
                      style={{
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,.10)",
                        background: "rgba(0,0,0,.22)",
                        padding: 10,
                        fontSize: 12,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 900 }}>
                          {e.type} {e.ok === true ? "✅" : e.ok === false ? "⚠️" : ""}
                        </div>
                        <div style={{ color: "rgba(255,255,255,.55)" }}>{e.at}</div>
                      </div>
                      <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {JSON.stringify(e, null, 2)}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
