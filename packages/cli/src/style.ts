import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { load as parseYaml } from "js-yaml";
import {
  DEFAULT_STYLE_PROFILE,
  type MermaidTheme,
  mergeStyleProfiles,
  parseStyleProfile,
  parseThemeVariable,
  type PartialStyleProfile,
  type StyleProfile
} from "@mermaid-viewer/shared";

export type StyleFlags = {
  theme?: MermaidTheme;
  cssPath?: string;
  themeVariable: string[];
};

export async function loadStyleProfile(configPath?: string, flags?: StyleFlags): Promise<StyleProfile> {
  const fileProfile = configPath ? await readProfileFile(configPath) : undefined;
  const flagProfile = flags ? await parseFlagProfile(flags) : undefined;
  return mergeStyleProfiles(DEFAULT_STYLE_PROFILE, fileProfile, flagProfile);
}

async function readProfileFile(configPath: string): Promise<PartialStyleProfile> {
  const raw = await readFile(configPath, "utf8");
  const extension = extname(configPath).toLowerCase();
  const parsed = extension === ".yaml" || extension === ".yml" ? parseYaml(raw) : JSON.parse(raw);
  return parseStyleProfile(parsed);
}

async function parseFlagProfile(flags: StyleFlags): Promise<PartialStyleProfile> {
  const themeVariables: Record<string, string | number | boolean> = {};
  for (const pair of flags.themeVariable) {
    const [key, ...valueParts] = pair.split("=");
    if (!key || valueParts.length === 0) {
      throw new Error(`Invalid --theme-var value: ${pair}`);
    }
    themeVariables[key] = parseThemeVariable(valueParts.join("="));
  }

  const css = flags.cssPath ? await readFile(flags.cssPath, "utf8") : undefined;

  return parseStyleProfile({
    theme: flags.theme,
    css,
    themeVariables: Object.keys(themeVariables).length > 0 ? themeVariables : undefined
  });
}
