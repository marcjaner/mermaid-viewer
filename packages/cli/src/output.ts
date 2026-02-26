import type { MachineResult } from "@mermaid-viewer/shared";

export function printResult(result: MachineResult, asJson: boolean): void {
  if (asJson) {
    process.stderr.write(`${JSON.stringify(result)}\n`);
    return;
  }

  if (!result.ok) {
    process.stderr.write(`${result.error?.message ?? "Unknown error"}\n`);
    return;
  }

  if (result.output?.kind === "file") {
    process.stdout.write(`${result.output.path}\n`);
  }
}
