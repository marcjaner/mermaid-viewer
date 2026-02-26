import { createRequire } from "node:module";
import { chromium } from "playwright";
import type { StyleProfile } from "@mermaid-viewer/shared";

const require = createRequire(import.meta.url);
const mermaidBundlePath = require.resolve("mermaid/dist/mermaid.min.js");

export type RenderFormat = "svg" | "png";

export async function renderArtifact(options: {
  source: string;
  format: RenderFormat;
  styleProfile: StyleProfile;
}): Promise<string | Buffer> {
  const { source, format, styleProfile } = options;

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    const svg = await renderSvgInPage(page, source, styleProfile);
    if (format === "svg") {
      return svg;
    }
    return renderPngInPage(page, svg, styleProfile.css);
  } finally {
    await browser.close();
  }
}

async function renderSvgInPage(page: import("playwright").Page, source: string, styleProfile: StyleProfile): Promise<string> {
  await page.setContent('<div id="root"></div>');
  await page.addScriptTag({ path: mermaidBundlePath });

  const rendered = await page.evaluate(
    async ({ graphText, style }: { graphText: string; style: StyleProfile }) => {
      try {
        const config = {
          startOnLoad: false,
          securityLevel: "loose",
          theme: style.theme,
          themeVariables: style.themeVariables,
          ...style.mermaidConfig
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).mermaid.initialize(config);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (globalThis as any).mermaid.render(`mmdv-${Date.now()}`, graphText);
        return { svg: result.svg };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : String(error)
        };
      }
    },
    {
      graphText: source,
      style: styleProfile
    }
  );

  if ("error" in rendered) {
    throw new Error(`Mermaid rendering failed: ${rendered.error}`);
  }

  return injectCssIntoSvg(rendered.svg, styleProfile.css);
}

function injectCssIntoSvg(svg: string, css: string): string {
  if (!css.trim()) {
    return svg;
  }
  return svg.replace(/<svg[^>]*>/, (match) => `${match}<style>${css}</style>`);
}

async function renderPngInPage(page: import("playwright").Page, svg: string, css: string): Promise<Buffer> {
  const fullMarkup = `
    <style>
      html, body { margin: 0; padding: 0; background: white; }
      ${css}
    </style>
    <div id="container">${svg}</div>
  `;

  await page.setContent(fullMarkup);
  const svgLocator = page.locator("svg").first();
  const box = await svgLocator.boundingBox();
  if (!box) {
    throw new Error("Failed to measure rendered SVG for PNG export.");
  }

  const margin = 4;
  const clip = {
    x: Math.max(0, box.x - margin),
    y: Math.max(0, box.y - margin),
    width: box.width + margin * 2,
    height: box.height + margin * 2
  };

  await page.setViewportSize({
    width: Math.max(800, Math.ceil(clip.x + clip.width)),
    height: Math.max(600, Math.ceil(clip.y + clip.height))
  });

  return page.screenshot({
    type: "png",
    clip
  });
}
