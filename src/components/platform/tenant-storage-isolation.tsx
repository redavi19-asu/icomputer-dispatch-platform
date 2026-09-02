const tenantStorageIsolationScript = String.raw`
(() => {
  try {
    const LEGACY_JOBS_KEY = "dispatch_jobs";
    const SESSION_KEY = "dispatchos_session";
    const JOB_KEY_PREFIX = "dispatch_jobs::";

    const nativeGetItem = Storage.prototype.getItem;
    const nativeSetItem = Storage.prototype.setItem;
    const nativeRemoveItem = Storage.prototype.removeItem;

    const normalizedPath = () =>
      window.location.pathname.replace(/^\/icomputer-dispatch-platform/, "");

    const readSessionCompany = () => {
      try {
        const raw = nativeGetItem.call(window.localStorage, SESSION_KEY);
        const session = raw ? JSON.parse(raw) : null;
        const company = session && session.company;
        if (!company || !company.slug) return null;
        return company;
      } catch {
        return null;
      }
    };

    const explicitCompanyFromPage = () => {
      const queryCompany = new URLSearchParams(window.location.search).get("company");
      if (queryCompany) return queryCompany;

      const match = normalizedPath().match(/^\/([^/]+)\/booking(?:\/|$)/);
      return match ? decodeURIComponent(match[1]) : "";
    };

    const currentTenantSlug = () => {
      const sessionCompany = readSessionCompany();
      const path = normalizedPath();
      const operational = /^\/(workspace|dashboard|driver|download|billing)(\/|$)/.test(path);

      if (operational && sessionCompany && sessionCompany.slug) {
        return sessionCompany.slug;
      }

      return explicitCompanyFromPage() || (sessionCompany && sessionCompany.slug) || "build-electric";
    };

    const scopedJobKey = () => JOB_KEY_PREFIX + currentTenantSlug();

    const migrateLegacyJobsForCurrentTenant = () => {
      const scopedKey = scopedJobKey();
      if (nativeGetItem.call(window.localStorage, scopedKey)) return;

      const legacyRaw = nativeGetItem.call(window.localStorage, LEGACY_JOBS_KEY);
      if (!legacyRaw) return;

      try {
        const parsed = JSON.parse(legacyRaw);
        if (!Array.isArray(parsed)) return;

        const tenantSlug = currentTenantSlug();
        const tenantJobs = parsed.filter((job) => {
          if (!job || typeof job !== "object") return false;
          const jobCompany = typeof job.companySlug === "string" ? job.companySlug : "";
          return jobCompany === tenantSlug || (!jobCompany && tenantSlug === "build-electric");
        });

        if (tenantJobs.length > 0) {
          nativeSetItem.call(window.localStorage, scopedKey, JSON.stringify(tenantJobs));
        }
      } catch {
        // Ignore malformed legacy demo data rather than sharing it across tenants.
      }
    };

    migrateLegacyJobsForCurrentTenant();

    Storage.prototype.getItem = function (key) {
      if (this === window.localStorage && key === LEGACY_JOBS_KEY) {
        return nativeGetItem.call(this, scopedJobKey());
      }
      return nativeGetItem.call(this, key);
    };

    Storage.prototype.setItem = function (key, value) {
      if (this === window.localStorage && key === LEGACY_JOBS_KEY) {
        return nativeSetItem.call(this, scopedJobKey(), value);
      }
      return nativeSetItem.call(this, key, value);
    };

    Storage.prototype.removeItem = function (key) {
      if (this === window.localStorage && key === LEGACY_JOBS_KEY) {
        return nativeRemoveItem.call(this, scopedJobKey());
      }
      return nativeRemoveItem.call(this, key);
    };
  } catch {
    // Storage restrictions should not prevent the application from rendering.
  }
})();
`;

export function TenantStorageIsolation() {
  return (
    <script
      id="dispatchos-tenant-storage-isolation"
      dangerouslySetInnerHTML={{ __html: tenantStorageIsolationScript }}
    />
  );
}
