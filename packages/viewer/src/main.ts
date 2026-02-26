import mermaid from "mermaid";
import svgPanZoom from "svg-pan-zoom";
import {
  DEFAULT_STYLE_PROFILE,
  decodeHashPayloadOrUrlEncoded,
  decodeStyleProfileFromQuery,
  encodeHashPayload,
  encodeStyleProfileToQuery,
  isDefaultStyleProfile,
  mergeStyleProfiles,
  parseStyleProfile,
  type StyleProfile
} from "@mermaid-viewer/shared";

type UiTheme = "light" | "dark";

type SvgPoint = { x: number; y: number };

type PanZoomInstance = {
  destroy: () => void;
  fit: () => void;
  center: () => void;
  resetZoom: () => void;
  resetPan: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoom: (scale: number) => void;
  getZoom: () => number;
  zoomAtPoint: (zoom: number, point: SvgPoint) => void;
  getPan: () => SvgPoint;
  pan: (point: SvgPoint) => void;
  resize: () => void;
};

const createPanZoom = svgPanZoom as unknown as (
  element: SVGElement,
  options: Record<string, unknown>
) => PanZoomInstance;

const UI_THEME_KEY = "mmdv.uiTheme";
const UI_THEME_QUERY = "ui-theme";
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 16;
const BUTTON_ZOOM_FACTOR = 1.35;
const WHEEL_ZOOM_SENSITIVITY = 0.008;
const INITIAL_RELATIVE_ZOOM = 0.9;

const DEFAULT_DIAGRAM = `flowchart TD
  Agent[AI Agent] --> CLI[mmdv CLI]
  CLI --> Viewer[Viewer URL]
  CLI --> Artifact[SVG/PNG Artifact]`;

const inputEl = getElement<HTMLTextAreaElement>("diagram-input");
const themeSelectEl = getElement<HTMLSelectElement>("theme-select");
const themeVariablesEl = getElement<HTMLTextAreaElement>("theme-variables-input");
const cssEl = getElement<HTMLTextAreaElement>("css-input");
const graphEl = getElement<HTMLDivElement>("graph");
const viewportEl = getElement<HTMLDivElement>("canvas-viewport");
const renderButtonEl = getElement<HTMLButtonElement>("render-button");
const copyUrlButtonEl = getElement<HTMLButtonElement>("copy-url-button");
const uiThemeToggleEl = getElement<HTMLButtonElement>("ui-theme-toggle");
const zoomInButtonEl = getElement<HTMLButtonElement>("zoom-in-button");
const zoomOutButtonEl = getElement<HTMLButtonElement>("zoom-out-button");
const fitButtonEl = getElement<HTMLButtonElement>("fit-button");
const resetButtonEl = getElement<HTMLButtonElement>("reset-button");
const statusEl = getElement<HTMLParagraphElement>("status");

let currentUiTheme: UiTheme = "light";
let hasManualMermaidTheme = false;
let activePanZoom: PanZoomInstance | null = null;
let activeSvgElement: SVGSVGElement | null = null;
let lastPointerClientPoint: SvgPoint | null = null;

void initialize();

async function initialize(): Promise<void> {
  const source = readDiagramFromLocation() ?? DEFAULT_DIAGRAM;
  const { profile, hasExplicitStyle } = readStyleProfileFromLocation();

  inputEl.value = source;
  applyStyleToForm(profile);
  hasManualMermaidTheme = hasExplicitStyle;

  currentUiTheme = resolveInitialUiTheme();
  applyUiTheme(currentUiTheme);
  syncMermaidThemeWithUi();

  await renderCurrentDiagram();

  renderButtonEl.addEventListener("click", async () => {
    await renderCurrentDiagram();
  });

  copyUrlButtonEl.addEventListener("click", async () => {
    await updateUrlState();
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus("Share URL copied.", false);
    } catch {
      setStatus("Failed to copy URL. Copy it from the address bar.", true);
    }
  });

  themeSelectEl.addEventListener("change", () => {
    hasManualMermaidTheme = true;
  });

  uiThemeToggleEl.addEventListener("click", async () => {
    currentUiTheme = currentUiTheme === "dark" ? "light" : "dark";
    persistUiTheme(currentUiTheme);
    applyUiTheme(currentUiTheme);
    syncMermaidThemeWithUi();
    await renderCurrentDiagram();
  });

  zoomInButtonEl.addEventListener("click", () => {
    zoomAroundCursor(BUTTON_ZOOM_FACTOR);
  });

  zoomOutButtonEl.addEventListener("click", () => {
    zoomAroundCursor(1 / BUTTON_ZOOM_FACTOR);
  });

  fitButtonEl.addEventListener("click", () => {
    fitAndCenterInitialView();
  });

  resetButtonEl.addEventListener("click", () => {
    fitAndCenterInitialView();
  });

  viewportEl.addEventListener(
    "wheel",
    (event) => {
      const panZoom = activePanZoom;
      if (!panZoom) {
        return;
      }

      event.preventDefault();
      lastPointerClientPoint = { x: event.clientX, y: event.clientY };

      if (event.ctrlKey || event.metaKey) {
        zoomAroundCursor(Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY), lastPointerClientPoint);
        return;
      }

      const pan = panZoom.getPan();
      panZoom.pan({ x: pan.x - event.deltaX, y: pan.y - event.deltaY });
    },
    { passive: false }
  );

  viewportEl.addEventListener("pointermove", (event) => {
    lastPointerClientPoint = { x: event.clientX, y: event.clientY };
  });

  viewportEl.addEventListener("pointerenter", (event) => {
    lastPointerClientPoint = { x: event.clientX, y: event.clientY };
  });

  window.addEventListener("beforeunload", () => {
    destroyPanZoom();
  });
}

