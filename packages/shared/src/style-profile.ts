import { z } from "zod";

export const MERMAID_THEMES = ["default", "neutral", "dark", "forest", "base"] as const;

export type MermaidTheme = (typeof MERMAID_THEMES)[number];

export type ThemeVariableValue = string | number | boolean;

export type StyleProfile = {
  theme: MermaidTheme;
  themeVariables: Record<string, ThemeVariableValue>;
  css: string;
  mermaidConfig: Record<string, unknown>;
};

const themeSchema = z.enum(MERMAID_THEMES);

const profileSchema = z
  .object({
    theme: themeSchema.optional(),
    themeVariables: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
    css: z.string().optional(),
    mermaidConfig: z.record(z.unknown()).optional()
  })
  .strict();

export const DEFAULT_STYLE_PROFILE: StyleProfile = {
  theme: "default",
  themeVariables: {},
  css: "",
  mermaidConfig: {}
};

export type PartialStyleProfile = Partial<StyleProfile>;

export function parseStyleProfile(input: unknown): PartialStyleProfile {
  return profileSchema.parse(input);
}

export function mergeStyleProfiles(...profiles: Array<PartialStyleProfile | undefined>): StyleProfile {
  const merged = profiles.reduce<StyleProfile>(
    (acc, current) => {
      if (!current) {
        return acc;
      }
      return {
        theme: current.theme ?? acc.theme,
        css: current.css ?? acc.css,
        themeVariables: {
          ...acc.themeVariables,
          ...current.themeVariables
        },
        mermaidConfig: {
          ...acc.mermaidConfig,
          ...current.mermaidConfig
        }
      };
    },
    {
      ...DEFAULT_STYLE_PROFILE,
      themeVariables: { ...DEFAULT_STYLE_PROFILE.themeVariables },
      mermaidConfig: { ...DEFAULT_STYLE_PROFILE.mermaidConfig }
    }
  );

  return merged;
}

export function parseThemeVariable(value: string): ThemeVariableValue {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  const numberValue = Number(value);
  if (!Number.isNaN(numberValue) && value.trim() !== "") {
    return numberValue;
  }
  return value;
}

export function isDefaultStyleProfile(profile: StyleProfile): boolean {
  return (
    profile.theme === DEFAULT_STYLE_PROFILE.theme &&
    profile.css === DEFAULT_STYLE_PROFILE.css &&
    Object.keys(profile.themeVariables).length === 0 &&
    Object.keys(profile.mermaidConfig).length === 0
  );
}
