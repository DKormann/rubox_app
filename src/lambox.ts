// Rust equivalence:
// hash_string(s) = u256::from_be_bytes(SHA256(s))
// hash_app(setup, functions) = u256::from_be_bytes(SHA256(setup || concat(functions as 32-byte BE)))

import { AppData } from "./module_bindings";

const textEncoder = new TextEncoder();

function toU256FromBytes(bytes: Uint8Array): bigint {
  let result = 0n;
  for (let i = 0; i < bytes.length; i++) {
    result = (result << 8n) + BigInt(bytes[i]);
  }
  return result;
}

function u256ToBeBytes(value: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let v = value;
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, a) => sum + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

export async function hashString(s: string): Promise<bigint> {
  const data = textEncoder.encode(s);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return toU256FromBytes(digest);
}

// export type Ap = {
//   setup: string;
//   lambdas: string[];
// };

export type HashedApp = {
  hash: bigint;
  lambdas: bigint[];
};

export async function hashApp(app: AppData): Promise<HashedApp> {
  const lambdaHashes = await Promise.all(app.functions.map(hashString));
  const setupBytes = textEncoder.encode(app.setup);
  const functionBytes = lambdaHashes.map(u256ToBeBytes);
  const allBytes = concatBytes([setupBytes, ...functionBytes]);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", allBytes));
  const hash = toU256FromBytes(digest);
  return { hash, lambdas: lambdaHashes };
}

