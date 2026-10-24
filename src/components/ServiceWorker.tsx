"use client";

import { useEffect } from "react";

/** Registers public/sw.js in production builds. In `next dev` it stays off so
 * cached pages never hide code changes; a worker left from a build is removed. */
export default function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
      return;
    }
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((e: unknown) => {
      console.error("service worker registration failed", e);
    });
  }, []);
  return null;
}
