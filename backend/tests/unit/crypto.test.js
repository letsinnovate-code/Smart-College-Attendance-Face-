import { describe, it, expect } from "vitest";
import {
  generateSecureToken,
  hashToken,
  safeCompare,
  encryptEmbedding,
  decryptEmbedding,
} from "../../src/utils/crypto.js";

describe("Crypto Utilities", () => {
  it("generates secure random URL-safe tokens of expected length", () => {
    const token1 = generateSecureToken(32);
    const token2 = generateSecureToken(32);

    expect(token1).toBeDefined();
    expect(typeof token1).toBe("string");
    expect(token1).not.toBe(token2);
    expect(token1.length).toBeGreaterThanOrEqual(32);
  });

  it("generates consistent SHA-256 hex hashes", () => {
    const raw = "test-token-12345";
    const hash1 = hashToken(raw);
    const hash2 = hashToken(raw);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("performs timing-safe string comparison correctly", () => {
    expect(safeCompare("secret123", "secret123")).toBe(true);
    expect(safeCompare("secret123", "secret124")).toBe(false);
    expect(safeCompare("secret123", "short")).toBe(false);
    expect(safeCompare(null, "secret")).toBe(false);
  });

  it("encrypts and decrypts 512-dimensional biometric embedding vectors using AES-256-GCM", () => {
    const originalVector = Array.from({ length: 512 }, (_, i) =>
      Math.sin(i + 1),
    );
    const encrypted = encryptEmbedding(originalVector);

    expect(typeof encrypted).toBe("string");
    // Ensure ciphertext is authenticated base64, not raw JSON array
    expect(encrypted.startsWith("[")).toBe(false);

    const decrypted = decryptEmbedding(encrypted);
    expect(decrypted).toHaveLength(512);
    expect(decrypted[0]).toBeCloseTo(originalVector[0], 5);
    expect(decrypted[511]).toBeCloseTo(originalVector[511], 5);
  });

  it("fails decryption if ciphertext or auth tag is tampered with", () => {
    const vector = [0.1, 0.2, 0.3];
    const encrypted = encryptEmbedding(vector);
    const buffer = Buffer.from(encrypted, "base64");
    // Tamper with the last byte
    buffer[buffer.length - 1] ^= 0xff;
    const tampered = buffer.toString("base64");

    expect(() => decryptEmbedding(tampered)).toThrow();
  });
});
