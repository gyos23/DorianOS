const DEFAULT_BRIDGE_URL = "http://localhost:3131";
const DEFAULT_SUPERVISOR_URL = "http://localhost:3130";

export function getBridgeUrl() {
  if (typeof window !== "undefined") {
    const custom = window.localStorage.getItem("dorianos_bridge_url");
    if (custom) return custom;
  }
  return import.meta.env.VITE_BRIDGE_URL || DEFAULT_BRIDGE_URL;
}

export function getSupervisorUrl() {
  if (typeof window !== "undefined") {
    const custom = window.localStorage.getItem("dorianos_supervisor_url");
    if (custom) return custom;
  }
  return import.meta.env.VITE_SUPERVISOR_URL || DEFAULT_SUPERVISOR_URL;
}

export function setBridgeUrl(url) {
  if (typeof window !== "undefined") {
    if (!url || url === DEFAULT_BRIDGE_URL) {
      window.localStorage.removeItem("dorianos_bridge_url");
    } else {
      window.localStorage.setItem("dorianos_bridge_url", url);
    }
  }
}
