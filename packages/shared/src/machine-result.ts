import { z } from "zod";

export const SCHEMA_VERSION = "1.0" as const;
export const SCHEMA_VERSION_V2 = "2.0" as const;

const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional()
});

const outputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("stdout")
  }),
  z.object({
    kind: z.literal("file"),
    path: z.string()
  })
]);

export const machineResultSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION_V2),
  ok: z.boolean(),
  command: z.enum(["render", "url.encode", "url.decode"]),
  format: z.enum(["svg", "png"]).optional(),
  output: outputSchema.optional(),
  bytes: z.number().int().nonnegative().optional(),
  sha256: z.string().optional(),
  shareUrl: z.string().optional(),
  diagramHash: z.string().optional(),
  diagramSourceBytes: z.number().int().nonnegative().optional(),
  warnings: z.array(z.string()).optional(),
  error: errorSchema.optional()
});

export type MachineResult = z.infer<typeof machineResultSchema>;

export function createOkResult(command: MachineResult["command"], fields: Omit<MachineResult, "schemaVersion" | "ok" | "command"> = {}): MachineResult {
  return {
    schemaVersion: SCHEMA_VERSION_V2,
    ok: true,
    command,
    ...fields
  };
}

export function createErrorResult(
  command: MachineResult["command"],
  code: string,
  message: string,
  details?: unknown
): MachineResult {
  return {
    schemaVersion: SCHEMA_VERSION_V2,
    ok: false,
    command,
    error: {
      code,
      message,
      details
    }
  };
}
