import { companies, customers, drivers, jobs, bookingPageConfigs } from "./mock-data";
import type { Company, Driver } from "./types";
import {
  getAuthenticatedTenant,
  resolveTenantSlug,
} from "./tenant-context";

const WORKSPACE_DRIVERS_KEY_PREFIX = "dispatch.workspace.drivers.";

function sessionCompany(): Company | null {
  const tenant = getAuthenticatedTenant();
  if (!tenant) return null;

  const template =
    companies.find((company) => company.slug === "build-electric") ?? companies[0];

  return {
    ...(template ?? {
      plan: "starter" as const,
      driverAcceptanceMode: "manual" as const,
    }),
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
  };
}

function workspaceDriversForAuthenticatedCompany(companyId: string): Driver[] {
  if (typeof window === "undefined") return [];

  const tenant = getAuthenticatedTenant();
  if (!tenant || tenant.id !== companyId) return [];

  try {
    const raw = window.localStorage.getItem(
      `${WORKSPACE_DRIVERS_KEY_PREFIX}${tenant.slug}`
    );
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
      .map((item, index) => {
        const liveStatus = String(item.liveWorkStatus || item.status || "available");
        const accountStatus = String(item.accountStatus || "enabled");
        const status: Driver["status"] =
          accountStatus === "disabled" || liveStatus === "offline"
            ? "offline"
            : liveStatus === "on-route" || liveStatus === "en-route"
            ? "en-route"
            : ["assigned", "at-pickup", "at-stop", "busy"].includes(liveStatus)
            ? "busy"
            : "available";

        return {
          id:
            typeof item.id === "string" && item.id
              ? item.id
              : `tenant-driver-${index + 1}`,
          companyId: tenant.id,
          name:
            typeof item.name === "string" && item.name
              ? item.name
              : "Unnamed Driver",
          phone: typeof item.phone === "string" ? item.phone : "",
          status,
          zone: typeof item.zone === "string" ? item.zone : "Unassigned",
        };
      });
  } catch {
    return [];
  }
}

export function getCompanyBySlug(slug: string) {
  const resolvedSlug = resolveTenantSlug(slug);
  const tenantCompany = sessionCompany();

  if (tenantCompany?.slug === resolvedSlug) {
    return tenantCompany;
  }

  return companies.find((company) => company.slug === resolvedSlug) ?? null;
}

export function getCompanyById(companyId: string) {
  const tenantCompany = sessionCompany();
  if (tenantCompany?.id === companyId) return tenantCompany;
  return companies.find((company) => company.id === companyId) ?? null;
}

export function getDriversByCompany(companyId: string) {
  const tenantDrivers = workspaceDriversForAuthenticatedCompany(companyId);
  if (tenantDrivers.length > 0) return tenantDrivers;

  const tenant = getAuthenticatedTenant();
  if (tenant?.id === companyId) return [];

  return drivers.filter((driver) => driver.companyId === companyId);
}

export function getJobsByCompany(companyId: string) {
  const tenant = getAuthenticatedTenant();
  if (tenant?.id === companyId) {
    return jobs.filter((job) => job.companyId === companyId);
  }
  return jobs.filter((job) => job.companyId === companyId);
}

export function getCustomersByCompany(companyId: string) {
  return customers.filter((customer) => customer.companyId === companyId);
}

export function getBookingPageConfigByCompany(companyId: string) {
  return bookingPageConfigs.find((config) => config.companyId === companyId) ?? null;
}
