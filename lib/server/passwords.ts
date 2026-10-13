import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// scrypt hashes for passwords chosen at registration — the plain password is never stored.
const N = 16384;
const r = 8;
const p = 1;
const keyLength = 64;

export type StoredPassword = { passwordHash: string; salt: string };

const derive = (password: string, salt: Buffer) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, keyLength, { N, r, p, maxmem: 64 * 1024 * 1024 } satisfies ScryptOptions, (err, key) => (err ? reject(err) : resolve(key))),
  );

export async function hashPassword(password: string): Promise<StoredPassword> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt);
  return { passwordHash: hash.toString("base64"), salt: salt.toString("base64") };
}

export async function verifyPassword(password: string, stored: StoredPassword) {
  const expected = Buffer.from(stored.passwordHash, "base64");
  const actual = await derive(password, Buffer.from(stored.salt, "base64"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
