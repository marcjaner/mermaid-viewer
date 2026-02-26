import { describe, expect, it } from "vitest";
import {
  decodeHashPayload,
  decodeHashPayloadOrUrlEncoded,
  encodeHashPayload,
  extractPayloadFromUrl
} from "../src/codec.js";

describe("codec", () => {
  it("round-trips compressed hash payload", () => {
    const source = "sequenceDiagram\\nAlice->>Bob: hello";
    const encoded = encodeHashPayload(source);
    expect(decodeHashPayload(encoded)).toBe(source);
  });

  it("decodes url-encoded fallback payload", () => {
    const source = "flowchart TD\\nA-->B";
    const encoded = encodeURIComponent(source);
    expect(decodeHashPayloadOrUrlEncoded(encoded)).toBe(source);
  });

  it("extracts hash payload from url", () => {
    const payload = "abc123";
    expect(extractPayloadFromUrl(`http://localhost:4173/#${payload}`)).toBe(payload);
  });
});