function readDiagramFromLocation(): string | undefined {
  const hash = window.location.hash.replace(/^#/, "").trim();
  if (!hash) {
    return undefined;
  }
  return decodeHashPayloadOrUrlEncoded(hash);
}

function readStyleProfileFromLocation(): { profile: StyleProfile; hasExplicitStyle: boolean } {
  const url = new URL(window.location.href);
  const styleParam = url.searchParams.get("style");
  if (!styleParam) {
    return {
      profile: DEFAULT_STYLE_PROFILE,
      hasExplicitStyle: false
    };
  }

  try {
    const parsed = parseStyleProfile(decodeStyleProfileFromQuery(styleParam));
    return {
      profile: mergeStyleProfiles(DEFAULT_STYLE_PROFILE, parsed),
      hasExplicitStyle: true
    };
  } catch {
    setStatus("Ignoring invalid style query parameter.", true);
    return {
      profile: DEFAULT_STYLE_PROFILE,
      hasExplicitStyle: false
    };
  }
}

function resolveInitialUiTheme(): UiTheme {
  const url = new URL(window.location.href);
  const fromUrl = parseUiTheme(url.searchParams.get(UI_THEME_QUERY));
  if (fromUrl) {
    return fromUrl;
  }

  try {
    const storedTheme = parseUiTheme(localStorage.getItem(UI_THEME_KEY));
    if (storedTheme) {
      return storedTheme;
    }
  } catch {
    // Ignore localStorage access errors.
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function parseUiTheme(value: string | null): UiTheme | null {
  if (value === "light" || value === "dark") {
    return value;
  }
  return null;
}

function persistUiTheme(theme: UiTheme): void {
  try {
    localStorage.setItem(UI_THEME_KEY, theme);
  } catch {
    // Ignore localStorage write errors.
  }
}

function applyUiTheme(theme: UiTheme): void {
  document.documentElement.dataset.uiTheme = theme;
  uiThemeToggleEl.textContent = theme === "dark" ? "Switch to White" : "Switch to Dark";
  uiThemeToggleEl.setAttribute("aria-pressed", String(theme === "dark"));
}

function syncMermaidThemeWithUi(): void {
  if (hasManualMermaidTheme) {
    return;
  }
  themeSelectEl.value = currentUiTheme === "dark" ? "dark" : "default";
}

function applyStyleToForm(styleProfile: StyleProfile): void {
  themeSelectEl.value = styleProfile.theme;
  themeVariablesEl.value =
    Object.keys(styleProfile.themeVariables).length === 0 ? "" : JSON.stringify(styleProfile.themeVariables, null, 2);
  cssEl.value = styleProfile.css;
}

function collectStyleProfileFromForm(): StyleProfile {
  const themeVariablesRaw = themeVariablesEl.value.trim();
  let themeVariables: StyleProfile["themeVariables"] = {};
  if (themeVariablesRaw.length > 0) {
    const parsed = JSON.parse(themeVariablesRaw) as Record<string, string | number | boolean>;
    themeVariables = parsed;
  }

  return mergeStyleProfiles(DEFAULT_STYLE_PROFILE, {
    theme: themeSelectEl.value as StyleProfile["theme"],
    css: cssEl.value,
    themeVariables
  });
}

async function renderCurrentDiagram(): Promise<void> {
  const source = inputEl.value;

  let styleProfile: StyleProfile;
  try {
    styleProfile = collectStyleProfileFromForm();
  } catch {
    setStatus("Theme variables must be valid JSON.", true);
    return;
  }

  try {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: styleProfile.theme,
      themeVariables: styleProfile.themeVariables,
      ...styleProfile.mermaidConfig
    });

    const rendered = await mermaid.render(`graph-${Date.now()}`, source);
    const svg = injectCss(rendered.svg, styleProfile.css);
    graphEl.innerHTML = svg;
    initializePanZoom();
    await updateUrlState();
    setStatus("Rendered.", false);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus(`Render failed: ${message}`, true);
  }
}

function initializePanZoom(): void {
  destroyPanZoom();

  const svgElement = graphEl.querySelector("svg");
  if (!svgElement) {
    return;
  }
  normalizeSvgElement(svgElement, { ensureViewBox: true });
  activeSvgElement = svgElement;

  activePanZoom = createPanZoom(svgElement, {
    zoomEnabled: true,
    panEnabled: true,
    controlIconsEnabled: false,
    mouseWheelZoomEnabled: false,
    dblClickZoomEnabled: false,
    fit: false,
    center: false,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM
  });

  normalizeSvgElement(svgElement, { ensureViewBox: false });
  fitAndCenterInitialView();
}

function normalizeSvgElement(svgElement: SVGSVGElement, options: { ensureViewBox: boolean }): void {
  svgElement.removeAttribute("width");
  svgElement.removeAttribute("height");

  svgElement.style.maxWidth = "none";
  svgElement.style.width = "100%";
  svgElement.style.height = "100%";

  if (!options.ensureViewBox || svgElement.getAttribute("viewBox")) {
    return;
  }

  let x = 0;
  let y = 0;
  let width = 0;
  let height = 0;

  try {
    const contentElement =
      svgElement.querySelector<SVGGElement>("g.svg-pan-zoom_viewport") ??
      svgElement.querySelector<SVGGElement>("g") ??
      svgElement;
    const bounds = contentElement.getBBox();
    x = bounds.x;
    y = bounds.y;
    width = bounds.width;
    height = bounds.height;
  } catch {
    // Ignore SVG bbox errors and use viewport bounds fallback below.
  }

  if (width <= 0 || height <= 0) {
    const rect = svgElement.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    x = 0;
    y = 0;
  }

  if (width > 0 && height > 0) {
    svgElement.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
    svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet");
  }
}

function destroyPanZoom(): void {
  if (!activePanZoom) {
    return;
  }
  activePanZoom.destroy();
  activePanZoom = null;
  activeSvgElement = null;
}

function fitAndCenterInitialView(): void {
  const panZoom = activePanZoom;
  if (!panZoom) {
    return;
  }

  panZoom.resize();
  panZoom.fit();
  panZoom.center();
  const nextZoom = clamp(panZoom.getZoom() * INITIAL_RELATIVE_ZOOM, MIN_ZOOM, MAX_ZOOM);
  panZoom.zoom(nextZoom);
  panZoom.center();
}

function zoomAroundCursor(factor: number, explicitPoint?: SvgPoint): void {
  const panZoom = activePanZoom;
  if (!panZoom) {
    return;
  }

  const clientPoint = explicitPoint ?? lastPointerClientPoint ?? getViewportCenterClientPoint();
  const point = toSvgPoint(clientPoint);
  const nextZoom = clamp(panZoom.getZoom() * factor, MIN_ZOOM, MAX_ZOOM);
  panZoom.zoomAtPoint(nextZoom, point);
}

function getViewportCenterClientPoint(): SvgPoint {
  const rect = viewportEl.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function toSvgPoint(clientPoint: SvgPoint): SvgPoint {
  const svg = activeSvgElement;
  if (!svg) {
    return clientPoint;
  }

  const ctm = svg.getScreenCTM();
  if (!ctm) {
    return clientPoint;
  }

  const point = svg.createSVGPoint();
  point.x = clientPoint.x;
  point.y = clientPoint.y;
  const transformed = point.matrixTransform(ctm.inverse());
  return { x: transformed.x, y: transformed.y };
}

async function updateUrlState(): Promise<void> {
  const source = inputEl.value;
  const styleProfile = collectStyleProfileFromForm();
  const url = new URL(window.location.href);

  url.hash = encodeHashPayload(source);

  if (isDefaultStyleProfile(styleProfile)) {
    url.searchParams.delete("style");
  } else {
    url.searchParams.set("style", encodeStyleProfileToQuery(styleProfile));
  }

  url.searchParams.set(UI_THEME_QUERY, currentUiTheme);
  window.history.replaceState({}, "", url);
}

function injectCss(svg: string, css: string): string {
  if (!css.trim()) {
    return svg;
  }
  return svg.replace(/<svg[^>]*>/, (match) => `${match}<style>${css}</style>`);
}

function setStatus(message: string, failed: boolean): void {
  statusEl.textContent = message;
  statusEl.dataset.failed = String(failed);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element: ${id}`);
  }
  return element as T;
}
