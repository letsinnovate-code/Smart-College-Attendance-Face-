// src/utils/crypto.js
// Cryptographic helpers for biometric template encryption and token generation.
// Uses AES-256-GCM for authenticated encryption of face embeddings.

import crypto from "crypto";
import env from "../config/env.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV for GCM
const TAG_LENGTH = 16; // 128-bit authentication tag

/**
 * Derive the 32-byte encryption key from the hex-encoded env variable.
 * Falls back to a development key in non-production (NOT secure — dev only).
 */
function getEncryptionKey() {
  if (env.BIOMETRIC_ENCRYPTION_KEY) {
    return Buffer.from(env.BIOMETRIC_ENCRYPTION_KEY, "hex");
  }
  if (env.NODE_ENV !== "production") {
    // Deterministic dev key: SHA-256 of a constant string
    // This is deliberately weak and is never used in production.
    return crypto
      .createHash("sha256")
      .update("dev-only-biometric-key")
      .digest();
  }
  throw new Error("BIOMETRIC_ENCRYPTION_KEY must be set in production");
}

/**
 * Encrypt a face embedding array.
 * Returns a base64-encoded string containing IV + ciphertext + auth tag.
 * @param {number[]} embedding
 * @returns {string} Base64-encoded encrypted blob
 */
export function encryptEmbedding(embedding) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });

  const json = JSON.stringify(embedding);
  const encrypted = Buffer.concat([
    cipher.update(json, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Format: iv(12) + tag(16) + ciphertext
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString("base64");
}

/**
 * Decrypt a face embedding.
 * @param {string} encryptedBase64
 * @returns {number[]} The original embedding array
 */
export function decryptEmbedding(encryptedBase64) {
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedBase64, "base64");

  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString("utf8"));
}

/**
 * Generate a cryptographically secure random token (URL-safe base64).
 * @param {number} byteLength - Number of random bytes (default 32)
 * @returns {string}
 */
export function generateSecureToken(byteLength = 32) {
  return crypto.randomBytes(byteLength).toString("base64url");
}

/**
 * Hash a token using SHA-256 for safe storage.
 * @param {string} token
 * @returns {string} hex-encoded hash
 */
export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function safeCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
