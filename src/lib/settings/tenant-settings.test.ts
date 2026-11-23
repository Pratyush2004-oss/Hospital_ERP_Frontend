import { describe, expect, it } from "vitest";
import {
  buildPatientCodeFormat,
  previewPatientCode,
  readBrandingSettings,
  readLocaleSettings,
  readPatientCodeSettings,
} from "./tenant-settings";

describe("typed tenant settings", () => {
  it("reads branding and falls back to the tenant logo", () => {
    expect(
      readBrandingSettings(
        { branding: { primaryColor: "#00aa77", portalName: "Riverside" } },
        "https://cdn.test/logo.png",
      ),
    ).toEqual({
      logoUrl: "https://cdn.test/logo.png",
      primaryColor: "#00aa77",
      portalName: "Riverside",
    });
  });

  it("reads locale settings and defaults unsupported values", () => {
    expect(readLocaleSettings({}, "Asia/Kolkata")).toEqual({
      timezone: "Asia/Kolkata",
      language: "en",
      dateFormat: "D MMM YYYY",
    });

    expect(
      readLocaleSettings(
        {
          locale: {
            timezone: "Europe/London",
            language: "en-GB",
            dateFormat: "DD/MM/YYYY",
          },
        },
        "UTC",
      ),
    ).toEqual({
      timezone: "Europe/London",
      language: "en-GB",
      dateFormat: "DD/MM/YYYY",
    });
  });

  it("parses and rebuilds the existing patient code template", () => {
    expect(readPatientCodeSettings({ "patient.code_format": "MRN/{year}/{seq:4}" })).toEqual({
      prefix: "MRN",
      separator: "/",
      padding: 4,
      includeYear: true,
    });

    expect(
      buildPatientCodeFormat({
        prefix: "mrn",
        separator: "/",
        padding: 4,
        includeYear: true,
      }),
    ).toBe("MRN/{year}/{seq:4}");

    expect(
      previewPatientCode(
        { prefix: "P", separator: "-", padding: 6, includeYear: false },
        new Date("2026-01-01T00:00:00.000Z"),
      ),
    ).toBe("P-000001");
  });

  it("falls back safely when the saved template is malformed", () => {
    expect(readPatientCodeSettings({ "patient.code_format": "not valid" })).toEqual({
      prefix: "P",
      separator: "-",
      padding: 6,
      includeYear: false,
    });
  });
});
