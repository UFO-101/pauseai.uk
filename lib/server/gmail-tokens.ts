import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Gmail refresh tokens, encrypted with GMAIL_TOKEN_KEY before they're
// stored, so a copy of the database, such as a backup, can't read anyone's
// mail. AES-256-GCM: a fresh IV each time, and the tag proves the token is
// the one stored.

const IV_BYTES = 12;
const TAG_BYTES = 16;

/** GMAIL_TOKEN_KEY: 32 random bytes, in base64. */
function key(): Buffer {
  const value = Buffer.from(process.env.GMAIL_TOKEN_KEY ?? "", "base64");
  if (value.length !== 32) throw new Error("GMAIL_TOKEN_KEY must be 32 bytes, in base64");
  return value;
}

/** A refresh token, encrypted: its IV, the ciphertext, then the tag. */
export function encryptToken(token: string): Buffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const sealed = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return Buffer.concat([iv, sealed, cipher.getAuthTag()]);
}

/** A refresh token encrypted by encryptToken(). Throws if it was changed, or the key is another. */
export function decryptToken(stored: Buffer): string {
  const decipher = createDecipheriv("aes-256-gcm", key(), stored.subarray(0, IV_BYTES));
  decipher.setAuthTag(stored.subarray(stored.length - TAG_BYTES));
  return Buffer.concat([
    decipher.update(stored.subarray(IV_BYTES, stored.length - TAG_BYTES)),
    decipher.final(),
  ]).toString("utf8");
}
