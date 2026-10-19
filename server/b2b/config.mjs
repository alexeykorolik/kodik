import { isAbsolute } from "node:path";
import { isIP } from "node:net";
/**
 * Addresses of reverse proxies whose X-Forwarded-For may be trusted. Without it every school
 * behind the proxy shares one address and one login budget. "none" means: never trust the header.
 */
export function parseTrustedProxies(value) {
  if (value === undefined || value === "" || value === "none") return [];
  const list = String(value).split(",").map((s) => s.trim()).filter(Boolean);
  if (!list.length || list.some((ip) => !isIP(ip)))
    throw new Error("KODIK_TRUSTED_PROXIES must be a comma-separated list of proxy IP addresses, or none.");
  return list;
}
export function readServerConfig(env = process.env) {
  const port = Number(env.PORT || 4173);
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    throw new Error("PORT must be between 0 and 65535.");
  if (env.NODE_ENV === "production") {
    if (!env.KODIK_ORIGIN)
      throw new Error("Production requires KODIK_ORIGIN with an HTTPS origin.");
    const origin = new URL(env.KODIK_ORIGIN);
    if (
      origin.protocol !== "https:" ||
      origin.origin !== env.KODIK_ORIGIN ||
      origin.username ||
      origin.password
    )
      throw new Error(
        "KODIK_ORIGIN must be an exact HTTPS origin without path or credentials.",
      );
    if (!env.KODIK_DB || !isAbsolute(env.KODIK_DB))
      throw new Error(
        "Production requires an absolute KODIK_DB path on persistent storage.",
      );
    if (env.KODIK_TRUSTED_PROXIES === undefined)
      throw new Error(
        "Production requires KODIK_TRUSTED_PROXIES: the reverse proxy address (for example 127.0.0.1), or none.",
      );
  }
  return { port, host: env.HOST || "127.0.0.1", trustedProxies: parseTrustedProxies(env.KODIK_TRUSTED_PROXIES) };
}
