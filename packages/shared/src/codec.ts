import { deflate, inflate } from "pako";

const URL_SAFE_PLUS = /\+/g;
const URL_SAFE_SLASH = /\//g;
const URL_SAFE_EQUAL = /=+$/;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function toBase64Url(value: string): string {
  return value.replace(URL_SAFE_PLUS, "-").replace(URL_SAFE_SLASH, "_").replace(URL_SAFE_EQUAL, "");
}

function fromBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  if (padding === 0) {
    return normalized;
  }
  return normalized + "=".repeat(4 - padding);
}

export function encodeHashPayload(text: string): string {
  const compressed = deflate(text);
  return toBase64Url(toBase64(compressed));
}

export function decodeHashPayload(payload: string): string {
  const decoded = fromBase64Url(payload.trim());
  const inflated = inflate(fromBase64(decoded), { to: "string" });
  return inflated;
}

export function decodeHashPayloadOrUrlEncoded(payload: string): string {
  try {
    return decodeHashPayload(payload);
  } catch {
    return decodeURIComponent(payload);
  }
}

export function extractPayloadFromUrl(value: string): string {
  if (!value.includes("#")) {
    return value;
  }
  const hash = value.split("#")[1];
  return hash ?? "";
}

export function encodeStyleProfileToQuery(profile: unknown): string {
  const json = JSON.stringify(profile);
  const bytes = new TextEncoder().encode(json);
  return toBase64Url(toBase64(bytes));
}

export function decodeStyleProfileFromQuery(value: string): unknown {
  const normalized = fromBase64Url(value);
  const bytes = fromBase64(normalized);
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json);
}
