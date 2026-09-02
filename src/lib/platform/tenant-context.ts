import { getStoredSession } from "@/lib/dispatchos-auth";

export const LEGACY_DEMO_TENANT_SLUG = "build-electric";

type TenantIdentity = {
  id: string;
  name: string;
  slug: string;
};

export function getAuthenticatedTenant(): TenantIdentity | null {
  const session = getStoredSession();
  if (!session?.company?.id || !session.company.slug) return null;

  return {
    id: session.company.id,
    name: session.company.name,
    slug: session.company.slug,
  };
}

function isAuthenticatedOperationalSurface() {
  if (typeof window === "undefined") return false;

  const pathname = window.location.pathname.replace(
    /^\/icomputer-dispatch-platform/,
    ""
  );

  return /^\/(workspace|dashboard|driver|download|billing)(\/|$)/.test(pathname);
}

/**
 * Older demo-era operational pages still pass "build-electric" in a few places.
 * On authenticated company surfaces, treat that legacy slug as an alias for the
 * company in the signed-in DispatchOS session. Explicit public company routes
 * (for example /acme/booking) keep their own slug.
 */
export function resolveTenantSlug(requestedSlug?: string | null) {
  const requested = (requestedSlug || "").trim();
  const tenant = getAuthenticatedTenant();

  if (!tenant) {
    return requested || LEGACY_DEMO_TENANT_SLUG;
  }

  if (!requested || requested === "company") {
    return tenant.slug;
  }

  if (
    requested === LEGACY_DEMO_TENANT_SLUG &&
    isAuthenticatedOperationalSurface()
  ) {
    return tenant.slug;
  }

  return requested;
}

export function isAuthenticatedTenant(companyId?: string | null, companySlug?: string | null) {
  const tenant = getAuthenticatedTenant();
  if (!tenant) return false;

  if (companyId && companyId !== tenant.id) return false;
  if (companySlug && resolveTenantSlug(companySlug) !== tenant.slug) return false;
  return true;
}
