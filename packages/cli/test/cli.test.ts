import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const cliPath = new URL("../dist/index.js", import.meta.url);

function runCli(args: string[], input?: string): { stdout: string; stderr: string; status: number } {
  const result = spawnSync("node", [cliPath.pathname, ...args], {
    input,
    encoding: "utf8"
  });

  return {
    stdout: result.stdout,
    stderr: result.stderr,
    status: result.status ?? 1
  };
}

describe("mmdv cli", () => {
  it("encodes stdin to share url on stdout", () => {
    const result = runCli(["url", "encode"], "flowchart TD\nA-->B");

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toMatch(/^#\S+/);
  });

  it("decodes share url from --url to stdout", () => {
    const encoded = runCli(["url", "encode"], "flowchart TD\nA-->B");
    const decoded = runCli(["url", "decode", "--url", encoded.stdout.trim()]);

    expect(decoded.status).toBe(0);
    expect(decoded.stdout).toContain("flowchart TD");
    expect(decoded.stdout).toContain("A-->B");
  });

  it("emits v2 json result to stderr", () => {
    const result = runCli(["url", "encode", "--json"], "flowchart TD\nA-->B");

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toMatch(/^#\S+/);

    const parsed = JSON.parse(result.stderr);
    expect(parsed.schemaVersion).toBe("2.0");
    expect(parsed.command).toBe("url.encode");
    expect(parsed.ok).toBe(true);
  });

  it("rejects png stdout output", () => {
    const result = runCli(["render", "--format", "png"], "flowchart TD\nA-->B");

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("PNG output requires --out <path>");
  });

  it("rejects removed legacy flags", () => {
    const result = runCli(["url", "encode", "--input", "diagram.mmd"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("unknown option '--input'");
  });
});
