import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { failApp } from './errors.ts';

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const MAX_PASSWORD_CHARS = 200;
const MIN_PASSWORD_CHARS = 8;

function deriveScrypt(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(
      password,
      salt,
      SCRYPT_KEYLEN,
      { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 32 * 1024 * 1024 },
      (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      },
    );
  });
}

export async function hashPassword(plain: unknown): Promise<string> {
  if (typeof plain !== 'string' || plain.length < MIN_PASSWORD_CHARS || plain.length > MAX_PASSWORD_CHARS) {
    failApp('INVALID_INPUT', 400, 'Password must be between 8 and 200 characters');
  }
  if (/^\s|\s$/.test(plain)) {
    failApp('INVALID_INPUT', 400, 'Password must not start or end with whitespace');
  }
  const salt = randomBytes(16);
  const derived = await deriveScrypt(plain, salt);
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

const DUMMY_SALT = Buffer.alloc(16, 0x5a);
const DUMMY_DERIVED_PROMISE = deriveScrypt('synthetic-dummy-password-for-timing', DUMMY_SALT);

/**
 * Constant-time verification with bounded input length and dummy hash fallback
 * when an account does not exist so timing does not enumerate usernames.
 */
export async function verifyPassword(plain: unknown, storedHash: string | null | undefined): Promise<boolean> {
  if (typeof plain !== 'string' || plain.length === 0 || plain.length > MAX_PASSWORD_CHARS) {
    await DUMMY_DERIVED_PROMISE;
    return false;
  }
  if (!storedHash) {
    const dummy = await DUMMY_DERIVED_PROMISE;
    const candidate = await deriveScrypt(plain, DUMMY_SALT);
    timingSafeEqual(dummy, candidate);
    return false;
  }
  const parts = storedHash.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return false;
  }
  const saltHex = parts[4];
  const hashHex = parts[5];
  if (saltHex === undefined || hashHex === undefined) {
    return false;
  }
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  if (salt.length !== 16 || expected.length !== SCRYPT_KEYLEN) {
    return false;
  }
  const actual = await deriveScrypt(plain, salt);
  return timingSafeEqual(actual, expected);
}

export function generateOpaqueToken(byteLength = 32): { rawToken: string; tokenSha256: string } {
  const rawToken = randomBytes(byteLength).toString('base64url');
  return { rawToken, tokenSha256: sha256Hex(rawToken) };
}

export function sha256Hex(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex');
}

export function constantTimeStringEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a, 'utf8').digest();
  const hb = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(ha, hb);
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      failApp('INVALID_INPUT', 400, 'Non-finite number in JSON payload');
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    const items: string[] = [];
    for (let i = 0; i < value.length; i++) {
      if (!Object.hasOwn(value, i)) {
        failApp('INVALID_INPUT', 400, 'Sparse array forbidden');
      }
      items.push(canonicalJson(value[i]));
    }
    return `[${items.join(',')}]`;
  }
  if (typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      failApp('INVALID_INPUT', 400, 'Non-plain object forbidden');
    }
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    const pairs: string[] = [];
    for (const k of keys) {
      const v = record[k];
      if (v !== undefined) {
        pairs.push(`${JSON.stringify(k)}:${canonicalJson(v)}`);
      }
    }
    return `{${pairs.join(',')}}`;
  }
  failApp('INVALID_INPUT', 400, 'Unsupported payload value');
}

export function newEntityId(prefix: string): string {
  return `${prefix}-${randomBytes(8).toString('hex')}`;
}
