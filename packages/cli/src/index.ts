#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Command } from "commander";
import {
  createErrorResult,
  createOkResult,
  decodeHashPayloadOrUrlEncoded,
  decodeStyleProfileFromQuery,
  encodeHashPayload,
  encodeStyleProfileToQuery,
  extractPayloadFromUrl,
  isDefaultStyleProfile,
  machineResultSchema,
  mergeStyleProfiles,
  parseStyleProfile,
  type MermaidTheme,
  type StyleProfile,
  type MachineResult
} from "@mermaid-viewer/shared";
import { readTextInput, writeBinaryOutput, writeTextOutput } from "./io.js";
import { printResult } from "./output.js";
import { renderArtifact, type RenderFormat } from "./render.js";
import { loadStyleProfile, type StyleFlags } from "./style.js";

const VERSION = "0.2.0";
const EXIT_USAGE = 2;
const EXIT_INPUT = 3;
const EXIT_RENDER = 4;
const EXIT_OUTPUT = 5;
const EXIT_CODEC = 6;

class CliError extends Error {
  readonly code: string;
  readonly exitCode: number;
  readonly details?: unknown;

  constructor(code: string, message: string, exitCode: number, details?: unknown) {
    super(message);
    this.code = code;
    this.exitCode = exitCode;
    this.details = details;
  }
}

const program = new Command();
program.name("mmdv").description("Mermaid Viewer CLI").version(VERSION);
program.exitOverride((error) => {
  throw new CliError("E_USAGE", error.message, EXIT_USAGE);
});

function collectThemeVariable(value: string, previous: string[]): string[] {
  previous.push(value);
  return previous;
}

function buildStyleFlags(options: {
  theme?: MermaidTheme;
  css?: string;
  themeVar?: string[];
}): StyleFlags {
  return {
    theme: options.theme,
    cssPath: options.css,
    themeVariable: options.themeVar ?? []
  };
}

function validateAndPrint(result: MachineResult, asJson: boolean): void {
  const parsed = machineResultSchema.parse(result);
  printResult(parsed, asJson);
}

function parseRenderFormat(format: string): RenderFormat {
  if (format === "svg" || format === "png") {
    return format;
  }
  throw new CliError("E_USAGE", `Unsupported format: ${format}`, EXIT_USAGE);
}

function ensureInputNotEmpty(value: string): string {
  if (value.trim().length === 0) {
    throw new CliError("E_INPUT_EMPTY", "No Mermaid input found on stdin or --in.", EXIT_INPUT);
  }
  return value;
}

async function readMermaidInput(inputPath?: string): Promise<string> {
  try {
    return ensureInputNotEmpty(await readTextInput(inputPath));
  } catch (error) {
    if (error instanceof CliError) {
      throw error;
    }
    throw new CliError("E_INPUT_READ", error instanceof Error ? error.message : String(error), EXIT_INPUT);
  }
}

async function safeWriteText(value: string, outputPath?: string) {
  try {
    return await writeTextOutput(value, outputPath);
  } catch (error) {
    throw new CliError("E_OUTPUT_WRITE", error instanceof Error ? error.message : String(error), EXIT_OUTPUT);
  }
}

async function safeWriteBinary(value: Buffer, outputPath: string) {
  try {
    return await writeBinaryOutput(value, outputPath);
  } catch (error) {
    throw new CliError("E_OUTPUT_WRITE", error instanceof Error ? error.message : String(error), EXIT_OUTPUT);
  }
}

