"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register((process.env.NODE_ENV === "production" ? "/icomputer-dispatch-platform" : "") + "/sw.js").catch((error) => {
      console.warn("Urban Carrier OS service worker registration failed", error);
    });
  }, []);

  return null;
}
