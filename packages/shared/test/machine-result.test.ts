import { describe, expect, it } from "vitest";
import { createErrorResult, createOkResult, machineResultSchema } from "../src/machine-result.js";

describe("machine result schema v2", () => {
  it("accepts render success payload", () => {
    const result = createOkResult("render", {
      format: "svg",
      output: { kind: "stdout" },
      bytes: 42,
      sha256: "abc"
    });

    const parsed = machineResultSchema.parse(result);
    expect(parsed.schemaVersion).toBe("2.0");
  });

  it("accepts structured error payload", () => {
    const result = createErrorResult("url.decode", "E_DECODE_FAILED", "bad payload");
    const parsed = machineResultSchema.parse(result);

    expect(parsed.ok).toBe(false);
    expect(parsed.error?.code).toBe("E_DECODE_FAILED");
  });
});
