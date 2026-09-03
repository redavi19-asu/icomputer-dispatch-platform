const buildTenantOperationsSyncScript = (apiBase: string) => `
(() => {
  try {
    const API_BASE = ${JSON.stringify(apiBase)};
    if (!API_BASE) return;

    const path = window.location.pathname.replace(/^\\/icomputer-dispatch-platform/, "");
    if (!/^\\/(workspace|dashboard|driver|download)(\\/|$)/.test(path)) return;

    const SESSION_KEY = "dispatchos_session";
    const JOBS_KEY = "dispatch_jobs";
    const DRIVER_KEY_PREFIX = "dispatch.workspace.drivers.";
    const DRIVER_ALIAS_PREFIX = "dispatch.sync.driver-alias.";
    const JOB_ALIAS_PREFIX = "dispatch.sync.job-alias.";
    const DRIVER_UPDATED_EVENT = "dispatch:workspace-drivers-updated";

    const readJson = (key, fallback) => {
      try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    };

    const readSessionJson = (key, fallback) => {
      try {
        const raw =
          window.sessionStorage.getItem(key) ||
          window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    };

    const session = readSessionJson(SESSION_KEY, null);
    const token = session && session.token;
    const company = session && session.company;
    const userRole = session && session.user && session.user.role;
    if (!token || !company || !company.id || !company.slug) return;

    const tenantSlug = company.slug;
    const driverKey = DRIVER_KEY_PREFIX + tenantSlug;
    const driverAliasKey = DRIVER_ALIAS_PREFIX + tenantSlug;
    const jobAliasKey = JOB_ALIAS_PREFIX + tenantSlug;
    const isDriver = userRole === "driver";

    let driverAliases = readJson(driverAliasKey, {});
    let jobAliases = readJson(jobAliasKey, {});
    let remoteDrivers = [];
    let remoteJobs = [];
    let initialized = false;
    let busy = false;

    const asArray = (value) => Array.isArray(value) ? value : [];
    const getLocalDrivers = () => asArray(readJson(driverKey, []));
    const getLocalJobs = () => asArray(readJson(JOBS_KEY, []));

    const saveAliases = () => {
      window.localStorage.setItem(driverAliasKey, JSON.stringify(driverAliases));
      window.localStorage.setItem(jobAliasKey, JSON.stringify(jobAliases));
    };

    const driverId = (value) => {
      if (!value || typeof value !== "string") return value || null;
      return driverAliases[value] || value;
    };

    const jobId = (value) => {
      if (!value || typeof value !== "string") return value || null;
      return jobAliases[value] || value;
    };

    const normalizeDrivers = (items) => asArray(items).map((item) => ({
      ...item,
      id: driverId(item && item.id),
    }));

    const normalizeJobs = (items) => asArray(items).map((item) => ({
      ...item,
      id: jobId(item && item.id),
      driverId: driverId(item && item.driverId),
      companySlug: tenantSlug,
    }));

    const api = async (endpoint, init = {}) => {
      const headers = new Headers(init.headers || {});
      headers.set("Authorization", "Bearer " + token);
      if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
      const response = await window.fetch(API_BASE.replace(/\\/$/, "") + endpoint, {
        ...init,
        headers,
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data && data.error ? data.error : "DispatchOS sync request failed");
      return data;
    };

    const driverStatus = (driver) => {
      if (!driver || driver.accountStatus === "disabled") return "offline";
      const state = String(driver.liveWorkStatus || driver.status || "available");
      if (state === "on-route") return "en-route";
      if (["assigned", "at-pickup", "at-stop", "busy"].includes(state)) return "busy";
      if (state === "offline") return "offline";
      return "available";
    };

    const writeRemoteDrivers = (drivers) => {
      const current = normalizeDrivers(getLocalDrivers());
      const byId = new Map(current.map((driver) => [driver.id, driver]));
      const next = asArray(drivers).map((driver) => {
        const existing = byId.get(driver.id);
        const status = String(driver.status || "available");
        return {
          id: driver.id,
          name: driver.name || "Unnamed Driver",
          phone: driver.phone || "",
          zone: existing && existing.zone ? existing.zone : "Unassigned",
          accountStatus: status === "disabled" ? "disabled" : "enabled",
          inviteStatus: driver.userId ? "joined" : (existing && existing.inviteStatus) || "invite-sent",
          liveWorkStatus:
            status === "en-route" ? "on-route" :
            status === "busy" ? "at-stop" :
            status === "offline" ? "offline" : "available",
        };
      });
      window.localStorage.setItem(driverKey, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(DRIVER_UPDATED_EVENT, { detail: { companySlug: tenantSlug } }));
    };

    const writeRemoteJobs = (jobs) => {
      window.localStorage.setItem(JOBS_KEY, JSON.stringify(normalizeJobs(jobs)));
    };

    const fetchRemoteDrivers = async () => {
      const data = await api("/api/drivers");
      return asArray(data.drivers);
    };

    const fetchRemoteJobs = async () => {
      const data = await api("/api/jobs");
      return asArray(data.jobs);
    };

    const migrateDrivers = async (source) => {
      if (isDriver) return;
      for (const driver of asArray(source)) {
        if (!driver || !driver.id || !driver.name) continue;
        try {
          const data = await api("/api/drivers", {
            method: "POST",
            body: JSON.stringify({
              name: driver.name,
              phone: driver.phone || "",
              status: driverStatus(driver),
            }),
          });
          if (data.driver && data.driver.id) driverAliases[driver.id] = data.driver.id;
        } catch {
          // Keep isolated local data and retry later.
        }
      }
      saveAliases();
    };

    const migrateJobs = async (source) => {
      if (isDriver) return;
      for (const job of asArray(source)) {
        if (!job || !job.id) continue;
        try {
          const data = await api("/api/jobs", {
            method: "POST",
            body: JSON.stringify({
              name: job.name || "Customer",
              phone: job.phone || "",
              service: job.service || "",
              address: job.address || "",
              details: job.details || "",
              driverId: driverId(job.driverId),
            }),
          });
          if (data.job && data.job.id) {
            jobAliases[job.id] = data.job.id;
            const needsPatch =
              (job.status && job.status !== data.job.status) ||
              (job.etaMinutes !== undefined && job.etaMinutes !== data.job.etaMinutes);
            if (needsPatch) {
              await api("/api/jobs", {
                method: "PATCH",
                body: JSON.stringify({
                  id: data.job.id,
                  status: job.status || data.job.status,
                  driverId: driverId(job.driverId),
                  etaMinutes: job.etaMinutes ?? null,
                }),
              });
            }
          }
        } catch {
          // Keep isolated local data and retry later.
        }
      }
      saveAliases();
    };

    const pushDriverChanges = async () => {
      if (isDriver) return;
      const local = normalizeDrivers(getLocalDrivers());
      const remoteById = new Map(remoteDrivers.map((driver) => [driver.id, driver]));

      for (const driver of local) {
        if (!driver || !driver.id || !driver.name) continue;
        const remote = remoteById.get(driver.id);
        if (!remote) {
          const data = await api("/api/drivers", {
            method: "POST",
            body: JSON.stringify({
              name: driver.name,
              phone: driver.phone || "",
              status: driverStatus(driver),
            }),
          }).catch(() => null);
          if (data && data.driver && data.driver.id) driverAliases[driver.id] = data.driver.id;
          continue;
        }

        const nextStatus = driverStatus(driver);
        if (
          String(remote.name || "") !== String(driver.name || "") ||
          String(remote.phone || "") !== String(driver.phone || "") ||
          String(remote.status || "") !== nextStatus
        ) {
          await api("/api/drivers", {
            method: "PATCH",
            body: JSON.stringify({
              id: driver.id,
              name: driver.name,
              phone: driver.phone || "",
              status: nextStatus,
            }),
          }).catch(() => null);
        }
      }
      saveAliases();
    };

    const pushJobChanges = async () => {
      const local = normalizeJobs(getLocalJobs());
      const remoteById = new Map(remoteJobs.map((job) => [job.id, job]));
      const localIds = new Set(local.map((job) => job && job.id).filter(Boolean));

      if (!isDriver) {
        for (const remote of remoteJobs) {
          if (remote && remote.id && !localIds.has(remote.id)) {
            await api("/api/jobs?id=" + encodeURIComponent(remote.id), { method: "DELETE" }).catch(() => null);
          }
        }
      }

      for (const job of local) {
        if (!job || !job.id) continue;
        const remote = remoteById.get(job.id);

        if (!remote) {
          if (isDriver) continue;
          const data = await api("/api/jobs", {
            method: "POST",
            body: JSON.stringify({
              name: job.name || "Customer",
              phone: job.phone || "",
              service: job.service || "",
              address: job.address || "",
              details: job.details || "",
              driverId: driverId(job.driverId),
            }),
          }).catch(() => null);
          if (data && data.job && data.job.id) jobAliases[job.id] = data.job.id;
          continue;
        }

        const patch = { id: job.id };
        let changed = false;
        if (job.status && job.status !== remote.status) { patch.status = job.status; changed = true; }
        if (!isDriver && driverId(job.driverId) !== (remote.driverId || null)) {
          patch.driverId = driverId(job.driverId);
          changed = true;
        }
        if (job.etaMinutes !== undefined && job.etaMinutes !== remote.etaMinutes) {
          patch.etaMinutes = job.etaMinutes;
          changed = true;
        }
        if (!remote.pickupVerifiedAt && job.pickupVerifiedAt && job.pickupVerificationToken) {
          patch.verificationAction = "confirm-pickup";
          patch.verificationToken = job.pickupVerificationToken;
          changed = true;
        } else if (!remote.deliveryVerifiedAt && job.deliveryVerifiedAt && job.deliveryVerificationToken) {
          patch.verificationAction = "confirm-delivery";
          patch.verificationToken = job.deliveryVerificationToken;
          changed = true;
        } else if (!remote.handoffVerifiedAt && job.handoffVerifiedAt && job.verificationToken) {
          patch.verificationAction = "confirm-handoff";
          patch.verificationToken = job.verificationToken;
          changed = true;
        }

        if (changed) {
          await api("/api/jobs", {
            method: "PATCH",
            body: JSON.stringify(patch),
          }).catch(() => null);
        }
      }
      saveAliases();
    };

    const initialize = async () => {
      const startingDrivers = getLocalDrivers();
      const startingJobs = getLocalJobs();

      remoteDrivers = await fetchRemoteDrivers();
      if (!isDriver && remoteDrivers.length === 0 && startingDrivers.length > 0) {
        await migrateDrivers(startingDrivers);
        remoteDrivers = await fetchRemoteDrivers();
      }
      writeRemoteDrivers(remoteDrivers);

      remoteJobs = await fetchRemoteJobs();
      if (!isDriver && remoteJobs.length === 0 && startingJobs.length > 0) {
        await migrateJobs(startingJobs);
        remoteJobs = await fetchRemoteJobs();
      }
      writeRemoteJobs(remoteJobs);
      initialized = true;
    };

    const sync = async () => {
      if (busy) return;
      busy = true;
      try {
        if (!initialized) {
          await initialize();
        } else {
          await pushDriverChanges();
          remoteDrivers = await fetchRemoteDrivers();
          writeRemoteDrivers(remoteDrivers);

          await pushJobChanges();
          remoteJobs = await fetchRemoteJobs();
          writeRemoteJobs(remoteJobs);
        }
      } catch {
        // The tenant-isolated local fallback remains available while offline.
      } finally {
        busy = false;
      }
    };

    window.setTimeout(sync, 750);
    window.setInterval(sync, 3000);
    window.addEventListener("online", sync);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") sync();
    });
  } catch {
    // The sync layer is additive and must never stop DispatchOS from rendering.
  }
})();
`;

export function TenantOperationsSyncV2() {
  const apiBase = (process.env.NEXT_PUBLIC_DISPATCHOS_API_URL || "").replace(/\/$/, "");
  if (!apiBase) return null;

  return (
    <script
      id="dispatchos-tenant-operations-sync"
      dangerouslySetInnerHTML={{ __html: buildTenantOperationsSyncScript(apiBase) }}
    />
  );
}
