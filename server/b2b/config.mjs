import { isAbsolute } from "node:path";
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
  }
  return { port, host: env.HOST || "127.0.0.1" };
}
