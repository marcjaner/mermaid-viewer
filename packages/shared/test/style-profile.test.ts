import { describe, expect, it } from "vitest";
import {
  DEFAULT_STYLE_PROFILE,
  isDefaultStyleProfile,
  mergeStyleProfiles,
  parseThemeVariable
} from "../src/style-profile.js";

describe("style profile", () => {
  it("merges theme variables and overrides theme", () => {
    const profile = mergeStyleProfiles(
      DEFAULT_STYLE_PROFILE,
      {
        themeVariables: { primaryColor: "#00f", fontSize: 14 }
      },
      {
        theme: "dark",
        themeVariables: { primaryColor: "#f00" }
      }
    );

    expect(profile.theme).toBe("dark");
    expect(profile.themeVariables).toEqual({ primaryColor: "#f00", fontSize: 14 });
  });

  it("parses bool and number values from theme-variable flags", () => {
    expect(parseThemeVariable("true")).toBe(true);
    expect(parseThemeVariable("42")).toBe(42);
    expect(parseThemeVariable("#fff")).toBe("#fff");
  });

  it("detects default style profile", () => {
    expect(isDefaultStyleProfile(mergeStyleProfiles())).toBe(true);
    expect(isDefaultStyleProfile(mergeStyleProfiles({ theme: "dark" }))).toBe(false);
  });
});
