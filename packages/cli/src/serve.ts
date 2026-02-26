import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MIME_BY_EXT: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

function streamWithHeaders(
  res: import("node:http").ServerResponse,
  filePath: string,
  contentType: string,
  onError: () => void
): void {
  const stream = createReadStream(filePath);
  stream.once("error", onError);
  stream.once("open", () => {
    res.writeHead(200, { "Content-Type": contentType });
    stream.pipe(res);
  });
}

function resolveViewerDistPath(): string {
  const currentFile = fileURLToPath(import.meta.url);
  const cliDist = dirname(currentFile);
  return resolve(cliDist, "../../viewer/dist");
}

function hasTraversal(pathname: string): boolean {
  const normalized = normalize(pathname);
  return normalized.startsWith("../") || normalized.includes("/../") || normalized === "..";
}

export async function startViewerServer(host: string, port: number): Promise<{ url: string }> {
  const root = resolveViewerDistPath();
  try {
    await access(join(root, "index.html"));
  } catch {
    throw new Error("Viewer assets not found. Run `npm run build --workspace @mermaid-viewer/viewer` first.");
  }

  const server = createServer((req, res) => {
    const reqUrl = new URL(req.url ?? "/", "http://localhost");
    const pathname = reqUrl.pathname === "/" ? "index.html" : reqUrl.pathname.replace(/^\/+/, "");

    if (hasTraversal(pathname)) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    const filePath = join(root, pathname);
    const extension = extname(filePath);

    streamWithHeaders(res, filePath, MIME_BY_EXT[extension] ?? "application/octet-stream", () => {
      streamWithHeaders(res, join(root, "index.html"), "text/html; charset=utf-8", () => {
        if (!res.headersSent) {
          res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        }
        res.end("Not Found");
      });
    });
  });

  await new Promise<void>((resolvePromise, rejectPromise) => {
    server.once("error", rejectPromise);
    server.listen(port, host, () => resolvePromise());
  });

  const url = `http://${host}:${port}/`;

  process.on("SIGINT", () => {
    server.close(() => process.exit(0));
  });
  process.on("SIGTERM", () => {
    server.close(() => process.exit(0));
  });

  return { url };
}
