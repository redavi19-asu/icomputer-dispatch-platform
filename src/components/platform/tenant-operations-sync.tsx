const buildTenantOperationsSyncScript = (apiBase: string) => `
(() => {
  try {
    const API_BASE = ${JSON.stringify("__API_BASE__")}.replace("__API_BASE__", ${JSON.stringify(apiBase)});
    if (!API_BASE) return;

    const normalizedPath = window.location.pathname.replace(/^\\/icomputer-dispatch-platform/, "");
    if (!/^\\/(workspace|dashboard|driver|download)(\\/|$)/.test(normalizedPath)) return;

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

    const session = readJson(SESSION_KEY, null);
    const token = session && session.token;
    const company = session && session.company;
    const userRole = session && session.user && session.user.role;
    if (!token || !company || !company.slug) return;

    const tenantSlug = company.slug;
    const driverStorageKey = DRIVER_KEY_PREFIX + tenantSlug;
    const driverAliasKey = DRIVER_ALIAS_PREFIX + tenantSlug;
    const jobAliasKey = JOB_ALIAS_PREFIX + tenantSlug;
    const isDriverRole = userRole === "driver";

    let driverAliases = readJson(driverAliasKey, {});
    let jobAliases = readJson(jobAliasKey, {});
    let knownRemoteDrivers = [];
    let knownRemoteJobs = [];
    let initialized = false;
    let busy = false;

    const saveAliases = () => {
      window.localStorage.setItem(driverAliasKey, JSON.stringify(driverAliases));
      window.localStorage.setItem(jobAliasKey, JSON.stringify(jobAliases));
    };

    const asArray = (value) => Array.isArray(value) ? value : [];
    const localDrivers = () => asArray(readJson(driverStorageKey, []));
    const localJobs = () => asArray(readJson(JOBS_KEY, []));

    const normalizeDriverId = (id) => {
      if (!id || typeof id !== "string") return id || null;
      return driverAliases[id] || id;
    };

    const normalizeJobId = (id) => {
      if (!id || typeof id !== "string") return id || null;
      return jobAliases[id] || id;
    };

    const normalizeLocalDrivers = (drivers) =>
      asArray(drivers).map((driver) => ({
        ...driver,
        id: normalizeDriverId(driver && driver.id),
      }));

    const normalizeLocalJobs = (jobs) =>
      asArray(jobs).map((job) => ({
        ...job,
        id: normalizeJobId(job && job.id),
        driverId: normalizeDriverId(job && job.driverId),
        companySlug: tenantSlug,
      }));

    const api = async (path, init = {}) => {
      const headers = new Headers(init.headers || {});
      headers.set("Authorization", "Bearer " + token);
      if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
      const response = await window.fetch(API_BASE.replace(/\\/$/, "") + path, {
        ...init,
        headers,
        cache: "no-store",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data && data.error ? data.error : "DispatchOS sync request failed");
      }
      return response.json().catch(() => ({}));
    };

    const driverStatusForApi = (driver) => {
      if (!driver || driver.accountStatus === "disabled") return "offline";
      const state = String(driver.liveWorkStatus || driver.status || "available");
      if (state === "on-route") return "en-route";
      if (["assigned", "at-pickup", "at-stop", "busy"].includes(state)) return "busy";
      if (state === "offline") return "offline";
      return "available";
    };

    const driverForStorage = (driver, existingById) => {
      const status = String(driver.status || "available");
      const existing = existingById && existingById.get(driver.id);
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
    };

    const applyRemoteDrivers = (drivers) => {
      const current = normalizeLocalDrivers(localDrivers());
      const existingById = new Map(current.map((driver) => [driver.id, driver]));
      const next = asArray(drivers).map((driver) => driverForStorage(driver, existingById));
      window.localStorage.setItem(driverStorageKey, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(DRIVER_UPDATED_EVENT, { detail: { companySlug: tenantSlug } }));
    };

    const applyRemoteJobs = (jobs) => {
      window.localStorage.setItem(JOBS_KEY, JSON.stringify(normalizeLocalJobs(jobs)));
    };

    const pullDrivers = async () => {
      const data = await api("/api/drivers");
      knownRemoteDrivers = asArray(data.drivers);
      applyRemoteDrivers(knownRemoteDrivers);
      return knownRemoteDrivers;
    };

    const pullJobs = async () => {
      const data = await api("/api/jobs");
      knownRemoteJobs = asArray(data.jobs);
      applyRemoteJobs(knownRemoteJobs);
      return knownRemoteJobs;
    };

    const migrateDriversIfNeeded = async () => {
      if (isDriverRole || knownRemoteDrivers.length > 0) return;
      const source = localDrivers();
      if (!source.length) return;

      for (const driver of source) {
        if (!driver || !driver.id || !driver.name) continue;
        try {
          const data = await api("/api/drivers", {
            method: "POST",
            body: JSON.stringify({
              name: driver.name,
              phone: driver.phone || "",
              status: driverStatusForApi(driver),
            }),
          });
          if (data.driver && data.driver.id) driverAliases[driver.id] = data.driver.id;
        } catch {
          // Keep the tenant-local driver if the backend cannot migrate this record yet.
        }
      }
      saveAliases();
      await pullDrivers();
    };

    const migrateJobsIfNeeded = async () => {
      if (isDriverRole || knownRemoteJobs.length > 0) return;
      const source = normalizeLocalJobs(localJobs());
      if (!source.length) return;

      for (const job of source) {
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
              driverId: normalizeDriverId(job.driverId),
            }),
          });
          if (data.job && data.job.id) {
            jobAliases[job.id] = data.job.id;
            if (job.status && job.status !== data.job.status) {
              await api("/api/jobs", {
                method: "PATCH",
                body: JSON.stringify({
                  id: data.job.id,
                  status: job.status,
                  driverId: normalizeDriverId(job.driverId),
                  etaMinutes: job.etaMinutes ?? null,
                }),
              });
            }
          }
        } catch {
          // Preserve isolated local data and retry on a later sync cycle.
        }
      }
      saveAliases();
      await pullJobs();
    };

    const pushDriverChanges = async () => {
      if (isDriverRole) return;
      const local = normalizeLocalDrivers(localDrivers());
      const remoteById = new Map(knownRemoteDrivers.map((driver) => [driver.id, driver]));

      for (const driver of local) {
        if (!driver || !driver.id || !driver.name) continue;
        const remote = remoteById.get(driver.id);
        if (!remote) {
          try {
            const data = await api("/api/drivers", {
              method: "POST",
              body: JSON.stringify({
                name: driver.name,
                phone: driver.phone || "",
                status: driverStatusForApi(driver),
              }),
            });
            if (data.driver && data.driver.id) {
              const original = Object.keys(driverAliases).find((key) => driverAliases[key] === driver.id) || driver.id;
              driverAliases[original] = data.driver.id;
            }
          } catch {
            // Retry next cycle.
          }
          continue;
        }

        const nextStatus = driverStatusForApi(driver);
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
      const local = normalizeLocalJobs(localJobs());
      const remoteById = new Map(knownRemoteJobs.map((job) => [job.id, job]));
      const localIds = new Set(local.map((job) => job && job.id).filter(Boolean));

      if (!isDriverRole) {
        for (const remote of knownRemoteJobs) {
          if (remote && remote.id && !localIds.has(remote.id)) {
            await api("/api/jobs?id=" + encodeURIComponent(remote.id), { method: "DELETE" }).catch(() => null);
          }
        }
      }

      for (const job of local) {
        if (!job || !job.id) continue;
        const remote = remoteById.get(job.id);

        if (!remote) {
          if (isDriverRole) continue;
          try {
            const data = await api("/api/jobs", {
              method: "POST",
              body: JSON.stringify({
                name: job.name || "Customer",
                phone: job.phone || "",
                service: job.service || "",
                address: job.address || "",
                details: job.details || "",
                driverId: normalizeDriverId(job.driverId),
              }),
            });
            if (data.job && data.job.id) {
              jobAliases[job.id] = data.job.id;
              if (job.status && job.status !== data.job.status) {
                await api("/api/jobs", {
                  method: "PATCH",
                  body: JSON.stringify({
                    id: data.job.id,
                    status: job.status,
                    driverId: normalizeDriverId(job.driverId),
                    etaMinutes: job.etaMinutes ?? null,
                  }),
                }).catch(() => null);
              }
            }
          } catch {
            // Retry next cycle.
          }
          continue;
        }

        const patch = { id: job.id };
        let changed = false;
        if (job.status && job.status !== remote.status) { patch.status = job.status; changed = true; }
        if (!isDriverRole && normalizeDriverId(job.driverId) !== (remote.driverId || null)) {
          patch.driverId = normalizeDriverId(job.driverId);
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
      try {
        await pullDrivers();
        await migrateDriversIfNeeded();
        await pullJobs();
        await migrateJobsIfNeeded();
        initialized = true;
      } catch {
        // The existing tenant-isolated local fallback remains usable while offline.
      }
    };

    const sync = async () => {
      if (busy) return;
      busy = true;
      try {
        if (!initialized) {
          await initialize();
          return;
        }
        await pushDriverChanges();
        await pullDrivers();
        await pushJobChanges();
        await pullJobs();
      } catch {
        // Fail closed to the already isolated browser store and retry later.
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
    // The sync layer is additive. It must never stop DispatchOS from rendering.
  }
})();
`;

export function TenantOperationsSync() {
  const apiBase = (process.env.NEXT_PUBLIC_DISPATCHOS_API_URL || "").replace(/\/$/, "");
  if (!apiBase) return null;

  return (
    <script
      id="dispatchos-tenant-operations-sync"
      dangerouslySetInnerHTML={{ __html: buildTenantOperationsSyncScript(apiBase) }}
    />
  );
}
