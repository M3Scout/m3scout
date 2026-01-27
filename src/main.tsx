import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Emergency: ensure NO Service Worker remains controlling this origin.
// This only unregisters old SWs (e.g., Workbox) and clears their caches.
// It does NOT register any new SW.
if ("serviceWorker" in navigator) {
  void navigator.serviceWorker
    .getRegistrations()
    .then((regs) => Promise.all(regs.map((r) => r.unregister())))
    .catch(() => {});
}

if ("caches" in window) {
  void caches
    .keys()
    .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    .catch(() => {});
}

// Performance timing - app mount
if (import.meta.env.DEV) {
  (window as any).__APP_MOUNT_START = performance.now();
  console.log("[TIMING] App mount start");
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);