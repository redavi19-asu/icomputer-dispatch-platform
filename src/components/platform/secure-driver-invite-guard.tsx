"use client";

import { useEffect } from "react";

const basePath = () => (process.env.NODE_ENV === "production" ? "/icomputer-dispatch-platform" : "");

export function SecureDriverInviteGuard() {
  useEffect(() => {
    const normalizedPath = window.location.pathname.replace(/^\/icomputer-dispatch-platform/, "");
    if (normalizedPath !== "/workspace/drivers") return;

    const onClickCapture = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button");
      if (!button) return;

      const label = (button.textContent || "").replace(/\s+/g, " ").trim();
      const legacyInviteAction =
        label.includes("Send Driver Invite") ||
        label.includes("Resend Invite") ||
        label.includes("Copy Driver Link");

      if (!legacyInviteAction) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      window.location.href = `${basePath()}/workspace/driver-invite`;
    };

    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, []);

  return null;
}