function handleCommandError(
  command: MachineResult["command"],
  asJson: boolean,
  fallbackCode: string,
  fallbackExitCode: number,
  error: unknown
): void {
  if (error instanceof CliError) {
    validateAndPrint(createErrorResult(command, error.code, error.message, error.details), asJson);
    process.exitCode = error.exitCode;
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  validateAndPrint(createErrorResult(command, fallbackCode, message), asJson);
  process.exitCode = fallbackExitCode;
}

program
  .command("render")
  .description("Render Mermaid to PNG or SVG")
  .requiredOption("-f, --format <format>", "svg or png")
  .option("--in <path>", "input Mermaid file path")
  .option("--out <path>", "output path (use '-' or omit for svg stdout)")
  .option("-c, --config <path>", "style profile JSON/YAML path")
  .option("--theme <theme>", "Mermaid theme override")
  .option("--css <path>", "custom CSS file path")
  .option("--theme-var <key=value>", "theme variable override", collectThemeVariable, [])
  .option("--json", "machine-readable JSON output")
  .action(async (options: {
    format: string;
    in?: string;
    out?: string;
    config?: string;
    theme?: MermaidTheme;
    css?: string;
    themeVar: string[];
    json?: boolean;
  }) => {
    const asJson = Boolean(options.json);
    try {
      const source = await readMermaidInput(options.in);
      const styleProfile = await loadStyleProfile(options.config, buildStyleFlags(options));
      const format = parseRenderFormat(options.format);

      if (format === "png" && (!options.out || options.out === "-")) {
        throw new CliError("E_OUTPUT_UNSUPPORTED", "PNG output requires --out <path> and does not support stdout.", EXIT_USAGE);
      }

      const artifact = await renderArtifact({
        source,
        format,
        styleProfile
      });

      let output: { kind: "stdout" } | { kind: "file"; path: string };
      let bytes: number;

      if (format === "svg") {
        const svg = typeof artifact === "string" ? artifact : artifact.toString("utf8");
        const write = await safeWriteText(svg, options.out);
        output = write.output;
        bytes = write.bytes;
      } else {
        if (typeof artifact === "string") {
          throw new CliError("E_RENDER_FAILED", "Renderer returned invalid PNG payload.", EXIT_RENDER);
        }
        const write = await safeWriteBinary(artifact, options.out!);
        output = write.output;
        bytes = write.bytes;
      }

      const hashSource = typeof artifact === "string" ? Buffer.from(artifact, "utf8") : artifact;
      const sha256 = createHash("sha256").update(hashSource).digest("hex");

      validateAndPrint(
        createOkResult("render", {
          format,
          output,
          bytes,
          sha256
        }),
        asJson
      );
    } catch (error) {
      handleCommandError("render", asJson, "E_RENDER_FAILED", EXIT_RENDER, error);
    }
  });

const urlCommand = program.command("url").description("Encode/decode Mermaid share URLs");

urlCommand
  .command("encode")
  .description("Encode Mermaid text into a share URL")
  .option("--in <path>", "input Mermaid file path")
  .option("--out <path>", "output path (omit for stdout)")
  .option("-c, --config <path>", "style profile JSON/YAML path")
  .option("--theme <theme>", "Mermaid theme override")
  .option("--css <path>", "custom CSS file path")
  .option("--theme-var <key=value>", "theme variable override", collectThemeVariable, [])
  .option("--base-url <url>", "viewer base URL")
  .option("--json", "machine-readable JSON output")
  .action(async (options: {
    in?: string;
    out?: string;
    config?: string;
    theme?: MermaidTheme;
    css?: string;
    themeVar: string[];
    baseUrl?: string;
    json?: boolean;
  }) => {
    const asJson = Boolean(options.json);
    try {
      const source = await readMermaidInput(options.in);
      const styleProfile = await loadStyleProfile(options.config, buildStyleFlags(options));
      const diagramHash = encodeHashPayload(source);
      const shareUrl = createShareUrl(options.baseUrl, diagramHash, styleProfile);
      const write = await safeWriteText(`${shareUrl}\n`, options.out);

      validateAndPrint(
        createOkResult("url.encode", {
          shareUrl,
          diagramHash,
          output: write.output
        }),
        asJson
      );
    } catch (error) {
      handleCommandError("url.encode", asJson, "E_ENCODE_FAILED", EXIT_CODEC, error);
    }
  });

urlCommand
  .command("decode")
  .description("Decode Mermaid text from hash URL")
  .option("--url <value>", "full URL or hash payload")
  .option("--out <path>", "output path (omit for stdout)")
  .option("--json", "machine-readable JSON output")
  .action(async (options: { url?: string; out?: string; json?: boolean }) => {
    const asJson = Boolean(options.json);
    try {
      const input = options.url ? options.url : await readMermaidInput();
      const payload = extractPayloadFromUrl(input.trim());
      const decoded = decodeHashPayloadOrUrlEncoded(payload);
      const write = await safeWriteText(decoded, options.out);

      validateAndPrint(
        createOkResult("url.decode", {
          diagramHash: payload,
          diagramSourceBytes: Buffer.byteLength(decoded, "utf8"),
          output: write.output
        }),
        asJson
      );
    } catch (error) {
      handleCommandError("url.decode", asJson, "E_DECODE_FAILED", EXIT_CODEC, error);
    }
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  if (error instanceof CliError) {
    process.stderr.write(`${error.message}\n`);
    process.exit(error.exitCode);
  }

  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});

function createShareUrl(baseUrl: string | undefined, hashPayload: string, styleProfile: StyleProfile): string {
  const styleParam = getStyleQueryParam(styleProfile);

  if (!baseUrl) {
    const prefix = styleParam ? `?style=${encodeURIComponent(styleParam)}` : "";
    return `${prefix}#${hashPayload}`;
  }

  const url = new URL(baseUrl);
  if (styleParam) {
    url.searchParams.set("style", styleParam);
  }
  url.hash = hashPayload;
  return url.toString();
}

function getStyleQueryParam(styleProfile: StyleProfile): string | undefined {
  const normalized = mergeStyleProfiles(styleProfile);
  if (isDefaultStyleProfile(normalized)) {
    return undefined;
  }
  return encodeStyleProfileToQuery(styleProfile);
}

export async function parseStyleFromUrl(urlInput: string): Promise<StyleProfile | undefined> {
  const parsed = new URL(urlInput);
  const style = parsed.searchParams.get("style");
  if (!style) {
    return undefined;
  }
  return parseStyleProfile(decodeStyleProfileFromQuery(style)) as StyleProfile;
}

export async function readMermaidFile(path: string): Promise<string> {
  return readFile(path, "utf8");
}
