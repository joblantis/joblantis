import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** Egyszer használatos, emailben kiküldött link-token (256 bit). Az adatbázisba csak a hash-e kerül. */
export function newToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
