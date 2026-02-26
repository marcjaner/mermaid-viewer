import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export type OutputTarget =
  | { kind: "stdout" }
  | { kind: "file"; path: string };

export type WriteResult = {
  output: OutputTarget;
  bytes: number;
};

export async function readTextInput(inputPath?: string): Promise<string> {
  if (inputPath) {
    return readFile(inputPath, "utf8");
  }

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  const value = Buffer.concat(chunks).toString("utf8");
  if (value.trim().length > 0) {
    return value;
  }

  if (process.stdin.isTTY) {
    throw new Error("No Mermaid input found on stdin. Pipe content or pass --input.");
  }

  return value;
}

export async function writeTextOutput(value: string, outputPath?: string): Promise<WriteResult> {
  const bytes = Buffer.byteLength(value, "utf8");
  if (outputPath && outputPath !== "-") {
    const resolvedPath = resolve(outputPath);
    await mkdir(dirname(resolvedPath), { recursive: true });
    await writeFile(resolvedPath, value, "utf8");
    return {
      output: { kind: "file", path: resolvedPath },
      bytes
    };
  }

  process.stdout.write(value);
  return {
    output: { kind: "stdout" },
    bytes
  };
}

export async function writeBinaryOutput(bytes: Buffer, outputPath: string): Promise<WriteResult> {
  const resolvedPath = resolve(outputPath);
  await mkdir(dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, bytes);
  return {
    output: { kind: "file", path: resolvedPath },
    bytes: bytes.byteLength
  };
}
