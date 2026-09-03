"use client";

import { useEffect } from "react";
import { getStoredSession } from "@/lib/dispatchos-auth";

const basePath = () =>
  process.env.NODE_ENV === "production" ? "/icomputer-dispatch-platform" : "";

const operationalPath = (pathname: string) =>
  /^\/(workspace|dashboard|driver|download|billing)(\/|$)/.test(
    pathname.replace(/^\/icomputer-dispatch-platform/, "")
  );

export function OperationalTenantGuard() {
  useEffect(() => {
    const normalized = window.location.pathname.replace(
      /^\/icomputer-dispatch-platform/,
      ""
    );

    if (!operationalPath(normalized)) return;

    const session = getStoredSession();
    if (!session?.token || !session.company?.id || !session.company?.slug) {
      const next = encodeURIComponent(
        window.location.pathname + window.location.search
      );
      window.location.replace(`${basePath()}/auth?mode=login&next=${next}`);
      return;
    }

    const slug = session.company.slug.trim();
    document.documentElement.dataset.dispatchCompanyId = session.company.id;
    document.documentElement.dataset.dispatchCompanySlug = slug;
    document.documentElement.dataset.dispatchUserRole = session.user.role || "";

    const url = new URL(window.location.href);
    const requestedCompany = url.searchParams.get("company");

    if (requestedCompany && requestedCompany !== slug) {
      url.searchParams.set("company", slug);
      window.history.replaceState(
        window.history.state,
        "",
        `${url.pathname}${url.search}${url.hash}`
      );
    }

    const onStorage = () => {
      const current = getStoredSession();
      if (!current?.token || !current.company?.slug) {
        const next = encodeURIComponent(
          window.location.pathname + window.location.search
        );
        window.location.replace(`${basePath()}/auth?mode=login&next=${next}`);
        return;
      }

      if (current.company.slug !== slug) {
        // A different company signed in on this browser tab/device. Reload the
        // operational surface so every company-scoped store reinitializes under
        // the new authenticated tenant instead of retaining previous React state.
        window.location.reload();
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return null;
}
